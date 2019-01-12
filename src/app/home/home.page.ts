import { Component, ViewChild, Input, EventEmitter, Output } from '@angular/core';
import { ActionSheetController, ToastController } from '@ionic/angular';
import * as firebase from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
import { PhpService } from '../provider/php.service';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @Input() room = { id: 2, na: "メインラウンジ", allow: 1, parent: 1, folder: 0, bookmark: 0 };
  @Output() changeUser = new EventEmitter<User>();
  user: User;
  userX: string;
  bookmk: boolean = false;
  constructor(
    private php: PhpService, private afAuth: AngularFireAuth,
    public actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController
  ) {
    this.user = LOGOUTUSER;
  }
  ngOnInit() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.php.get("user.php", { uid: user.uid, na: user.displayName, avatar: user.photoURL }).subscribe((res: any) => {
          if (res.msg !== "ok") {
            alert(res.msg);
          }
          this.user = { id: res.id, na: res.na, avatar: res.avatar, p: res.p };
          this.changeUser.emit(this.user)
        });
      } else {
        this.user = LOGOUTUSER;
      }
    });
  }
}
export class User {
  id: string;
  na: string;
  avatar: string;
  p: number;
}
const LOGOUTUSER = { id: "", na: "", avatar: "", p: 0 }