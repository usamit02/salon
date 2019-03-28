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
      case 'imgorg': return 'https://firebasestorage.googleapis.com/v0/b/blogersguild1.appspot.com/o/'
        + encodeURIComponent("room/" + this.data.room.id + "/org/" + value) + '?alt=media';
      case 'youtubeimg': return 'http://i.ytimg.com/vi/' + value + '/default.jpg';
      case 'youtube': return 'https://youtube.com/watch?v=' + value;
      case 'twitter': return '<blockquote class="twitter-tweet" data-conversation="none"><a href="https://'
        + value + '"></a></blockquote>';

      default: throw new Error(`Invalid safe type specified: ${type}`);
    }
  }

}