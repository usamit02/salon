import { Component } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { DataService } from '../provider/data.service';
import { tinyinit } from '../../environments/environment';
import { PhpService } from '../provider/php.service';
declare var tinymce;
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  writer: string;
  message: string;
  add: boolean = false;
  constructor(
    private data: DataService, private afAuth: AngularFireAuth, private db: AngularFirestore,
    private actionSheetCtrl: ActionSheetController, private php: PhpService,
  ) { }
  ngOnInit() {
    this.data.mentionSubject.asObservable().subscribe((member: any) => {
      var ed = tinymce.activeEditor;
      var endId = tinymce.DOM.uniqueId();
      ed.dom.add(ed.getBody(), 'span', { style: 'color:blue;', class: 'mention', id: member.id }, '@' + member.na);
      ed.dom.add(ed.getBody(), 'span', { id: endId }, '&nbsp;');
      ed.focus();
      var newNode = ed.dom.select('#' + endId);
      ed.selection.select(newNode[0]);
    });
    this.db.collection('black').valueChanges().subscribe((data: any) => {
      if (data.length && data[0].uid === this.data.user.id) {
        this.logout();
        alert("KICKまたはBANされたため強制ログアウトします。")
      }
    });
    tinymce.init(tinyinit);
  }
  ngAfterViewInit() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        this.db.collection('black', ref => ref.where('uid', "==", user.uid)).get().subscribe(query => {
          if (query.docs.length) {
            alert("ブラックリスト入りしてます。ログインできません。");
          } else {
            this.data.login(user);
            let dummy = <HTMLButtonElement>document.getElementById("dummy");
            dummy.click();
          }
        });
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
    this.data.logout();
  }
  sendMsg() {
    let ed = tinymce.activeEditor;
    let txt = ed.getContent({ format: 'html' });
    if (!txt) return;
    let upd = new Date(), uid = this.data.user.id, na = this.data.user.na, rid = this.data.room.id;
    let collection = rid > 1000000000 ? 'direct' : 'room';
    this.db.collection(collection).doc(rid.toString()).collection('chat').add({
      uid: uid, na: na, avatar: this.data.user.avatar, txt: txt, upd: upd
    }).catch(err => { alert("チャット書込みに失敗しました。\r\n" + err); });
    if (collection === 'direct') {
      this.db.collection('direct').doc(rid.toString()).set({ upd: upd }, { merge: true }).then(() => {
        this.php.post('send', { uid: uid, mid: this.data.directUser.id, na: na, txt: txt, rid: rid }).subscribe((res: any) => {
          if (res.msg) { alert(res.msg); }
        });
      }).catch(err => {
        alert("メール送信に失敗しました。\r\n" + err);
      });
    } else {
      this.php.post('send', { uid: uid, rid: rid, upd: this.data.dateFormat(upd) }).subscribe((res: any) => {
        if (res.msg) { alert(res.msg); }
      });
    }
    let mentions = ed.dom.select('.mention');
    for (let i = 0; i < mentions.length; i++) {
      this.db.collection('user').doc(mentions[i].id).collection('mention').add({ uid: uid, rid: rid, upd: upd }).then(() => {
        this.php.post('send', { mid: mentions[i].id, uid: uid, na: na, rid: rid, txt: txt }).subscribe((res: any) => {
          if (res.msg) { alert(res.msg); }
        });
      }).catch(err => { alert("メンション書込みに失敗しました。\r\n" + err); });
    }
    setTimeout(() => {
      ed.setContent('');
    });
    setTimeout(() => {
      let content = <any>document.getElementById('chatscontent');
      content.scrollToBottom(300);
    }, 300);
  }
  sendMsg2() {
    var upd = new Date();
    for (let i = 0; i < 100; i++) {
      upd.setDate(upd.getDate() - 1);
      this.db.collection('room').doc(this.data.room.id.toString()).collection('chat').add({
        uid: this.data.user.id, na: this.data.user.na, avatar: this.data.user.avatar, txt: i.toString(), uno: this.data.user.no, upd: upd
      });
    }
  }
  addClick() {
    this.add = !this.add;
  }
  media() {

  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}