import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Room, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  room: Room;
  _chats: BehaviorSubject<any[]>;
  chatsOb: Observable<any[]>;
  chats = [];
  cursor;//Date = new Date();
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore) { }
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
    this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref =>
      ref.where('upd', '>', this.cursor)).valueChanges().subscribe(data => {
        if (data.length) {
          this.chats.unshift(data[data.length - 1]);
        }
      });
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
}
