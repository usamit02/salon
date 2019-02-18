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
  user: User;
  room;
  userX: string;
  bookmk: boolean = false;
  writer: string;
  message: string;
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
      this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.data.room.id, user: this.user, rtc: "" });
      if (this.user.id) {
        setTimeout(() => {
          var chats = <any>document.getElementsByClassName('chat');
          var footer = <any>document.getElementById('footer');
          if (chats.length) {
            if (chats[chats.length - 1].offsetTop + chats[chats.length - 1].offsetHeight > footer.offsetTop) {
              this.content.scrollByPoint(0, 1, 0);
              this.content.scrollByPoint(0, 0, 0);
            } else {
              var upds = [];
              for (let i = 0; i < chats.length; i++) {
                upds.push(new Date(chats[i].children[0].innerHTML))
              }
              this.deleteMention(upds);
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
    this.data.scrollState.subscribe(direction => {
      if (direction === 'btm') {
        this.content.scrollToBottom(500);
      } else if (direction === 'btmOne') {
        this.content.scrollByPoint(0, 20, 300);
      } else if (typeof direction === "number") {
        this.content.scrollToPoint(0, direction, 300);
      }
    });
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
    this.db.collection('room').doc(this.data.room.id.toString()).collection('chat').add({
      uid: this.user.id, na: this.user.na, avatar: this.user.avatar, txt: txt, upd: upd
    });
    var mentions = ed.dom.select('.mention');
    for (let i = 0; i < mentions.length; i++) {
      this.db.collection('user').doc(mentions[i].id).collection('mention').add({
        uid: this.user.id, rid: this.data.room.id, upd: upd
      });
    }
    setTimeout(() => {
      ed.setContent('');
    });
    setTimeout(() => {
      this.content.scrollToBottom();
    }, 300);
  }
  sendMsg2() {
    var upd = new Date();
    for (let i = 0; i < 100; i++) {
      upd.setDate(upd.getDate() - 1);
      this.db.collection('room').doc(this.data.room.id.toString()).collection('chat').add({
        uid: this.user.id, na: this.user.na, avatar: this.user.avatar, txt: i.toString(), upd: upd
      });
    }
  }
  onScroll(e) {
    this.data.currentY = e.detail.currentY;
  }
  onScrollEnd(e) {
    if (this.data.user.id) {
      var chats = e.currentTarget.children[1].children[2].children;
      var upds = [];//見えてるチャットの日付の集合
      for (let i = 0; i < chats.length; i++) {
        if (chats[i].offsetTop >= this.data.currentY &&
          chats[i].offsetTop + chats[i].offsetHeight < this.data.currentY + e.currentTarget.scrollHeight - 30) {
          upds.push(new Date(chats[i].children[0].innerHTML));
        }
      }
      if (upds.length) {
        this.deleteMention(upds);
        let upd = upds[upds.length - 1];
        if (!this.data.room.csd || new Date(this.data.room.csd).getTime() < upd.getTime()) {
          this.data.room.csd = upd;
          this.php.get("room", { uid: this.data.user.id, rid: this.data.room.id, csd: this.data.dateFormat(upd) }).subscribe(dummy => { });
        }
      }
    }
    console.log(this.data.currentY);
  }
  onActivate(e) {
    console.log("activate" + e);
    this.room = e;
  }
  deleteMention(upd) {
    var mentions = this.mentions[this.data.room.id.toString()];
    if (mentions && mentions.length) {
      var deleteMentions = mentions.filter(mention => {
        let mentionUpd = new Date(mention.upd.toDate());
        return mentionUpd <= upd[0] && mentionUpd >= upd[upd.length - 1];
      });
      for (let i = 0; i < deleteMentions.length; i++) {
        this.db.collection('user').doc(this.user.id.toString()).collection('mention').doc(deleteMentions[i].id).delete();
        mentions = mentions.filter(mention => mention.id !== deleteMentions[i].id);
      }
      var mentionTop = this.mentions[this.data.room.id].filter(mention => new Date(mention.upd.toDate()) > upd[0]);
      this.mentionTop = mentionTop.length;
      var mentionButtom = this.mentions[this.data.room.id].filter(mention => new Date(mention.upd.toDate()) < upd[upd.length - 1]);
      this.mentionButtom = mentionButtom.length;
    }
  }
  loadMentionRooms(mentions) {
    this.mentions = {};
    var mentionCounts = {};
    var chats = <any>document.getElementsByClassName('chat');
    if (!chats.length) return;
    var upd = new Date(chats[0].children[0].innerHTML).getTime();
    if (this.data.currentY === 0 && mentions[0].rid === this.data.room.id && mentions[0].upd.toDate().getTime() === upd) {
      this.db.collection('user').doc(this.user.id.toString()).collection('mention').doc(mentions[0].id).delete();
    } else {
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
  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}