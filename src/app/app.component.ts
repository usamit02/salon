import { Component } from '@angular/core';
import { Platform, PopoverController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { PhpService } from './provider/php.service';
import { Room, DataService } from './provider/data.service';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { MemberComponent } from './member/member.component';
const FOLDER = { id: 1, na: "ブロガーズギルド", discription: "", lock: 0, idx: 0, chat: false, story: false, plan: 0, parent: 1, folder: true, bookmark: false, csd: null, auth: null };
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  room: Room;
  rooms: Array<Room> = [];
  allRooms: Array<Room> = [];
  folder: Room = FOLDER;
  bookmk: boolean = false;
  onMembers = [];
  offMembers = [];
  bufMember: string;
  member: string;
  constructor(
    private platform: Platform, private splashScreen: SplashScreen, private statusBar: StatusBar,
    private data: DataService, private php: PhpService, private router: Router, private socket: Socket,
    public pop: PopoverController
  ) {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
  ngOnInit() {
    this.data.roomsState.subscribe((rooms: any) => {
      this.allRooms = rooms;
      this.rooms = this.allRooms.filter(room => room.parent === this.folder.id);
    });
    this.data.roomState.subscribe((room: Room) => {
      this.room = room;
      this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.room.id, user: this.data.user, rtc: "" });
      this.php.get('member', { rid: room.id }).subscribe((members: any) => {
        this.offMembers = [];
        for (let i = 0; i < members.length; i++) {
          var f = true;
          for (let j = 0; j < this.onMembers.length; j++) {
            if (members[i].id === this.onMembers[j].id) f = true;//false;
          }
          if (f) this.offMembers.push(members[i]);
        }
      });
    });
    this.data.popMemberSubject.asObservable().subscribe((e: any) => {
      this.popMember(e.member, e.event);
    });
    this.socket.connect();
    this.socket.on("join", users => {
      console.log(users[0].na + "_" + users[0].rtc);
      this.onMembers = users;
    });
  }
  joinRoom(room) {
    if (room.folder) {
      this.rooms = this.allRooms.filter(r => r.parent === room.id);
      this.folder = room;
    }
    this.router.navigate(['/home/room', room.id]);
  }
  retRoom() {
    if (this.folder.id === 1 && this.data.user.id) {
      this.bookmk = !this.bookmk;
    }
    if (this.bookmk) {
      this.rooms = this.allRooms.filter(room => room.bookmark);
    } else {
      let folder = this.allRooms.filter(room => room.id === this.folder.parent);
      this.folder = folder.length ? folder[0] : FOLDER;
      this.rooms = this.allRooms.filter(room => room.parent === this.folder.id);
    }
  }
  searchMember() {
    if (!this.member.trim()) return;
    this.bufMember = JSON.stringify({ on: this.onMembers, off: this.offMembers });
    this.onMembers = this.onMembers.filter(member => member.na.indexOf(this.member) !== -1);
    this.offMembers = this.offMembers.filter(member => member.na.indexOf(this.member) !== -1);
    if (!this.onMembers.length && !this.offMembers.length) {
      this.php.get('member', { search: this.member }).subscribe((members: any) => {
        this.offMembers = members;
      });
    }
  }
  searchMemberClear() {
    if (this.bufMember) {
      let members = JSON.parse(this.bufMember);
      this.onMembers = members.on;
      this.offMembers = members.off;
    }
  }
  async popMember(member, event: any) {
    const popover = await this.pop.create({
      component: MemberComponent,
      componentProps: { member: member },
      event: event,
      translucent: true
    });
    return await popover.present();
  }
}
