import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';
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
  @ViewChild(IonContent) content: IonContent;
  room: Room;
  chats = [];
  top: Date = new Date();
  bottom: Date = new Date();
  stopLoad: boolean;
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
    let room = rooms.filter(room => room.id == id);
    this.room = room.length ? room[0] : new Room;
    this.chatInit();
  }
  chatInit() {
    this.data.joinRoom(this.room);
    this.chatLoad(false, 'top');
  }
  chatLoad(e, direction) {
    if (this.stopLoad) {
      if (e) e.target.complete();
      this.stopLoad = false;
      return;
    };
    this.stopLoad = true;
    let sign: string, cursor: Date;
    if (direction === 'top') {
      sign = '<='; cursor = this.top;
    } else {
      sign = '>='; cursor = this.bottom;
    }
    this.chatSnap(ref => ref.orderBy('upd', 'desc').where('upd', sign, cursor).limit(20)).subscribe(data => {
      if (data.length) {
        console.log("direction:" + direction + "  top:" + data[data.length - 1].txt + " bottom:" + data[0].txt);
        this.top = data[data.length - 1].upd.toDate();
        this.bottom = data[0].upd.toDate();
        this.stopLoad = true;
        this.chats = [];
        this.chats.push(...data.reverse());
        this.data.scroll(direction);
        /* if (direction === 'top') {
          this.chats.unshift(...data.reverse());
        } else {
          let len = this.chats.length - 2;
          this.chats.push(...data.reverse());
        }*/
      } else {
        //if (e) e.target.disabled = true;
      }
      if (e) e.target.complete();
      let chats = this.chats;
      setTimeout(() => {
        this.stopLoad = false;
      }, 500);
    });
  }
  chatSnap(ref): Observable<any[]> {
    return this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref).snapshotChanges().
      pipe(map(actions => {
        return actions.map(a => {
          const data = a.payload.doc.data();
          return { ...data };
        });
      }));
  }
}
