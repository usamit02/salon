import { Component } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import * as firebase from 'firebase';
import { auth } from 'firebase/app';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { DataService } from '../provider/data.service';
import { PhpService } from '../provider/php.service';
import { Observable } from 'rxjs';
import { UiService } from '../provider/ui.service';
import { Socket } from 'ngx-socket-io';
declare var tinymce;
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  writer: string;
  message: string;
  mediaButton = { add: false, img: false, url: false };
  addcolor: string = "light";
  media = new Media;
  uploadPercent: Observable<number>;
  sendable: boolean = false;
  typing: boolean = true;
  constructor(
    private data: DataService, private afAuth: AngularFireAuth, private db: AngularFirestore,
    private actionSheetCtrl: ActionSheetController, private php: PhpService, private storage: AngularFireStorage,
    private ui: UiService, private socket: Socket,
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
    /*this.db.collection('black').valueChanges().subscribe((data: any) => {
      if (data.length && data[0].uid === this.data.user.id) {
        this.logout();
        alert("KICKまたはBANされたため強制ログアウトします。")
      }
    });*/
    this.socket.on("typing", writer => {
      this.writer = writer;
      setTimeout(() => {
        this.writer = "";
      }, 2000)
    });
    tinymce.init({
      selector: ".tiny",
      menubar: false,
      inline: true,
      //theme: 'inlite',
      mobile: {
        theme: 'mobile',
        plugins: ['autosave', 'lists', 'autolink'],
        toolbar: ['undo', 'bold', 'italic', 'styleselect', 'emoticons']
      },
      language_url: 'https://bloggersguild.cf/js/ja.js',
      plugins: [
        'autolink autosave codesample link lists advlist table paste emoticons'
      ],
      toolbar: 'undo redo | forecolor | emoticons styleselect | blockquote link copy paste',
      contextmenu: 'restoredraft | inserttable cell row column deletetable | bullist numlist',
      forced_root_block: false, allow_conditional_comments: true, allow_html_in_named_anchor: true, allow_unsafe_link_target: true,
      setup: editor => {
        editor.on('NodeChange KeyDown Paste Change', e => {
          this.sendable = true;
          if (this.typing) {
            this.socket.emit('typing', this.data.user.na);
            this.typing = false;
            setTimeout(() => {
              this.typing = true;
            }, 2000);
          }
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
          cssClass: "twitter",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new firebase.auth.TwitterAuthProvider()).catch(reason => {
              this.ui.pop("ツイッターのログインに失敗しました。");
            });
          }
        }, {
          text: 'facebook',
          icon: "logo-facebook",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new firebase.auth.FacebookAuthProvider()).catch(reason => {
              this.ui.pop("フェイスブックのログインに失敗しました。");
            });
          }
        }, {
          text: 'google',
          icon: "logo-google",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(reason => {
              this.ui.pop("グーグルのログインに失敗しました。");
            });
          }
        }, {
          text: 'yahoo',
          icon: "logo-yahoo",
          cssClass: "actionyahoo",
          role: 'destructive',
          handler: () => {
            this.afAuth.auth.signInWithPopup(new auth.OAuthProvider("yahoo.com")).catch(reason => {
              this.ui.pop("ヤフーのログインに失敗しました。");
            });
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
    if (this.media.img && this.media.img.type.match(/image.*/)) {
      this.ui.pop("アップロードしています・・・");
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
            const px = i ? 1000 : 280;
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
      reader.readAsDataURL(this.media.img);
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
        that.mediaButton.add = false;
        that.addcolor = "light";
        that.uploadPercent = null;
      });
    }
  }
  chatAdd(upd) {
    let ed = tinymce.activeEditor;
    let txt = ed.getContent({ format: 'html' });
    if (!txt && this.media.isnull()) return;
    let uid = this.data.user.id, na = this.data.user.na, rid = this.data.room.id;
    let collection = rid > 1000000000 ? 'direct' : 'room';
    let add: any = { uid: uid, na: na, avatar: this.data.user.avatar, txt: txt, upd: upd };
    if (this.media.img) {
      add.img = Math.floor(upd.getTime() / 1000) + ".jpg";
    }
    if (this.media.youtube) {
      add.youtube = this.media.youtube;
    }
    if (this.media.twitter) {
      add.twitter = this.media.twitter;
    }
    if (this.media.html) {
      add.html = this.media.html;
    }
    if (this.media.card) {
      add.card = this.media.card;
    }
    this.media = new Media();
    let inputUrl = <HTMLInputElement>document.getElementById("url");
    if (inputUrl) inputUrl.value = "";
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
  fileup(e) {
    this.media.img = e.target.files[0];
    this.sendable = true;
    this.addcolor = "primary";
  }
  urlClick(e) {
    let url = e.target.value;
    if (url.indexOf("twitter.com") > 0) {
      url = url.match("twitter.com/[0-9a-zA-Z_]{1,15}/status(?:es)?/[0-9]{19}");
      if (url && url.length) {
        this.media.twitter = url[0];
        this.sendable = true;
      } else {
        this.ui.alert("twitterのurlを解析できませんでした。");
      }
    } else if (url.indexOf("youtu.be") > 0 || url.indexOf("youtube.com") > 0) {
      let id = url.match('[\/?=]([a-zA-Z0-9\-_]{11})');
      if (id && id.length) {
        this.media.youtube = id[1];
        this.sendable = true;
      } else {
        this.ui.alert("youtubeのurlを解析できませんでした。");
      }
    } else if (url.startsWith("<iframe") && url.endsWith("</iframe>")) {
      this.media.html = url;
      this.sendable = true;
    } else {
      let match = url.match("https?://[-_.!~*\'()a-zA-Z0-9;/?:@&=+$,%#]+");
      if (match !== null) {
        this.sendable = false;
        this.php.get('linkcard', { url: url }).subscribe((res: any) => {
          if (res.title || res.image) {
            res.url = url;
            this.media.card = res;
          } else {
            this.media.html = '<a href="' + url + '" target="_blank">' + url + '</a>';
          }
          this.sendable = true;
        });
      } else {
        this.ui.pop("urlを認識できません。");
      }
    }
  }
  youtubePress() {
    window.open("https://www.youtube.com/?gl=JP&hl=ja");
  }
  twitterPress() {
    window.open("https://twitter.com/");
  }
  rtc(action) {
    this.data.rtcSubject.next(action);
    this.data.rtc = action;
  }
  closeRtc() {
    this.data.rtcSubject.next("");
    this.data.rtc = "";
  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}
class Media {
  public img: File = null;
  public twitter: string = "";
  public youtube: string = "";
  public html: string = "";
  public card: any = null;
  isnull(): boolean {
    if (this.img || this.twitter || this.youtube || this.html || this.card) {
      return false;
    } else {
      return true;
    }
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
if (url.indexOf("https://www.google.com/maps/embed?") > 0) {
        let i = url.indexOf("width=");
        if (i > 100) {
          url = url.slice(0, i) + 'width="480" height="120" frameborder="0" style="border:0" allowfullscreen></iframe>';
          this.media.html = url;
          this.sendable = true;
        } else {
          this.ui.alert("google MAPのurlを解析できませんでした。");
        }
      }


*/