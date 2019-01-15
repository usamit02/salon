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
  roomSubject = new Subject<Array<Room>>();
  roomState = this.roomSubject.asObservable();
  constructor() { }

  login(user: User) {
    if (this.user.id !== user.id) {
      this.user = user;
      this.userSubject.next(user);
    }
  }
  readRooms(rooms) {
    this.rooms = rooms;
    this.roomSubject.next(rooms)
  }
}

export class User {
  id: string = "";
  na: string = "";
  avatar: string = "";
  p: number = 0;
}
export class Room {
  id: number = 1;
  na: string = "";
  discription: string = "";
  parent: number = 0;
  idx: number = 0;
  folder: boolean = false;
  chat: boolean = true;
  story: boolean = false;
  plan: number = 0;
}