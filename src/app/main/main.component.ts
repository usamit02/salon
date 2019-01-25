import { Component, ViewChild } from '@angular/core';
import { ActionSheetController, ToastController, IonContent } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { User, Room, DataService } from '../provider/data.service';
import { Socket } from 'ngx-socket-io';
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
  constructor(
    private data: DataService, private afAuth: AngularFireAuth, private socket: Socket, private db: AngularFirestore,
    private toastCtrl: ToastController, private actionSheetCtrl: ActionSheetController,
  ) {
  }
  ngOnInit() {
    this.user = new User;
    this.room = new Room;
    this.data.userState.subscribe(user => this.user = user);
    this.data.roomState.subscribe(room => {
      this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.room.id, user: this.user, rtc: "" })
      this.room = room;
    });
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
    let txt = this.message.trim();
    let upd = new Date();
    if (!txt) return;
    //for (let i = 0; i < 100; i++) {
    //  upd.setDate(upd.getDate() - 1); txt = i.toString();
    this.db.collection('room').doc(this.room.id.toString()).collection('chat').add({
      uid: this.user.id, na: this.user.na, avatar: this.user.avatar, txt: txt, upd: upd
    });
    //}
    this.message = "";
  }
  keyPress() {

  }
  ngOnDestroy() {
    this.data.userSubject.unsubscribe();
    this.data.roomSubject.unsubscribe();
  }
}
