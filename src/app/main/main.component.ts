import { Component, ViewChild } from '@angular/core';
import { ActionSheetController, ToastController, IonContent } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { PhpService } from '../provider/php.service';
import { User, DataService } from '../provider/data.service';
const LOGOUTUSER = { id: "", na: "", avatar: "", p: 0 };
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  @ViewChild(IonContent) content: IonContent;
  room;
  rooms = [];
  user: User;
  userX: string;
  bookmk: boolean = false;
  chats = [];
  writer: string;
  message: string;
  constructor(
    private php: PhpService, private data: DataService, private afAuth: AngularFireAuth,
    private toastCtrl: ToastController, private actionSheetCtrl: ActionSheetController,

  ) {
  }
  ngOnInit() {
    this.user = LOGOUTUSER;
    this.room = { id: 2, na: "メインラウンジ", allow: 1, parent: 1, folder: 0, bookmark: 0, chat: true, story: false };
    this.rooms = this.data.rooms;
  }
  ngAfterViewInit() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.php.get("user", { uid: user.uid, na: user.displayName, avatar: user.photoURL }).subscribe((res: any) => {
          if (res.msg !== "ok") {
            alert(res.msg);
          }
          this.user = { id: res.id, na: res.na, avatar: res.avatar, p: res.p };
          this.data.login(this.user);
          // let dummy = <HTMLButtonElement>document.getElementById("dummy");
          // dummy.click();
        });
      } else {
        this.user = LOGOUTUSER;
        this.data.user = LOGOUTUSER;
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
    if (!this.message.trim()) return;
    const newData = firebase.database().ref('chat/' + this.room.id).push();
    newData.set({
      user: this.user.na,
      message: this.message,
      sendDate: Date(),
      avatar: this.user.avatar
    });
    this.message = "";
    setTimeout(() => {
      this.content.scrollToBottom();
    }, 400);
  }

}
