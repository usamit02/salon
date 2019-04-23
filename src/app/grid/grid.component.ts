import { Component, OnInit, OnChanges, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { DataService } from '../provider/data.service';
@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit, OnChanges {
  constructor(private router: Router, private socket: Socket, private data: DataService, ) { }
  @Input() rooms;
  online = {};
  ngOnInit() {
    this.socket.removeListener("nums");
    this.socket.on("nums", res => {
      for (let i = 0; i < res.length; i++) {
        this.online[res[i].id] = res[i].num;
      }
    });
  }
  ngOnChanges() {
    let childs;
    let rooms = this.rooms.map(room => {
      childs = [];
      addRooms(room.id, this.data.fullRooms);
      return { id: room.id, children: childs };
    });
    this.socket.emit("nums", rooms);
    function addRooms(parent, rooms) {
      let children = rooms.filter(room => { return room.parent === parent; });
      for (let i = 0; i < children.length; i++) {
        addRooms(children[i].id, rooms);
        childs.push(children[i].id);
      }
    }
  }
  joinRoom(room) {
    this.router.navigate(['/home/room', room.id]);
  }
  ownerClick(no) {
    this.router.navigate(['/detail', no]);
  }
}
