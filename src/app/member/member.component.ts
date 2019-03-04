import { Component, OnInit } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';
import { DataService } from '../provider/data.service';
import { PhpService } from '../provider/php.service';
import { ToastService } from '../provider/toast.service';
@Component({
  selector: 'app-member',
  templateUrl: './member.component.html',
  styleUrls: ['./member.component.scss']
})
export class MemberComponent implements OnInit {
  member;
  constructor(private navParams: NavParams, private pop: PopoverController, private data: DataService,
    private php: PhpService, private toast: ToastService, ) { }
  ngOnInit() {
    this.member = this.navParams.get('member');
    let room = this.data.room;
    let member = this.member;
    let a = 0;
  }
  mention() {
    this.data.mentionSubject.next(this.member);
    this.close();
  }
  dm() {

  }
  kick() {
    if (this.member.payrid) {//メンバー
      this.php.get("pay/roompay", { uid: this.member.id, rid: this.member.payrid, ban: this.data.user.id }).subscribe((res: any) => {
        if (res.msg === 'ok') {
          this.toast.pop(this.member.na + "を強制退会処理しました。");
        } else {
          this.toast.alert("退会処理失敗のため" + this.member.na + "をkickできませんでした。\n C-Lifeまでお問合せください。\n" + res.error);
        }
      });
    }
    if (this.member.staffs.length) {//スタッフ
      let sql = "";
      for (let i = 0; i < this.member.staffs.length; i++) {
        sql += "DELETE FROM t03staff WHERE uid='" + this.member.id + "' AND rid=" + this.member.staffs[i].rid + ";\n";
      }
      this.php.get("owner/save", { sql: sql.substr(0, sql.length - 1) }).subscribe((res: any) => {
        if (res.msg === 'ok') {
          this.toast.pop(this.member.na + "を" + this.data.room.na + "のスタッフから外しました。");
        } else {
          this.toast.alert("データベースエラーのため" + this.member.na + "をkickできませんでした。\n C-Lifeまでお問合せください。");
        }
      });
    }
    this.close();
  }
  ban() {
    this.php.get("owner/ban", { uid: this.member.id, ban: this.data.user.id }).subscribe((res: any) => {
      if (!res.bossrooms.length && !res.payrooms.length) {//権限外の役員や会員になっているか調べる
        let sql = "";
        for (let i = 0; i < res.staffrooms.length; i++) {
          sql += "DELETE FROM t03staff WHERE uid='" + this.member.id + "' AND rid=" + res.staffrooms[i].id + ";\n";
        }
        if (sql) {
          this.php.get("owner/save", { sql: sql.substr(0, sql.length - 1) }).subscribe((res: any) => {
            if (res.msg === "ok") {
              setBlack(this.member.id, this);
            } else {
              this.toast.alert("データベースエラーによりBAN失敗しました。\n C-Lifeまでお問合せください。");
            }
          });
        }
        this.php.get("pay/ban", { uid: this.member.id, ban: this.data.user.id }).subscribe((res: any) => {
          if (res.msg === 'ok') {
            setBlack(this.member.id, this);
          } else {
            this.toast.alert("退会処理失敗のため" + this.member.na + "をBANできませんでした。\n C-Lifeまでお問合せください。\n" + res.error);
          }
        });
      } else {
        let msg = ""
        if (res.bossrooms.length) {
          msg += this.member.na + "は下記の役員ですが、あなたに人事権がないためBANできません。\n上位役員に解任を相談してください。\n";
          for (let i = 0; i < res.bossrooms.length; i++) {
            msg += res.bossrooms[i].na + ":" + res.bossrooms[i].class + "\n";
          }
        }
        if (res.payrooms.length) {
          msg += this.member.na + "は下記の会員ですが、あなたに人事権がないためBANできません。\n上位役員に退会を相談してください。\n";
          for (let i = 0; i < res.payrooms.length; i++) {
            msg += res.payrooms[i].na + "\n";
          }
        }
        this.toast.alert(msg);
      }
    });
    this.close();
    function setBlack(uid, that) {
      //ブラックリスト登録と強制ログアウト処理
      that.toast.pop("ばーん‼");
    }
  }
  close() {
    this.pop.dismiss();
  }
}
