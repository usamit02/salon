import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http'
import { SocketIoModule } from 'ngx-socket-io';
import { MentionModule } from 'angular-mentions/mention';
import { socketConfig, firebaseConfig } from '../environments/environment';
//import { AngularFireModule } from 'angularfire2';
//import { AngularFireAuthModule } from 'angularfire2/auth';
//import { AngularFirestoreModule } from '@angular/fire/firestore';
//import { AngularFireStorageModule } from 'angularfire2/storage';
import { AngularFireModule } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { FormsModule } from '@angular/forms';
import { PhpService } from './provider/php.service';
import { DataService } from './provider/data.service';
import { UiService } from './provider/ui.service';
import { RoomComponent } from './room/room.component';
import { MainComponent } from './main/main.component';
import { MemberComponent } from './member/member.component';
import { SafePipe } from './pipe/safe.pipe';
import { MediaPipe } from './pipe/media.pipe';
import { ChatdatePipe } from './pipe/chatdate.pipe';
import { StoryComponent } from './story/story.component';
import { NotifyComponent } from './notify/notify.component';
import { DetailComponent } from './detail/detail.component';
import { GridComponent } from './grid/grid.component';
import { VideoComponent } from './video/video.component';
@NgModule({
  declarations: [AppComponent, RoomComponent, MainComponent, MemberComponent, SafePipe, MediaPipe, ChatdatePipe, StoryComponent, NotifyComponent, DetailComponent, GridComponent, VideoComponent,],
  entryComponents: [MemberComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    HttpClientModule,
    AppRoutingModule,
    SocketIoModule.forRoot(socketConfig),
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    FormsModule,
    MentionModule,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    PhpService,
    DataService,
    UiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

}
