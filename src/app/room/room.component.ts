import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Room, User, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { PhpService } from '../provider/php.service';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
  room: Room;
  chats = [];
  chatsUsers: Array<User> = [];
  chatSb: Subscription;
  chatTop: string = "";
  readedFlag: boolean;
  unread: Date;
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
    this.csdWrite(new Date());
    this.chats = [];
    this.data.currentY = 0;
    let infineteScroll = this.infiniteScroll;
    this.infiniteScroll.disabled = true;
    if (this.room.csd) {
      this.data.readedFlag = true;
      this.chatLoad(false, "bottom");
    } else {
      this.data.readedFlag = false;
      this.chatLoad(false, "top");
    }
    if (this.chatSb) this.chatSb.unsubscribe();
    this.chatSb = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref =>
      ref.where('upd', '>', new Date())).valueChanges().subscribe(data => {
        if (data.length) {
          this.chats.unshift(data[data.length - 1]);
          if (this.data.currentY === 0) {
            this.csdWrite(data[0].upd.toDate());
          }
        }
      });
  }
  chatLoad(e, direction) {
    var cursor: Date; let db; this.chatTop = "";
    if (this.chats.length) {
      cursor = direction === 'top' ? this.chats[this.chats.length - 1].upd.toDate() : this.chats[0].upd.toDate();
    } else {
      cursor = this.room.csd ? new Date(this.room.csd) : new Date();
    }
    if (direction === 'bottom') {
      db = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.
        where('upd', ">", cursor).orderBy('upd', 'asc').limit(20));
    } else {
      db = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.
        where('upd', "<", cursor).orderBy('upd', 'desc').limit(20));
    }
    this.chatsUsers.unshift(this.data.user);
    db.get().subscribe(query => {
      let docs = [];
      query.forEach(doc => {
        var d = doc.data();
        if (this.data.readedFlag) {
          if (d.upd.toDate().getTime() <= new Date(this.room.csd).getTime()) {
            d.readed = true;
            this.data.readedFlagChange(false);
          }
        }
        docs.push(d);
      });
      let chats = this.chats;
      let chatsUser = this.chatsUsers.pop();
      if (chatsUser.id === this.data.user.id) {
        if (docs.length) {
          let upd = direction === 'top' ? docs[0].upd.toDate().getTime() : docs[docs.length - 1].upd.toDate().getTime();
          let csd = cursor.getTime();
          if (direction === "bottom") docs = docs.reverse();
          // if (direction === 'top' && upd < csd || direction === 'bottom' && upd > csd) {
          if (!this.chats.length) {
            setTimeout(() => {
              if (direction === "top") {
                this.data.scroll("bottom");
              } else {
                this.chatTop = "既読メッセージを表示↑";
                this.data.scroll("bottomOne")
              }
              setTimeout(() => {
                this.infiniteScroll.disabled = false;
              }, 3000);
            }, 1000);
          }
          if (direction === 'top') {
            this.chats.push(...docs);
            /*if (this.chats.length > 50) {
              this.chats = this.chats.slice(40);
              this.infiniteScrolls.last.disabled = false;
            }*/
          } else {
            this.chats.unshift(...docs);
            /*if (this.chats.length > 50) {
              this.chats = this.chats.slice(0, 40);
              this.infiniteScrolls.first.disabled = false;
            }*/
          }
          // }
          if (e) e.target.complete();
        } else {
          if (e) e.target.disabled = true;
          this.data.readedFlagChange(false);
          if (!this.chats.length) this.chatTop = "一番乗りだ！";
        }
      }
    });
  }
  csdWrite(csd: Date) {
    if (this.data.user.id) {
      //this.php.get("room", { uid: this.data.user.id, rid: this.room.id, csd: this.data.dateFormat(csd) }).subscribe(dummy => { });
    }
  }
  ngOnDestroy() {
    if (this.chatSb) {
      this.chatSb.unsubscribe();
    }
  }

}
