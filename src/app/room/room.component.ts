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
  currentY: number;
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore,
    private php: PhpService) { }
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
    this.chatLoad(false);
    if (!this.chatSb) {
      this.chatSb = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref =>
        ref.where('upd', '>', this.cursor)).valueChanges().subscribe(data => {
          if (data.length) {
            this.chats.unshift(data[data.length - 1]);
          }
        });
    }
  }
  chatLoad(e) {
    this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.orderBy('upd', 'desc')
      .where('upd', '<', this.cursor).limit(20)).get().subscribe(query => {
        let docs = [];
        query.forEach(doc => {
          docs.push(doc.data());
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
  onScroll(e) {
    this.currentY = e.detail.currentY;
  }
  onScrollEnd(e) {
    if (this.data.user.id) {
      let chats = e.currentTarget.children[0].children;
      for (let i = 1; i < chats.length; i++) {
        if (chats[i].offsetTop > this.currentY + e.currentTarget.scrollHeight - 30) {
          if (this.room.csd < this.chats[i - 1].upd) {
            this.room.csd = this.chats[i - 1].upd;
            this.php.get("room", { uid: this.data.user.id, rid: this.room.id, csd: this.room.csd });
          }
          console.log("readed=" + this.chats[i - 1].upd.toDate());
          break;
        }
      }
    }
  }
  ngOnDestroy() {
    if (this.chatSb) {
      this.chatSb.unsubscribe;
    }
  }
}
