import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Room, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { PhpService } from '../provider/php.service';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  @ViewChild(IonContent) content: IonContent;
  room: Room;
  chats = [];
  cursor: Date = new Date();
  chatSb: Subscription;
  csd: Date;
  readedFlag: boolean;
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore
    , private php: PhpService) { }
  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.room = new Room;
        this.chatInit();
      } else if (this.data.rooms.length) {
        this.readRooms(this.data.rooms, params.id);
      } else {
        this.data.readRooms();
        this.data.roomsState.subscribe(rooms => {
          this.readRooms(rooms, params.id);
        });
      }
    });
  }
  readRooms(rooms, id) {
    let room = rooms.filter(room => { return room.id == id });
    this.room = room.length ? room[0] : new Room;
    this.chatInit();
  }
  chatInit() {
    this.data.joinRoom(this.room);
    this.cursor = new Date();
    this.csdWrite(new Date());
    this.data.currentY = 0;
    this.readedFlag = true;
    this.chatLoad(false);
    if (!this.chatSb) {
      this.chatSb = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref =>
        ref.where('upd', '>', this.cursor)).valueChanges().subscribe(data => {
          if (data.length) {
            this.chats.unshift(data[data.length - 1]);
            if (this.data.currentY === 0) {
              this.csdWrite(data[0].upd.toDate());
            }
          }
        });
    }
  }
  chatLoad(e) {
    this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.orderBy('upd', 'desc')
      .where('upd', '<', this.cursor).limit(20)).get().subscribe(query => {
        let docs = [];
        query.forEach(doc => {
          var d = doc.data();
          if (this.room.csd && this.readedFlag) {
            let upd = d.upd.toDate();
            let csd = new Date(this.room.csd);
            if (upd <= csd) {
              d.readed = true;
              this.readedFlag = false;
            }
          }
          docs.push(d);
        });
        if (docs.length) {
          this.cursor = docs[docs.length - 1].upd.toDate();
          this.chats.push(...docs);
          if (e) e.target.complete();
        } else {
          if (e) e.target.disabled = true;
        }
      });
  }
  csdWrite(csd: Date) {
    if (this.data.user.id) {
      this.php.get("room", { uid: this.data.user.id, rid: this.room.id, csd: this.data.dateFormat(csd) }).subscribe(dummy => { });
    }
  }
  ngOnDestroy() {
    if (this.chatSb) {
      this.chatSb.unsubscribe;
    }
  }

}
