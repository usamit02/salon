import { Component, OnInit, Input } from '@angular/core';
import { PhpService } from '../provider/php.service';
import { ToastService } from '../provider/toast.service';
import { DataService } from '../provider/data.service';
declare var twttr; declare var Payjp;
@Component({
  selector: 'app-story',
  templateUrl: './story.component.html',
  styleUrls: ['./story.component.scss']
})
export class StoryComponent implements OnInit {
  storys = [];
  story: string;
  payMode: boolean = false;
  payjp;
  years = ["2018", "2019", "2020", "2021", "2022", "2023"];
  months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  card = { number: "4242424242424242", cvc: "123", exp_year: "2020", exp_month: "12" };
  date;
  price;
  @Input() room;
  @Input() user;
  constructor(private php: PhpService, private toast: ToastService, private data: DataService) { }
  ngOnInit() {
    this.php.get("story", { uid: this.user.id, rid: this.room.id }).subscribe((res: any) => {
      this.storys = res.main;
      setTimeout(() => {
        twttr.widgets.load();
      });
    });
  }
  goPayMode() {
    this.payMode = true;
    Payjp.setPublicKey("pk_test_12e1f56f9f92414d7b00af63");
    const toDay = new Date;
    this.date = toDay.getDate();
    this.php.get("room", { plan: this.room.plan }).subscribe((res: any) => {
      if (!res.error) {
        this.price = res[0].amount;
      }
    });
  }
  pay(card) {
    this.toast.loading("支払中...");
    Payjp.createToken(card, (s, response) => {
      if (response.error) {
        this.toast.loader.dismiss();
        this.toast.alert("クレジットカード情報の取得に失敗しました。");
      } else {
        this.php.get("pay/charge", { token: response.id, room: this.room.id, uid: this.user.id, na: this.user.na }).subscribe((res: any) => {
          this.toast.loader.dismiss();
          if (res.msg === "ok") {
            this.payMode = false;
            if (res.plan === 0) {
              this.data.readRooms();
              this.toast.pop('ようこそ「' + this.room.na + "」へ");
            } else if (res.plan) {
              this.toast.alert('「' + this.room.na + '」へ加入申込しました。\n審査完了まで最大' + res.plan + '日間お待ちください。');
            }
          } else {
            this.toast.alert("定額課金の処理に失敗しました。お問い合わせください。");
          }
        });
      }
    });
  }
}
