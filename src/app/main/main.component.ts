import { Component } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from 'angularfire2/storage';
import { DataService } from '../provider/data.service';
import { PhpService } from '../provider/php.service';
import { Observable } from 'rxjs';
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
  addcolor: string = "light";
  img: File;
  uploadPercent: Observable<number>;
  sendable: boolean = false;
  constructor(
    private data: DataService, private afAuth: AngularFireAuth, private db: AngularFirestore,
    private actionSheetCtrl: ActionSheetController, private php: PhpService, private storage: AngularFireStorage
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
    tinymce.init({
      selector: ".tiny",
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
          this.sendable = true;
          console.log('editer change' + e);
        });
      }
    });
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
  send() {
    this.sendable = false;
    var upd = new Date();
    if (this.img && this.img.type.match(/image.*/)) {
      var that = this;
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      var fileName = Math.floor(upd.getTime() / 1000) + ".jpg";
      let img = new Image();
      let reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          let w, h;
          for (let i = 0; i < 2; i++) {
            const px = i ? 1000 : 320;
            if (img.width > img.height) {
              w = img.width > px ? px : img.width;//横長
              h = img.height * (w / img.width);
            } else {
              h = img.height > px * 0.75 ? px * 0.75 : img.height;//縦長
              w = img.width * (h / img.height);
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            if (i) {
              canvas.toBlob(upload, 'image/jpeg');
            } else {
              canvas.toBlob(uploadThumb, 'image/jpeg');
            }
          }
        }
        img.src = <string>reader.result;
      }
      reader.readAsDataURL(this.img);
    } else {
      this.chatAdd(upd);
    }
    function uploadThumb(file: File) {
      that.storage.upload("room/" + that.data.room.id + "/" + fileName, file).catch(err => {
        alert("サムネイルのアップロードに失敗しました。\r\n" + err.message);
      });
    }
    function upload(file: File) {
      const task = that.storage.upload("room/" + that.data.room.id + "/org/" + fileName, file);
      that.uploadPercent = task.percentageChanges();
      task.catch(err => {
        alert("ファイルアップロードに失敗しました。\r\n" + err.message);
      }).then(ref => {
        that.chatAdd(upd);
        that.add = false;
        that.addcolor = "light";
        that.uploadPercent = null;
      });
    }
  }
  chatAdd(upd) {
    let ed = tinymce.activeEditor;
    let txt = ed.getContent({ format: 'html' });
    if (!txt && !this.img) return;
    let uid = this.data.user.id, na = this.data.user.na, rid = this.data.room.id;
    let collection = rid > 1000000000 ? 'direct' : 'room';
    let add: any = { uid: uid, na: na, avatar: this.data.user.avatar, txt: txt, upd: upd };
    if (this.img) {
      add.img = Math.floor(upd.getTime() / 1000) + ".jpg";
      this.img = null;
    }
    this.db.collection(collection).doc(rid.toString()).collection('chat').add(add).catch(err => { alert("チャット書込みに失敗しました。\r\n" + err); }).then(ref => {
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
    );
  }
  addClick() {
    this.add = !this.add;
  }
  fileup(e) {
    this.img = e.target.files[0];
    this.addcolor = "primary";
  }
  media() {

  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}

/*
 sendMsg2() {
    var upd = new Date();
    for (let i = 0; i < 100; i++) {
      upd.setDate(upd.getDate() - 1);
      this.db.collection('room').doc(this.data.room.id.toString()).collection('chat').add({
        uid: this.data.user.id, na: this.data.user.na, avatar: this.data.user.avatar, txt: i.toString(), uno: this.data.user.no, upd: upd
      });
    }
  }


this.storage.upload(path, file).then(snapshot => {
      this.storage.ref(path).getDownloadURL().subscribe(url => {
        alert(url);
      });



*/