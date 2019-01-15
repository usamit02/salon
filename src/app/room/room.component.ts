import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Room, DataService } from '../provider/data.service';
import * as firebase from 'firebase';
//const ROOM = { id: 2, na: "メインラウンジ", discription: "", idx: 0, plan: 0, allow: 1, parent: 1, folder: false, bookmark: 0, chat: true, story: false };
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  room: Room = new Room;
  chats = [];
  constructor(private route: ActivatedRoute, private data: DataService, ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.room = new Room;
        this.readChat();
      } else if (this.data.rooms.length) {
        this.readRooms(this.data.rooms, params.id);
      } else {
        this.data.roomsState.subscribe(rooms => {
          this.readRooms(rooms, params.id);
        });
      }
    });
  }
  readRooms(rooms, id) {
    let room = rooms.filter(room => { return room.id == id });
    if (room.length) {
      this.room = room[0];
      this.readChat();
    }
  }
  readChat() {
    this.data.joinRoom(this.room);
    if (this.room.chat) {
      firebase.database().ref('chat/' + this.room.id).on('value', resp => {
        if (resp) {
          this.chats = [];
          resp.forEach(childSnapshot => {
            const chat = childSnapshot.val();
            chat.key = childSnapshot.key;
            this.chats.push(chat);
          });
        }
      });
    }
  }
}
