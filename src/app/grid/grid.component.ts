import { Component, OnInit, Input } from '@angular/core';
import { DataService } from '../provider/data.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit {
  @Input() rooms;
  constructor(private data: DataService, private router: Router) { }

  ngOnInit() {
  }
  joinRoom(room) {
    this.data.joinRoom(room);
  }
  ownerClick(no) {
    this.router.navigate(['/detail', no]);
  }
}
