import { Component, OnInit, Input } from '@angular/core';
import { PhpService } from '../provider/php.service';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  allRooms = [];
  rooms = [];
  room = { id: 2, na: "メインラウンジ", allow: 1, parent: 1, folder: 0, bookmark: 0 };
  folder = { id: 1, na: "ブロガーズギルド", parent: 1, folder: 0 };
  bookmk: boolean = false;
  @Input() user;
  constructor(private php: PhpService) { }

  ngOnInit() {
    this.readRooms();
  }
  readRooms() {
    let uid = this.user ? this.user.id : "0";
    this.php.get("room.php", { uid: this.user.id }).subscribe((data: any) => {
      this.allRooms = data;
      if (this.bookmk) {
        this.rooms = data.filter(r => { if (r.bookmark === 1) return true; });
      } else {
        this.rooms = data.filter(r => { if (r.parent === this.folder.id) return true; });
      }
    });
  }
}
