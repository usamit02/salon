import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit {
  constructor(private router: Router) { }
  @Input() rooms;
  ngOnInit() {
  }
  joinRoom(room) {
    this.router.navigate(['/home/room', room.id]);
  }
  ownerClick(no) {
    this.router.navigate(['/detail', no]);
  }
}
