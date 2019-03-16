import { Component } from '@angular/core';
import { Platform, PopoverController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { PhpService } from './provider/php.service';
import { User, Room, DataService } from './provider/data.service';
import { Router } from '@angular/router';
//import { Socket } from 'ngx-socket-io';
import { MemberComponent } from './member/member.component';
import { AngularFirestore } from '@angular/fire/firestore';
const FOLDER = { id: 1, na: "ブロガーズギルド", parent: 1, folder: true };
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
  onMembers: Array<User> = [];
  offMembers: Array<User> = [];
  bufMember: string;
  member: string;
  constructor(
    private platform: Platform, private splashScreen: SplashScreen, private statusBar: StatusBar,
    private data: DataService, private php: PhpService, private router: Router,
    public pop: PopoverController, private db: AngularFirestore,
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
      //this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.room.id, user: this.data.user, rtc: "" });
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
    /*this.socket.connect();
    this.socket.on("join", users => {
      console.log(users[0].na + "_" + users[0].rtc);
      this.onMembers = users;
    });*/
  }
  joinRoom(room: Room) {
    if (room.folder) {
      this.rooms = this.allRooms.filter(r => r.parent === room.id);
      this.folder = room;
    }
    if (room.id > 1000000000) {
      this.data.mailUser = { id: room.uid, na: room.na, avatar: "" }
    }
    this.router.navigate(['/home/room', room.id]);
  }
  retRoom(home?: boolean) {
    if (this.folder.id === 1 && this.data.user.id) {
      this.bookmk = !this.bookmk;
    }
    if (this.bookmk) {
      this.rooms = this.allRooms.filter(room => room.bookmark);
    } else {
      if (home) {
        this.folder = FOLDER;
      } else {
        let folder = this.allRooms.filter(room => room.id === this.folder.parent);
        this.folder = folder.length ? folder[0] : FOLDER;
      }
      this.rooms = this.allRooms.filter(room => room.parent === this.folder.id);
    }
  }
  newChat() {
    let rids = [];
    for (let i = 0; i < this.rooms.length; i++) {
      rids.push(this.rooms[i].id);
    }
    this.php.get('room', { uid: this.data.user.id, rids: JSON.stringify(rids) }).subscribe((res: any) => {
      for (let i = 0; i < this.rooms.length; i++) {
        if (this.rooms[i].id in res) {
          let rooms = this.rooms;
          let ddd = this.rooms[i].upd;
          let d = this.rooms[i].upd.getTime();
          let dddd = Math.floor(this.rooms[i].upd.getTime() / 1000);
          let dd = new Date(this.rooms[i].upd);
          let e = new Date(res[this.rooms[i].id].csd);

          let room = new Date(this.rooms[i].upd).getTime();
          let cursor = new Date(res[this.rooms[i].id].csd).getTime() / 1000;
          let n = dddd > cursor;
          this.rooms[i].new = Math.floor(this.rooms[i].upd.getTime() / 1000) > new Date(res[this.rooms[i].id].csd).getTime() / 1000;
        }
      }
    });
  }
  mention() {
    this.folder = { id: -2, na: "メンション", parent: 1 };
    this.rooms = this.data.mentionRooms;
  }
  mail() {
    this.folder = { id: -1, na: "ダイレクトメール", parent: 1 };
    this.db.collection("mail", ref => ref.where('uid_old', '==', this.data.user.id)).get().subscribe(query => {
      let rooms = [];
      query.forEach(doc => {
        let d = doc.data();
        rooms.push({ id: Number(doc.id), na: d.na_new, parent: -1, upd: d.upd.toDate(), uid: d.uid_new });
      });
      this.db.collection("mail", ref => ref.where('uid_new', '==', this.data.user.id)).get().subscribe(query => {
        query.forEach(doc => {
          let d = doc.data();
          rooms.push({ id: Number(doc.id), na: d.na_old, parent: -1, upd: d.upd.toDate(), uid: d.uid_old });
        });
        this.rooms = rooms;
        this.newChat();
      });
    });
  }
  config() {
    this.folder = { id: -3, na: "設定", parent: 1 };
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
