import { Component, OnInit } from '@angular/core';
import { PhpService } from '../provider/php.service';
import { User, DataService } from '../provider/data.service';
import { UiService } from '../provider/ui.service';
@Component({
  selector: 'app-notify',
  templateUrl: './notify.component.html',
  styleUrls: ['./notify.component.scss']
})
export class NotifyComponent implements OnInit {
  blocks: Array<User> = [];
  unblocks = [];
  notify = { mail: String, direct: Boolean, mention: Boolean }
  constructor(private php: PhpService, private data: DataService, private ui: UiService) { }

  ngOnInit() {
    this.cancel();
  }
  unblock() {
    let unblocks = this.unblocks;
    let blocks = this.blocks;
    let a = 0;
  }
  submit() {
    this.php.get("notify", { uid: this.data.user.id, notify: JSON.stringify(this.notify), unblocks: JSON.stringify(this.unblocks) }, "保存中").then(res => {
      this.ui.pop("設定保存しました。");
      let buf = JSON.stringify(this.blocks);
      this.blocks = [];
      let blocks = JSON.parse(buf);
      this.blocks = blocks.filter(block => {
        let ret = true;
        for (let i = 0; i < this.unblocks.length; i++) {
          if (block.id === this.unblocks[i]) ret = false; break;
        }
        return ret;
      });
      this.unblocks = [];
    });
  }
  cancel() {
    this.php.get("notify", { uid: this.data.user.id }).then(res => {
      this.notify = res['notify'];
      this.blocks = res['blocks'];
    });
  }
}
