import { Component, OnInit } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';
import { DataService } from '../provider/data.service';

@Component({
  selector: 'app-member',
  templateUrl: './member.component.html',
  styleUrls: ['./member.component.scss']
})
export class MemberComponent implements OnInit {
  member;
  constructor(private navParams: NavParams, private pop: PopoverController, private data: DataService) { }
  ngOnInit() {
    this.member = this.navParams.get('member');
  }
  mention() {
    this.data.mention(this.member);
    this.close();
  }
  dm() {

  }
  close() {
    this.pop.dismiss();
  }
}
