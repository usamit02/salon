import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  name: 'chatdate'
})
export class ChatdatePipe implements PipeTransform {
  constructor() { }
  transform(date: Date, type: string = "chat"): string {
    switch (type) {
      case 'chat':
        const diff = new Date().getTime() - date.getTime();
        if (diff < 600000) {//10分以内
          return Math.floor(diff / 60000) + "分前";
        }
        const h = date.getHours();
        const m = date.getMinutes();
        let todate = new Date();
        let yesterdate = new Date();
        todate.setHours(0, 0, 0, 0);//今日の0時  
        yesterdate.setDate(todate.getDate() - 1);
        if (date > yesterdate) {
          if (date > todate) {
            return "今日 " + h + "時" + m + "分";
          } else {
            return "昨日 " + h + "時" + m + "分";
          }
        }
        const M = date.getMonth() + 1;
        const d = date.getDate();
        return M + "月" + d + "日 " + h + "時" + m + "分";

      default: throw new Error(`Invalid safe type specified: ${type}`);
    }
  }

}