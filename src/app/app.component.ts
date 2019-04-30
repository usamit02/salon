import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { PhpService } from './provider/php.service';
import { User, Room, Mention, DataService } from './provider/data.service';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { MemberComponent } from './member/member.component';
import { AngularFirestore } from '@angular/fire/firestore';
import { UiService } from './provider/ui.service';
import { FOLDER, AUTH } from '../environments/environment';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  bookmk: boolean = false;
  onMembers: Array<User> = [];
  offMembers: Array<User> = [];
  searchMembers: Array<User> = [];
  member: string;
  auth = AUTH;
  mentionDbSb: Subscription;
  constructor(
    public data: DataService, private php: PhpService, private router: Router,
    private pop: PopoverController, private db: AngularFirestore, private ui: UiService, private socket: Socket,
  ) {
  }
  ngOnInit() {
    this.data.readRooms();//部屋一覧読込
    this.data.roomState.subscribe((room: Room) => {//部屋移動時
      this.newChat();//未読表示
      this.php.get('member', { rid: room.id }).then(res => {//ユーザー一覧読込
        this.offMembers = [];
        for (let i = 0; i < res.members.length; i++) {
          var f = true;
          for (let j = 0; j < this.onMembers.length; j++) {
            if (res.members[i].id === this.onMembers[j].id) f = false;
          }
          if (f) this.offMembers.push(res.members[i]);
        }
      });
    });
    this.data.userState.subscribe(user => {//ログイン、ログアウト時
      if (this.mentionDbSb) this.mentionDbSb.unsubscribe();
      this.data.mentions = {}; this.data.mentionRooms = [];
      if (user.id) {//ログイン        
        let mentions: Array<Mention> = [];
        let db = this.db.collection('user').doc(user.id.toString());
        db.collection('mention').get().subscribe(query => {
          let mention;
          query.forEach(doc => {
            mention = doc.data();
            mention.id = doc.id;
            mention.rid = Number(mention.rid);
            mentions.push(mention);
          });
          this.data.mentionRoom(mentions);
        });
        this.mentionDbSb = db.collection('mention', ref => ref.orderBy('upd', 'desc')).
          snapshotChanges().subscribe((res: Array<any>) => {//メンション受領、既読削除、投稿削除で発火
            mentions = []; let mention: Mention = new Mention;
            for (let i = 0; i < res.length; i++) {
              mention = res[i].payload.doc.data();
              mention.id = res[i].payload.doc.id;
              mention.rid = Number(mention.rid);
              mentions.push(mention);
            }
            this.data.mentionRoom(mentions);
          });
      }
    });
    this.data.popMemberSubject.asObservable().subscribe((e: any) => {//アバタークリックで発火
      this.popMember(e.member, e.event);
    });
    this.socket.connect();
    this.socket.on("join", users => {//誰かが部屋移動時
      if (users.length) {
        users.sort((a, b) => {
          if (a.rtcid < b.rtcid) return 1;
          if (a.rtcid > b.rtcid) return -1;
          if (a.auth < b.auth) return 1;
          if (a.auth > b.auth) return -1;
          return 0;
        })
        this.onMembers = users;
      } else {
        this.onMembers = [];
      }
    });
    this.socket.on("give", data => {//投げ銭受領
      if (data.mid === this.data.user.id) {
        let msg = data.txt ? "\r\n「" + data.txt + "」" : "";
        this.ui.popm(data.na + "さんから" + data.p + "ポイント贈られました。" + msg);
      }
    });
    this.socket.on("ban", id => {//誰かにKick,Banされた
      if (id === this.data.user.id) {
        this.ui.popm("kickまたはBANされたため強制ログアウトします。");
        this.data.logout();
      }
    });
  }
  joinRoom(room: Room) {//部屋移動時
    this.data.directUser = room.id > 1000000000 ? { id: room.uid, na: room.na, avatar: "" } : { id: "", na: "", avatar: "" };
    if (room.id > 0) {
      this.router.navigate(['/home/room', room.id]);
    } else if (room.id === -101) {
      this.router.navigate(['/notify']);
    }
  }
  retRoom(home?: boolean) {//部屋一覧の親ボタン押したとき
    if (this.data.folder.id === 1 && this.data.user.id) {
      this.bookmk = !this.bookmk;
    }
    if (this.bookmk) {
      this.data.rooms = this.data.allRooms.filter(room => { return room.bookmark; });
    } else {
      if (home) {//長押しでルートに戻る
        this.data.folder = FOLDER;
      } else {
        let folder = this.data.allRooms.filter(room => { return room.id === this.data.folder.parent; });
        this.data.folder = folder.length ? folder[0] : FOLDER;
      }
      this.data.rooms = this.data.allRooms.filter(room => { return room.parent === this.data.folder.id; });
      this.router.navigate(['/home/room', this.data.folder.id]);
      this.newChat();
    }
  }
  newChat() {//未読表示
    let rids = [];
    for (let i = 0; i < this.data.rooms.length; i++) {
      rids.push(this.data.rooms[i].id);
    }
    if (rids.length) {
      this.php.get('room', { uid: this.data.user.id, rids: JSON.stringify(rids) }).then(res => {
        for (let i = 0; i < this.data.rooms.length; i++) {
          if (this.data.rooms[i].id in res.cursors) {
            let cursor = res.cursors[this.data.rooms[i].id];
            let upd = 'upd' in cursor ? new Date(cursor.upd).getTime() / 1000 : Math.floor(this.data.rooms[i].upd.getTime() / 1000);
            this.data.rooms[i].new = upd > new Date(cursor.csd).getTime() / 1000;
          }
        }
      });
    }
  }
  mention() {
    this.data.folder = { id: -2, na: "メンション", parent: 1 };
    this.data.rooms = this.data.mentionRooms;
  }
  mentionClear() {
    this.data.rooms = [];
    let db = this.db.collection('user').doc(this.data.user.id.toString()).collection('mention');
    db.get().subscribe(query => {
      query.forEach(doc => {
        db.doc(doc.id).delete();
      });
      this.data.mentionRooms = [];
    });
  }
  direct() {
    this.ui.loading("メッセージ確認中...");
    this.data.folder = { id: -1, na: "ダイレクトメッセージ", parent: 1 };
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
    this.data.folder = { id: -3, na: "設定", parent: 1 };
    this.data.rooms = [
      { id: -101, na: "通知", parent: -3 }
    ]
  }
  searchMember() {
    if (!this.member.trim()) return;
    this.onMembers = this.onMembers.filter(member => member.na.indexOf(this.member) !== -1);
    this.offMembers = this.offMembers.filter(member => member.na.indexOf(this.member) !== -1);
    if (!this.onMembers.length && !this.offMembers.length) {
      this.php.get('member', { search: this.member }, "検索中").then(res => {
        this.searchMembers = res.members;
      });
    }
  }
  searchMemberClear() {
    this.socket.emit("get", this.data.room.id);
    this.searchMembers = [];
  }
  async popMember(member, event: any) {
    let search = false;
    if (this.searchMembers.length) search = true;
    const popover = await this.pop.create({
      component: MemberComponent,
      componentProps: { member: member, search: search },
      event: event,
      translucent: true
    });
    return await popover.present();
  }
  bookmark(room: Room) {
    if (this.data.user.id) {
      this.php.get("bookmark", { uid: this.data.user.id, rid: room.id, bookmark: room.bookmark }).then(() => {
        let msg = room.bookmark ? "のブックマークを外しました。" : "をブックマークしました。";
        this.ui.pop("「" + room.na + "」" + msg);
        room.bookmark = !room.bookmark;
        let rooms = this.data.rooms.filter(r => { return r.id === room.id; });
        rooms[0].bookmark = !rooms[0].bookmark;
        rooms = this.data.allRooms.filter(r => { return r.id === room.id; });
        rooms[0].bookmark = !rooms[0].bookmark;
      });
    } else {
      this.ui.pop("ログインすると長押しでお気に入りの部屋をブックマークに追加できます。");
    }
  }
}
