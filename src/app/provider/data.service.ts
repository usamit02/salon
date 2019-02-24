import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { PhpService } from './php.service';
@Injectable({
  providedIn: 'root'
})
export class DataService {
  user = new User();
  userSubject = new Subject<User>();
  userState = this.userSubject.asObservable();
  rooms: Array<Room> = [];
  roomsSubject = new Subject<Array<Room>>();
  roomsState = this.roomsSubject.asObservable();
  room = new Room();
  roomSubject = new Subject<Room>();
  roomState = this.roomSubject.asObservable();
  mentionSubject = new Subject();
  mentionState = this.mentionSubject.asObservable();
  mentions = {};
  mentionRooms: Array<any> = [];
  mentionRoomsSubject = new Subject<Array<any>>();
  mentionRoomsState = this.mentionRoomsSubject.asObservable();
  constructor(private php: PhpService, ) { }
  login(user) {
    if (this.user.id !== user.uid) {
      this.php.get("user", { uid: user.uid, na: user.displayName, avatar: user.photoURL }).subscribe((res: any) => {
        if (res.msg !== "ok") {
          alert(res.msg);
          this.user = new User;
        } else {
          this.user = { id: res.id, na: res.na, avatar: res.avatar, p: res.p };
        }
        this.userSubject.next(this.user);
        console.log("login");
        this.readRooms();
      });
    }
  }
  logout() {
    if (this.user.id) {
      this.user = new User;
      this.userSubject.next(this.user);
      console.log("logout");
      this.readRooms();
    }
  }
  readRooms() {
    this.php.get("room", { uid: this.user.id }).subscribe((rooms: any) => {
      this.rooms = rooms;
      this.roomsSubject.next(rooms);
      console.log('readRooms');
    });
  }
  joinRoom(room: Room) {
    this.room = room;
    this.roomSubject.next(room);
    console.log('joinRoom:' + room.na);
  }
  mention(member) {
    this.mentionSubject.next(member);
  }
  mentionRoom(mentions) {
    let mentionCounts = {}; this.mentions = {};
    for (let i = 0; i < mentions.length; i++) {
      let rid = mentions[i].rid;
      mentionCounts[rid] = mentionCounts[rid] ? mentionCounts[rid] + 1 : 1;
      this.mentions[rid] = true;
    }
    Object.keys(this.mentions).forEach((key) => {
      this.mentions[key] = mentions.filter(mention => mention.rid === Number(key));
    });
    this.mentionRooms = [];
    Object.keys(mentionCounts).forEach((key) => {
      let rooms = this.rooms.filter(room => room.id === Number(key));
      if (rooms.length) {
        this.mentionRooms.push({ id: rooms[0].id, na: rooms[0].na, count: mentionCounts[key] });
      }
    });
    this.mentionRoomsSubject.next(this.mentionRooms);
  }
  dateFormat(date = new Date()) {//MySQL用日付文字列作成'yyyy-M-d H:m:s'
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var h = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    return y + "-" + m + "-" + d + " " + h + ":" + min + ":" + sec;
  }
}

export class User {
  id: string = "";
  na: string = "ログインして";
  avatar: string = "";
  p: number = 0;
}
export class Room {
  id: number = 2;
  na: string = "メインラウンジ";
  discription: string = "";
  parent: number = 0;
  idx: number = 0;
  folder: boolean = false;
  chat: boolean = true;
  story: boolean = false;
  plan: number = 0;
  bookmark: boolean = false;
  csd: Date;
}
export class Member {
  id: string = "";
  na: string = "";
  avatar: string = "";
  p?: number = 0;
}