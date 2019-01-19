import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Room, DataService } from './provider/data.service';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
const FOLDER = { id: 1, na: "ブロガーズギルド", discription: "", idx: 0, chat: false, story: false, plan: 0, parent: 1, folder: true, bookmark: false, };
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  allRooms: Array<Room> = [];
  rooms: Array<Room> = [];
  folder: Room = FOLDER;
  bookmk: boolean = false;
  members = [];
  constructor(
    private platform: Platform, private splashScreen: SplashScreen, private statusBar: StatusBar,
    private data: DataService, private router: Router, private socket: Socket
  ) {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
  ngOnInit() {
    this.data.roomsState.subscribe((rooms: any) => {
      this.allRooms = rooms;
      this.rooms = this.allRooms.filter(room => room.parent === this.folder.id);
    });
    this.socket.connect();
    this.socket.on("join", users => {
      console.log(users[0].na + "_" + users[0].rtc);
      this.members = users;
    });
  }
  joinRoom(room) {
    if (room.folder) {
      this.rooms = this.allRooms.filter(r => r.parent === room.id);
      this.folder = room;
    }
    this.router.navigate(['/home/room', room.id]);
  }
  retRoom() {
    if (this.folder.id === 1 && this.data.user.id) {
      this.bookmk = !this.bookmk;
    }
    if (this.bookmk) {
      this.rooms = this.allRooms.filter(room => room.bookmark);
    } else {
      let folder = this.allRooms.filter(room => room.id === this.folder.parent);
      this.folder = folder.length ? folder[0] : FOLDER;
      this.rooms = this.allRooms.filter(room => room.parent === this.folder.id);
    }
  }
}
