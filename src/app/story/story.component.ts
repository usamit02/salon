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
  payid: number = 0;
  payjp;
  years = ["2019", "2020", "2021", "2022", "2023", "2024"];
  months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  card = { last4: "", bland: "", exp_year: null, exp_month: null, change: false };
  newcard = { number: "4242424242424242", cvc: "123", exp_year: "2020", exp_month: "12" };
  plan = { amount: null, billing_day: null, trial_days: null, auth_days: null, prorate: null };
  price;
  billing_day;
  trial_days;
  auth_days;
  @Input() room;
  @Input() user;
  constructor(private php: PhpService, private ui: UiService, private data: DataService) { }
  ngOnInit() {
    this.storyLoad();
  }
  storyLoad() {
    this.php.get("story", { uid: this.user.id, rid: this.room.id }).then(res => {
      this.storys = res.main;
      setTimeout(() => {
        twttr.widgets.load();
      });
    });
  }
  goPayMode(payid) {//「このサロンに加入する」ボタンを押したとき、プランとカード情報を呼んで最終確認ページへ
    if (this.data.user.id) {
      this.payid = payid;//-1は定額課金、0>はストーリー番号
      Payjp.setPublicKey("pk_test_12e1f56f9f92414d7b00af63");
      let plan: any = { uid: this.data.user.id, rid: this.room.id };
      if (payid === -1) plan.pid = this.room.plan;
      this.php.get("pay/plan", plan, "読込中").then(res => {
        if (payid === -1) {
          if (!res.plan.prorate && res.plan.billing_day) {//引き落とし日指定なのに日割りになってない、プラン保存ミス
            this.ui.alert("データーエラーにより加入できません。\r\nC-Lifeまでお問合せください。");
            this.payid = 0;
          } else {
            if (!res.plan.billing_day && !res.plan.auth_days) {
              let date = new Date();
              date.setDate(date.getDate() + res.plan.trial_days);
              res.plan.billing_day = date.getDate();
            }
            this.plan = res.plan;
            this.card = res.card;
          }
        }
      }).catch(() => { this.payid = 0; })
    } else {
      this.ui.pop("ログインしてください。");
    }
  }
  pay(token: string) {
    let charge: any = { rid: this.room.id, uid: this.user.id, na: this.user.na, token: token };
    if (this.payid > 0) charge.sid = this.payid;
    this.php.get("pay/charge", charge, "支払中").then(res => {
      if (res.typ === "plan") {//定額課金        
        this.data.readRooms();
        if (res.plan === 0) {
          this.ui.pop('ようこそ「' + this.room.na + "」へ");
          this.data.room.lock = 0;
          this.data.rooms.map(room => {
            if (room.id === this.data.room.id) {
              room.lock = 0;
            }
          });
          this.data.allRooms.map(room => {
            if (room.id === this.data.room.id) {
              room.lock = 0;
            }
          });
        } else if (res.plan) {
          this.ui.alert('「' + this.room.na + '」へ加入申込しました。\n審査完了まで最大' + res.plan + '日間お待ちください。');
          this.data.room.lock = 1;
          this.data.rooms.map(room => {
            if (room.id === this.data.room.id) {
              room.lock = 1;
            }
          });
          this.data.allRooms.map(room => {
            if (room.id === this.data.room.id) {
              room.lock = 1;
            }
          });
        }
      } else if (res.typ === "charge") {
        this.ui.pop("支払い完了しました。コンテンツをお楽しみください。");
        this.storyLoad();
      }
      else {
        this.ui.alert("課金処理に失敗しました。お問い合わせください。\n" + res.error);
      }
      this.payid = 0;
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
    this.ui.confirm("退会", this.room.na + "を退会します。").then(() => [
      this.php.get("pay/roompay", { uid: this.user.id, rid: this.room.id, ban: this.user.id }, "処理中").then(() => {
        this.ui.pop(this.room.na + "から脱退しました。次回ログインから入室できません。");
      })
    ]);
  }
}
