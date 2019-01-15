import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { HomePage } from './home.page';

import { FormsModule } from '@angular/forms';
@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ])
  ],
  declarations: [HomePage]
})
export class HomePageModule {





}
