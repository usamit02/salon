import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-img',
  templateUrl: './img.component.html',
  styleUrls: ['./img.component.scss']
})
export class ImgComponent implements OnInit {
  @Input() url: string;

  constructor() { }

  ngOnInit() {
    console.log("imgModal pop!")
  }

}
