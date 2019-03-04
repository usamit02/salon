import { Injectable } from '@angular/core';
import { ToastController, LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  loader;
  constructor(private toastController: ToastController, private loadingController: LoadingController) { }
  async pop(msg) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000
    });
    toast.present();
  }

  async alert(msg) {
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
  async loading(msg) {
    this.loader = await this.loadingController.create({
      message: msg,
    });
    await this.loader.present();
  }
}
