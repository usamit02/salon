import { Component, ViewChild } from '@angular/core';
import { ActionSheetController, ToastController, IonContent } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { User, Room, DataService } from '../provider/data.service';
import { Socket } from 'ngx-socket-io';
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
    private toastCtrl: ToastController, private actionSheetCtrl: ActionSheetController,
  ) {
  }
  ngOnInit() {
    this.user = new User;
    this.room = new Room;
    this.data.userState.subscribe(user => { this.user = user; });
    this.data.roomState.subscribe(room => {
      this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.room.id, user: this.user, rtc: "" })
      this.room = room;
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
  loadMentions() {

  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}
