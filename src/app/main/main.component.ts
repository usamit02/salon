import { Component, ViewChild } from '@angular/core';
import { ActionSheetController, ToastController, IonContent } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { User, Room, DataService } from '../provider/data.service';
import { Socket } from 'ngx-socket-io';
import { PhpService } from '../provider/php.service';
declare var tinymce;
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  @ViewChild(IonContent) content: IonContent;
  room: Room;
  user: User;
  userX: string;
  bookmk: boolean = false;
  writer: string;
  message: string;
  readedFlag: boolean;
  mentionRoomSb;
  mentions;
  mentionTop: number;
  mentionButtom: number;
  tinyinit = {
    selector: "#tiny",
    menubar: false,
    inline: true,
    //theme: 'inlite',
    mobile: {
      theme: 'mobile',
      plugins: ['autosave', 'lists', 'autolink'],
      toolbar: ['undo', 'bold', 'italic', 'styleselect']
    },
    language_url: 'https://bloggersguild.cf/js/ja.js',
    plugins: [
      'autolink autosave codesample contextmenu link lists advlist table textcolor paste'
    ],
    toolbar: 'undo redo | forecolor backcolor | fontselect fontsizeselect styleselect | bullist numlist | blockquote link copy paste',
    contextmenu: 'up down restoredraft del | inserttable cell row column deletetable | paystart payend',
    forced_root_block: false, allow_conditional_comments: true, allow_html_in_named_anchor: true, allow_unsafe_link_target: true,
    setup: editor => {
      editor.on('Change', e => {
        console.log('editer change' + e);
      });
    }
  }
  constructor(
    private data: DataService, private afAuth: AngularFireAuth, private socket: Socket, private db: AngularFirestore,
    private toastCtrl: ToastController, private actionSheetCtrl: ActionSheetController, private php: PhpService
  ) {
  }
  ngOnInit() {
    this.user = new User;
    this.room = new Room;
    this.data.userState.subscribe(user => {
      this.user = user;
      if (user.id) {
        /*
         this.db.collection('user').doc(this.user.id.toString()).collection('mention', ref => ref.orderBy('upd', 'desc')).get().subscribe(query => {
           let mentions = [];
           query.forEach(mention => {
             let data: any = {};
             data = mention.data();
             data.id = mention.id;
             mentions.push(data);
           });
           this.loadMentionRooms(mentions);
         });*/
        if (this.mentionRoomSb) this.mentionRoomSb.unsubscribe();
        this.mentionRoomSb = this.db.collection('user').doc(this.user.id.toString()).collection('mention', ref => ref.orderBy('upd', 'desc')).
          snapshotChanges().subscribe((res: Array<any>) => {
            let data: any = {};
            let mentions = [];
            for (let i = 0; i < res.length; i++) {
              data = res[i].payload.doc.data();
              data.id = res[i].payload.doc.id;
              mentions.push(data);
            }
            this.loadMentionRooms(mentions);
          });
      }
    });
    this.data.roomState.subscribe(room => {
      this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.room.id, user: this.user, rtc: "" })
      this.room = room;
      this.readedFlag = this.data.readedFlag;
      if (this.user.id) {
        setTimeout(() => {
          var chats = <any>document.getElementsByClassName('chat');
          var footer = <any>document.getElementById('footer');
          if (chats.length) {
            if (chats[chats.length - 1].offsetTop + chats[chats.length - 1].offsetHeight > footer.offsetTop) {
              this.content.scrollByPoint(0, 1, 0);
              this.content.scrollByPoint(0, 0, 0);
            } else {
              var upd = [];
              for (let i = 0; i < chats.length; i++) {
                upd.push(new Date(chats[i].children[0].innerHTML))
              }
              this.deleteMention(upd);
            }
          }
        }, 3000);
      }
    });
    this.data.mentionState.subscribe((member: any) => {
      var ed = tinymce.activeEditor;
      var endId = tinymce.DOM.uniqueId();
      ed.dom.add(ed.getBody(), 'span', { style: 'color:blue;', class: 'mention', id: member.id }, '@' + member.na);
      ed.dom.add(ed.getBody(), 'span', { id: endId }, '&nbsp;');
      ed.focus();
      var newNode = ed.dom.select('#' + endId);
      ed.selection.select(newNode[0]);
    });
    this.data.readedFlagState.subscribe(readedFlag => { this.readedFlag = readedFlag; });
    tinymce.init(this.tinyinit);
  }
  ngAfterViewInit() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        this.data.login(user);
        let dummy = <HTMLButtonElement>document.getElementById("dummy");
        dummy.click();
      } else {
        this.data.logout();
      }
    });
  }
  async login() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'ログイン',
      buttons: [
        {
          text: 'twitter',
          icon: "logo-twitter",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new firebase.auth.TwitterAuthProvider());
          }
        }, {
          text: 'facebook',
          icon: "logo-facebook",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new firebase.auth.FacebookAuthProvider());
          }
        }, {
          text: 'google',
          icon: "logo-google",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
          }
        },
        {
          icon: "close",
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }
  logout() {
    this.afAuth.auth.signOut();
  }
  sendMsg() {
    var ed = tinymce.activeEditor;
    let txt = ed.getContent({ format: 'html' });
    if (!txt) return;
    var upd = new Date();
    var mentions = ed.dom.select('.mention');
    for (let i = 0; i < mentions.length; i++) {
      this.db.collection('user').doc(mentions[i].id).collection('mention').add({
        uid: this.user.id, rid: this.room.id, upd: upd
      });
    }
    this.db.collection('room').doc(this.room.id.toString()).collection('chat').add({
      uid: this.user.id, na: this.user.na, avatar: this.user.avatar, txt: txt, upd: upd
    });
    setTimeout(() => {
      ed.setContent('');
    });
  }
  sendMsg2() {
    var upd = new Date();
    for (let i = 0; i < 100; i++) {
      upd.setDate(upd.getDate() - 1);
      this.db.collection('room').doc(this.room.id.toString()).collection('chat').add({
        uid: this.user.id, na: this.user.na, avatar: this.user.avatar, txt: i.toString(), upd: upd
      });
    }
  }
  onScroll(e) {
    this.data.currentY = e.detail.currentY;
  }
  onScrollEnd(e) {
    if (this.data.user.id) {
      this.readedFlag = this.data.readedFlag;
      var chats = e.currentTarget.children[1].children[0].children;
      var upd = [];//見えてるチャットの日付の集合
      for (let i = 0; i < chats.length; i++) {
        if (chats[i].offsetTop >= this.data.currentY &&
          chats[i].offsetTop + chats[i].offsetHeight < this.data.currentY + e.currentTarget.scrollHeight) {
          upd.push(new Date(chats[i].children[0].innerHTML));
        }
      }
      this.deleteMention(upd);
      /*if (new Date(this.room.csd) < upd) {
        this.room.csd = upd;
        this.php.get("room", { uid: this.data.user.id, rid: this.room.id, csd: this.data.dateFormat(this.room.csd) }).subscribe(dummy => { });
      }
      break;*/
    }
  }
  deleteMention(upd) {
    var mentions = this.mentions[this.room.id].filter(mention => {
      let mentionUpd = new Date(mention.upd.toDate());
      return mentionUpd <= upd[0] && mentionUpd >= upd[upd.length - 1];
    });
    for (let i = 0; i < mentions.length; i++) {
      this.db.collection('user').doc(this.user.id.toString()).collection('mention').doc(mentions[i].id).delete();
      this.mentions[this.room.id] = this.mentions[this.room.id].filter(mention => mention.id !== mentions[i].id);
    }
    mentions = this.mentions[this.room.id].filter(mention => new Date(mention.upd.toDate()) > upd[0]);
    this.mentionTop = mentions.length;
    mentions = this.mentions[this.room.id].filter(mention => new Date(mention.upd.toDate()) < upd[upd.length - 1]);
    this.mentionButtom = mentions.length;
  }
  loadMentionRooms(mentions) {
    this.mentions = {};
    var mentionCounts = {};
    for (let i = 0; i < mentions.length; i++) {
      let rid = mentions[i].rid;
      mentionCounts[rid] = mentionCounts[rid] ? mentionCounts[rid] + 1 : 1;
      this.mentions[rid] = true;
    }
    Object.keys(this.mentions).forEach((key) => {
      this.mentions[key] = mentions.filter(mention => mention.rid === Number(key));
    });
    var mentionRooms = [];
    Object.keys(mentionCounts).forEach((key) => {
      let rooms = this.data.rooms.filter(room => room.id === Number(key));
      if (rooms.length) {
        mentionRooms.push({ id: rooms[0].id, na: rooms[0].na, count: mentionCounts[key] });
      }
    });
    this.data.mentionRoom(mentionRooms);
  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}