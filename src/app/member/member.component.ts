import { Component, OnInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
@Component({
  selector: 'app-member',
  templateUrl: './member.component.html',
  styleUrls: ['./member.component.scss']
})
export class MemberComponent implements OnInit {
  userX: string;
  members = [];
  constructor(private socket: Socket) { }

  ngOnInit() {
    this.socket.connect();
    this.socket.on("join", users => {
      console.log(users[0].name + "_" + users[0].rtc);
      this.members = users;
    });
    this.socket.on("typing", name => {
      //this.session.typing(name);
      //this.session.clearTyping();
    });
    this.socket.on("chat", chat => {
      //this.session.chat(chat);
      //this.session.clearChat();
    });
  }

}
