import { Pipe, PipeTransform } from '@angular/core';
import { DataService } from '../provider/data.service';
@Pipe({
  name: 'media'
})
export class MediaPipe implements PipeTransform {
  constructor(private data: DataService) { }
  transform(value: string, type: string): string {
    switch (type) {
      case 'img': return 'https://firebasestorage.googleapis.com/v0/b/blogersguild1.appspot.com/o/'
        + encodeURIComponent("room/" + this.data.room.id + "/" + value) + '?alt=media';

      default: throw new Error(`Invalid safe type specified: ${type}`);
    }
  }

}