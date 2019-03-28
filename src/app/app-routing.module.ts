import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import { RoomComponent } from './room/room.component';
import { NotifyComponent } from './notify/notify.component';
const routes: Routes = [
  { path: '', redirectTo: 'home/room/2', pathMatch: 'full' },
  {
    //path: 'home', loadChildren: './home/home.module#HomePageModule',
    path: 'home', component: MainComponent,
    children: [{ path: 'room/:id', component: RoomComponent }]
  },
  //{ path: 'home/:id', loadChildren: './home/home.module#HomePageModule' },
  { path: 'notify', component: NotifyComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
