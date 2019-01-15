import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
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
  constructor() { }

  login(user: User) {
    if (this.user.id !== user.id) {
      this.user = user;
      this.userSubject.next(user);
      console.log("login");
    }
  }
  logout() {
    if (this.user.id) {
      this.user = new User;
      this.userSubject.next(this.user);
      console.log("logout");
    }
  }
  readRooms(rooms) {
    this.rooms = rooms;
    this.roomsSubject.next(rooms);
    console.log('readRooms');
  }
  joinRoom(room: Room) {
    this.room = room;
    this.roomSubject.next(room);
    console.log('joinRoom:' + room.na);
  }
}

export class User {
  id: string = "";
  na: string = "";
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
}