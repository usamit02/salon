import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { DataService } from '../provider/data.service';
import * as firebase from 'firebase';
const ROOM = { id: 2, na: "メインラウンジ", allow: 1, parent: 1, folder: 0, bookmark: 0, chat: true, story: false };
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  room = ROOM;
  chats = [];
  constructor(private route: ActivatedRoute, private data: DataService, ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.room = ROOM;
      } else if (this.data.rooms.length) {
        let room = this.data.rooms.filter(room => { return room.id == params.id });
        this.room = room[0];
      }
    });
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
