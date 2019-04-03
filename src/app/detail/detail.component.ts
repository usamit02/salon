import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PhpService } from '../provider/php.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { DataService } from '../provider/data.service';
import { AlertController } from '@ionic/angular';
import { UiService } from '../provider/ui.service';
@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit {
  paramsSb: Subscription;
  user;
  constructor(private php: PhpService, private router: Router, private route: ActivatedRoute,
    private location: Location, private data: DataService, private alertController: AlertController,
    private ui: UiService) { }
  ngOnInit() {
    this.paramsSb = this.route.params.subscribe(params => {
      if (params.no > 0) {
        this.php.get('user', { no: params.no }).subscribe((res: any) => {
          if (res.msg) {
            alert(res.msg);
          } else if (res.user) {
            this.user = res.user;
            this.user.staff = res.staff;
            this.user.member = res.member;
            this.user.links = res.links;
          }
        });
      }
    });
  }
  joinRoom(rid) {
    this.router.navigate(['/home/room', rid]);
  }
  href(url) {
    window.open(url, '_blank');
  }
  async edit(link?) {
    let header: string, inputs, buttons = [];
    buttons.push({
      text: '適用', handler: (data) => {
        let sql: string;
        if (link.idx === this.user.links.length) {
          sql = "INSERT INTO t32link (uid,idx,media,na,url) VALUES ('" + this.user.id + "'," + link.idx + ",'" +
            data.media + "','" + data.na + "','" + data.url + "');";
        } else {
          sql = "UPDATE t32link SET media='" + data.media + "',na='" + data.na + "',url='" + data.url +
            "' WHERE uid='" + this.user.id + "' AND idx=" + link.idx;
        }
        this.php.get("owner/save", { sql: sql }).subscribe((res: any) => {
          if (res.msg === 'ok') {
            this.ui.pop("参照リンクを更新しました。");
            this.linkUpdate();
          } else {
            this.ui.alert(res.msg);
          }
        });
      }
    });
    if (link) {
      inputs = [
        { name: 'media', type: 'text', value: link.media, placeholder: link.media },
        { name: 'na', type: 'text', value: link.na, placeholder: link.na },
        { name: 'url', type: 'url', value: link.url, placeholder: link.url },
      ];
      header = "参照リンク編集";
      buttons.push({
        text: '削除', handler: () => {
          let sql = "DELETE FROM t32link WHERE uid='" + this.user.id + "' AND idx=" + link.idx;
          if (link.idx < this.user.links.length - 1) {
            sql += ";\nUPDATE t32link SET idx=idx-1 WHERE uid='" + this.user.id + "' AND idx>" + link.idx;
          }
          this.php.get("owner/save", { sql: sql }).subscribe((res: any) => {
            if (res.msg === 'ok') {
              this.ui.pop("参照リンクを削除しました。");
              this.linkUpdate();
            } else {
              this.ui.alert(res.msg);
            }
          });
        }
      });
    } else {
      link = {
        media: "twitter、youtube、blogなど",
        na: "アカウント名、チャンネル名、サイト名など",
        url: "https://example.com",
        idx: this.user.links.length
      };
      inputs = [
        { name: 'media', type: 'text', placeholder: link.media },
        { name: 'na', type: 'text', placeholder: link.na },
        { name: 'url', type: 'url', placeholder: link.url },
      ];
      header = "新しい参照リンク";
    }
    const alert = await this.alertController.create({
      header: header,
      inputs: inputs,
      buttons: buttons
    });
    await alert.present();
  }
  linkUpdate() {
    this.php.get("user", { link: this.user.id }).subscribe((links: any) => {
      this.user.links = links;
    });
  }
  close() {
    this.location.back();
  }
}