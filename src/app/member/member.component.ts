import { Component, OnInit } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';
import { DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { PhpService } from '../provider/php.service';
import { UiService } from '../provider/ui.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-member',
  templateUrl: './member.component.html',
  styleUrls: ['./member.component.scss']
})
export class MemberComponent implements OnInit {
  member;
  black: boolean = false;
  block: Number;
  constructor(private navParams: NavParams, private pop: PopoverController, private data: DataService,
    private php: PhpService, private ui: UiService, private db: AngularFirestore, private router: Router, ) { }
  ngOnInit() {
    this.member = this.navParams.get('member');
    let room = this.data.room;
    let member = this.member;
    let a = 0;
    if (this.data.user.id) {
      this.php.get("member", { uid: this.data.user.id, mid: this.member.id }).subscribe((res: any) => {
        if (!res || res.msg) {
          alert("ブロック状況の読込に失敗しました。\r\n" + res.msg);
        } else {
          this.block = res.block;
        }
      });
    }
  }
  mention() {
    this.data.mentionSubject.next(this.member);
    this.close();
  }
  direct() {
    this.close();
    this.data.directUser = this.member;
    let uid_old, uid_new, na_old, na_new;
    if (new Date(this.data.user.upd).getTime() < new Date(this.member.upd).getTime()) {
      uid_old = this.data.user.id; uid_new = this.member.id;
      na_old = this.data.user.na; na_new = this.member.na;
    } else {
      uid_old = this.member.id; uid_new = this.data.user.id;
      na_old = this.member.na; na_new = this.data.user.na
    }
    this.db.collection("direct", ref => ref.where('uid_old', '==', uid_old).where('uid_new', '==', uid_new)).get().subscribe(query => {
      if (query.docs.length) {
        this.router.navigate(['/home/room', query.docs[0].id]);
      } else {
        let id = Math.floor(new Date().getTime() / 1000).toString();
        this.db.collection("direct").doc(id).set({ uid_old: uid_old, uid_new: uid_new, na_old: na_old, na_new: na_new }).then(ref => {
          this.router.navigate(['/home/room', id])
            .catch(error => {
              alert(error);
            });
        });
      }
    });
  }
  blocking() {
    //this.ui.loading();    
    this.php.get("member", { uid: this.data.user.id, mid: this.member.id, block: this.block }).subscribe((res: any) => {
      //this.ui.loader.dismiss();
      if (!res || res.msg) {
        alert("ブロック設定変更に失敗しました。\r\n" + res.msg);
      } else {
        let msg = res.block ? "ブロック" : "受付開始"
        this.ui.pop(this.member.na + "からの通知を" + msg + "しました。");
        this.block = res.block;
      }
      this.close();
    });
  }
  kick() {
    this.black = false;
    if (this.member.payrid) {//メンバー
      this.php.get("pay/roompay", { uid: this.member.id, rid: this.member.payrid, ban: this.data.user.id }).subscribe((res: any) => {
        if (res.msg === 'ok') {
          this.ui.pop(this.member.na + "を強制退会処理しました。");
          if (!this.black) this.setBlack(this.member.id, this.data.user.id, true);
        } else {
          this.ui.alert("退会処理失敗のため" + this.member.na + "をkickできませんでした。\n C-Lifeまでお問合せください。\n" + res.error);
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
          this.ui.pop(this.member.na + "を" + this.data.room.na + "のスタッフから外しました。");
          if (!this.black) this.setBlack(this.member.id, this.data.user.id, true);
        } else {
          this.ui.alert("データベースエラーのため" + this.member.na + "をkickできませんでした。\n C-Lifeまでお問合せください。");
        }
      });
    }
    this.close();
  }
  ban() {
    this.black = false;
    this.php.get("owner/ban", { uid: this.member.id, ban: this.data.user.id }).subscribe((res: any) => {
      if (!res.bossrooms.length && !res.payrooms.length) {//権限外の役員や会員になっているか調べる
        let sql = "";
        for (let i = 0; i < res.staffrooms.length; i++) {
          sql += "DELETE FROM t03staff WHERE uid='" + this.member.id + "' AND rid=" + res.staffrooms[i].id + ";\n";
        }
        if (sql) {
          this.php.get("owner/save", { sql: sql.substr(0, sql.length - 1) }).subscribe((res: any) => {
            if (res.msg === "ok") {
              if (!this.black) this.setBlack(this.member.id, this.data.user.id);
            } else {
              this.ui.alert("データベースエラーによりBAN失敗しました。\n C-Lifeまでお問合せください。");
            }
          });
        }
        this.php.get("pay/ban", { uid: this.member.id, ban: this.data.user.id }).subscribe((res: any) => {
          if (res.msg === 'ok') {
            if (!this.black) this.setBlack(this.member.id, this.data.user.id);
          } else {
            this.ui.alert("退会処理失敗のため" + this.member.na + "をBANできませんでした。\n C-Lifeまでお問合せください。\n" + res.error);
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
        this.ui.alert(msg);
      }
    });
    this.close();
  }
  setBlack(uid: string, ban: string, kick?: boolean) {//ブラックリスト登録と強制ログアウト処理      
    this.black = true;//呼び出し１回目のみfirestore書き込み
    this.db.collection('black').add({ uid: uid, upd: new Date(), ban: ban }).then(ref => {
      if (kick) this.db.collection('black').doc(ref.id).delete();//kickのときはすぐblackリストを消す、強制ログアウトのみ
    });
    this.ui.pop("やっつけたぜ！");
  }
  close() {
    this.pop.dismiss();
  }
}
