import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { PhpService } from './php.service';
import { Socket } from 'ngx-socket-io';
import { PHPURL } from '../../environments/environment';
import { FOLDER } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class DataService {
  user = new User();
  userSubject = new Subject<User>();
  userState = this.userSubject.asObservable();
  allRooms: Array<Room> = [];
  room = new Room();
  roomSubject = new Subject<Room>();
  roomState = this.roomSubject.asObservable();
  rooms: Array<Room> = [];
  folder: Room = FOLDER;
  mentionSubject = new Subject();
  popMemberSubject = new Subject();
  mentions = {};
  mentionRooms: Array<any> = [];
  mentionRoomsSubject = new Subject<Array<any>>();
  directUser: User;
  rtc: string = "";
  rtcSubject = new Subject<string>();
  constructor(private php: PhpService, private socket: Socket) { }
  login(user) {
    if (this.user.id !== user.uid) {
      this.php.get("user", { uid: user.uid, na: user.displayName, avatar: user.photoURL }).subscribe((res: any) => {
        if (res.msg === "ok") {
          this.user = res.user;
        } else {
          alert(res.msg);
          this.user = new User;
        }
        this.userSubject.next(this.user);
        this.readRooms();
      });
    }
  }
  logout() {
    if (this.user.id) {
      this.user = new User;
      this.userSubject.next(this.user);
      this.socket.emit('logout');
      this.readRooms();
    }
  }
  readRooms(): Promise<Array<Room>> {
    return new Promise((resolve, reject) => {
      this.php.get("room", { uid: this.user.id }).subscribe((rooms: Array<Room>) => {
        this.allRooms = rooms;
        this.rooms = rooms.filter(room => { return room.parent === this.folder.id });
        resolve(rooms);
      });
    });
  }
  joinRoom(room: Room) {
    let user = { id: this.user.id, na: this.user.na, avatar: this.user.avatar, no: this.user.no, auth: room.auth };
    this.socket.emit('join', { newRoomId: room.id, oldRoomId: this.room.id, user: user });
    if (room.folder) {
      this.rooms = this.allRooms.filter(r => { return r.parent === room.id; });
      this.folder = room;
    }
    this.room = room;
    this.roomSubject.next(room);
    this.rtc = "";
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
      let rooms = this.allRooms.filter(room => room.id === Number(key));
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
  na: string = "ビジター";
  avatar: string = PHPURL + "img/avatar.jpg";
  p?: number = 0;
  no?: number = 0;
  upd?: Date;
  rev?: Date;
  direct?: string;
}
export class Room {
  id: number = 2;
  na: string = "メインラウンジ";
  discription?: string = "";
  parent?: number = 0;
  lock?: number = 0;
  shut?: number = 0;
  idx?: number = 0;
  folder?: boolean = false;
  chat?: boolean = true;
  story?: boolean = false;
  plan?: number = 0;
  bookmark?: boolean = false;
  csd?: Date;
  upd?: Date;
  new?: boolean = false;
  auth?: number = 0;
  count?: number = 0;
  uid?: string = "";
  img?: number = 0;
}