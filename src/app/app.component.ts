import { Component } from '@angular/core';
import { Platform, PopoverController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { PhpService } from './provider/php.service';
import { User, Room, DataService } from './provider/data.service';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { MemberComponent } from './member/member.component';
import { AngularFirestore } from '@angular/fire/firestore';
import { UiService } from './provider/ui.service';
import { FOLDER } from '../environments/environment';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  folder: Room = FOLDER;
  rooms: Array<Room> = [];
  bookmk: boolean = false;
  onMembers: Array<User> = [];
  offMembers: Array<User> = [];
  bufMember: string;
  member: string;
  constructor(
    private platform: Platform, private splashScreen: SplashScreen, private statusBar: StatusBar,
    private data: DataService, private php: PhpService, private router: Router,
    public pop: PopoverController, private db: AngularFirestore, private ui: UiService, private socket: Socket,
  ) {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
  ngOnInit() {
    this.data.allRoomsState.subscribe((rooms: Array<Room>) => {
      this.data.rooms = rooms.filter(room => room.parent === this.folder.id);
    });
    this.data.roomState.subscribe((room: Room) => {
      this.newChat();
      this.php.get('member', { rid: room.id }).subscribe((members: any) => {
        this.offMembers = [];
        for (let i = 0; i < members.length; i++) {
          var f = true;
          for (let j = 0; j < this.onMembers.length; j++) {
            if (members[i].id === this.onMembers[j].id) f = false;
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
      if (users.length) {
        users.sort((a, b) => {
          if (a.auth < b.auth) return 1;
          if (a.auth > b.auth) return -1;
          return 0;
        })
        this.onMembers = users;
      } else {
        this.onMembers = [];
      }
    });
  }
  joinRoom(room: Room) {
    if (room.folder) {
      this.data.rooms = this.data.allRooms.filter(r => r.parent === room.id);
      this.folder = room;
    }
    this.data.directUser = room.id > 1000000000 ? { id: room.uid, na: room.na, avatar: "" } : { id: "", na: "", avatar: "" };
    if (room.id > 0) {
      this.router.navigate(['/home/room', room.id]);
    } else if (room.id === -101) {
      this.router.navigate(['/notify']);
    }
  }
  retRoom(home?: boolean) {
    if (this.folder.id === 1 && this.data.user.id) {
      this.bookmk = !this.bookmk;
    } else {
      if (this.bookmk) {
        this.data.rooms = this.data.allRooms.filter(room => room.bookmark);
      } else {
        if (home) {//長押し
          this.folder = FOLDER;
        } else {
          let folder = this.data.allRooms.filter(room => room.id === this.folder.parent);
          this.folder = folder.length ? folder[0] : FOLDER;
        }
        this.data.rooms = this.data.allRooms.filter(room => room.parent === this.folder.id);
      }
      this.newChat();
    }
  }
  newChat() {
    let rids = [];
    for (let i = 0; i < this.data.rooms.length; i++) {
      rids.push(this.data.rooms[i].id);
    }
    if (rids.length) {
      this.php.get('room', { uid: this.data.user.id, rids: JSON.stringify(rids) }).subscribe((res: any) => {
        for (let i = 0; i < this.data.rooms.length; i++) {
          if (this.data.rooms[i].id in res) {
            let r = res[this.data.rooms[i].id];
            let upd = 'upd' in r ? new Date(r.upd).getTime() / 1000 : Math.floor(this.data.rooms[i].upd.getTime() / 1000);
            this.data.rooms[i].new = upd > new Date(r.csd).getTime() / 1000;
          }
        }
      });
    }
  }
  mention() {
    this.folder = { id: -2, na: "メンション", parent: 1 };
    this.data.rooms = this.data.mentionRooms;
  }
  direct() {
    this.ui.loading();
    this.folder = { id: -1, na: "ダイレクトメール", parent: 1 };
    this.db.collection("direct", ref => ref.where('uid_old', '==', this.data.user.id)).get().subscribe(query => {
      let rooms = [];
      query.forEach(doc => {
        let d = doc.data();
        rooms.push({ id: Number(doc.id), na: d.na_new, parent: -1, upd: d.upd.toDate(), uid: d.uid_new });
      });
      this.db.collection("direct", ref => ref.where('uid_new', '==', this.data.user.id)).get().subscribe(query => {
        query.forEach(doc => {
          let d = doc.data();
          rooms.push({ id: Number(doc.id), na: d.na_old, parent: -1, upd: d.upd.toDate(), uid: d.uid_old });
        });
        rooms.sort((a, b) => {
          if (a.upd.getTime() > b.upd.getTime()) return -1;
          if (a.upd.getTime() < b.upd.getTime()) return 1;
          return 0;
        });
        this.data.rooms = rooms;
        this.ui.loadend();
        this.newChat();
      });
    });
  }
  config() {
    this.folder = { id: -3, na: "設定", parent: 1 };
    this.data.rooms = [
      { id: -101, na: "通知", parent: -3 }, { id: -102, na: "自己紹介", parent: -3 }
    ]
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
  bookmark(room: Room) {

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
