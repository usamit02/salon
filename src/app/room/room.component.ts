import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Room, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  room: Room;
  chats = [];//: Observable<any[]>;
  chatEnd: Date = new Date();
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore) { }
  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.room = new Room;
        this.readChat();
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
    this.readChat();
  }
  readChat() {
    this.data.joinRoom(this.room);
    let chat = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.orderBy('upd'));
    chat.valueChanges().subscribe(chats => {
      this.chats = chats;
    });



    /*
    chat.get().subscribe(data => {
      
    })
    chat.stateChanges(['added']).subscribe(action => {
        let a = action;
      });
    subscribe(chats => {
      this.chats = chats;
      let chatEnd = this.chats[0].upd;
      let chatStart = this.chats[this.chats.length - 1].upd;
      console.log(chatStart + "から" + chatEnd);
      
    });*/


    //, ref => ref.orderBy('upd', 'desc').startAt(this.chatEnd).limit(20)).


  }
}
