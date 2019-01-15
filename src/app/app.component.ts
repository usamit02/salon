import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { PhpService } from './provider/php.service';
import { User, DataService } from './provider/data.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  allRooms = [];
  rooms;
  folder = { id: 1, na: "ブロガーズギルド", parent: 1, folder: 0 };
  bookmk: boolean = false;
  user: User;
  constructor(
    private platform: Platform, private splashScreen: SplashScreen, private statusBar: StatusBar,
    private php: PhpService, private data: DataService, private router: Router,
  ) {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
  ngOnInit() {
    this.user = new User;
    this.data.userState.subscribe((user: User) => {
      this.user = user;
      this.readRooms();
    });
  }
  readRooms() {
    this.php.get("room", { uid: this.user.id }).subscribe((res: any) => {
      this.allRooms = res;
      this.data.readRooms(res);
      if (this.bookmk) {
        this.rooms = res.filter(r => { if (r.bookmark === 1) return true; });
      } else {
        this.rooms = res.filter(r => { if (r.parent === this.folder.id) return true; });
      }
    });
  }
  joinRoom(id) {
    this.router.navigate(['/home/room', id]);
  }
}
