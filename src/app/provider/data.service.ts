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
  rooms = [];
  roomsSubject = new Subject<Array<Room>>();
  roomsState = this.roomsSubject.asObservable();
  room = new Room();
  roomSubject = new Subject<Room>();
  roomState = this.roomSubject.asObservable();
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
}