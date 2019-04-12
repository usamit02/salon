import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import { RoomComponent } from './room/room.component';
import { NotifyComponent } from './notify/notify.component';
import { DetailComponent } from './detail/detail.component';
import { VideoComponent } from './video/video.component';
const routes: Routes = [
  { path: '', redirectTo: 'home/room/2', pathMatch: 'full' },
  {
    //path: 'home', loadChildren: './home/home.module#HomePageModule',
    path: 'home', component: MainComponent,
    children: [
      { path: 'room/:id', component: RoomComponent },
      { path: 'video/:id/:rtc', component: VideoComponent }
    ]
  },
  //{ path: 'home/:id', loadChildren: './home/home.module#HomePageModule' },
  { path: 'notify', component: NotifyComponent },
  { path: 'detail/:no', component: DetailComponent },
  { path: 'video/:id/:rtc', component: VideoComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
