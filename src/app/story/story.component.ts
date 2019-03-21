import { Component, OnInit, Input } from '@angular/core';
import { PhpService } from '../provider/php.service';
import { UiService } from '../provider/ui.service';
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
  years = ["2019", "2020", "2021", "2022", "2023", "2024"];
  months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  card = { last4: "", bland: "", exp_year: null, exp_month: null, change: false };
  newcard = { number: "4242424242424242", cvc: "123", exp_year: "2020", exp_month: "12" };
  plan = { amount: null, billing_day: null, trial_days: null, auth_days: null };
  price;
  billing_day;
  trial_days;
  auth_days;
  @Input() room;
  @Input() user;
  constructor(private php: PhpService, private ui: UiService, private data: DataService) { }
  ngOnInit() {
    this.php.get("story", { uid: this.user.id, rid: this.room.id }).subscribe((res: any) => {
      this.storys = res.main;
      setTimeout(() => {
        twttr.widgets.load();
      });
    });
  }
  goPayMode() {
    if (this.data.user.id) {
      this.payMode = true;
      this.ui.loading("読込中...");
      Payjp.setPublicKey("pk_test_12e1f56f9f92414d7b00af63");
      this.php.get("pay/plan", { uid: this.data.user.id, rid: this.room.id, pid: this.room.plan }).subscribe((res: any) => {
        this.ui.loadend();
        if (res.error) {
          this.ui.alert("プランの読込に失敗しました。再読み込みを試してください。\n" + res.error);
        } else {
          this.plan = res.plan;
          if (!res.plan.billing_day) this.plan.billing_day = new Date().getDate();
          this.card = res.card;
        }
      });
    } else {
      this.ui.pop("ログインしてください。");
    }
  }
  pay(token: string) {
    this.ui.loading("支払中...");
    this.php.get("pay/charge", { rid: this.room.id, uid: this.user.id, na: this.user.na, token: token }).subscribe((res: any) => {
      this.ui.loadend();
      if (res.msg === "ok") {
        this.payMode = false;
        this.data.readRooms();
        if (res.plan === 0) {
          this.ui.pop('ようこそ「' + this.room.na + "」へ");
          this.data.room.lock = 0;
        } else if (res.plan) {
          this.ui.alert('「' + this.room.na + '」へ加入申込しました。\n審査完了まで最大' + res.plan + '日間お待ちください。');
          this.data.room.lock = 1;
        }
      } else {
        this.ui.alert("定額課金の処理に失敗しました。お問い合わせください。\n" + res.error);
      }
    });
  }
  newpay(card) {
    Payjp.createToken(card, (s, res) => {
      if (res.error) {
        this.ui.alert("クレジットカード情報の取得に失敗しました。");
      } else {
        this.pay(res.id);
      }
    });
  }
  leave() {
    this.ui.confirm("退会", this.room.na + "を退会します。");
    this.ui.confirmSubject.asObservable().subscribe(res => {
      if (res) {
        this.ui.loading();
        this.php.get("pay/roompay", { uid: this.user.id, rid: this.room.id, ban: this.user.id }).subscribe((res: any) => {
          this.ui.loadend();
          if (res.msg === 'ok') {
            this.ui.pop(this.room.na + "から脱退しました。次回ログインから入室できません。");
          } else {
            this.ui.alert("退会処理失敗しました。\n C-Lifeまでお問合せください。\n" + res.error);
          }
        });
      }
    });
  }
}
