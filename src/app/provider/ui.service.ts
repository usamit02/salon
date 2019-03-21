import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class UiService {
  loader;
  confirmSubject = new Subject();
  constructor(private toastController: ToastController, private loadingController: LoadingController,
    private confirmController: AlertController) { }
  async pop(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000
    });
    toast.present();
  }

  async alert(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      showCloseButton: true,
      position: 'top',
      closeButtonText: '閉じる'
    });
    toast.present();
    toast.onDidDismiss().then(data => {
      console.log(data);
    });
  }
  async loading(msg?: string) {
    msg = msg ? msg : "処理中...";
    this.loader = await this.loadingController.create({
      message: msg,
      duration: 5000
    });
    await this.loader.present();
  }
  loadend() {
    if (this.loader) {
      this.loader.dismiss();
    } else {
      setTimeout(() => { this.loader.dismiss(); }, 500)
    }
  }
  async confirm(header: string, msg: string) {
    const confirm = await this.confirmController.create({
      header: header,
      message: msg,
      buttons: [
        {
          text: 'いいえ',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            this.confirmSubject.next(false);
          }
        }, {
          text: 'はい',
          handler: () => {
            this.confirmSubject.next(true);
          }
        }
      ]
    });
    await confirm.present();
  }
}