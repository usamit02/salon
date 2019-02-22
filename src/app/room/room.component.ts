import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Room, User, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { PhpService } from '../provider/php.service';
declare var $;
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  @ViewChild('chatscontent') content: IonContent;
  @ViewChild('top') top: IonInfiniteScroll; @ViewChild('btm') btm: IonInfiniteScroll;
  chats = [];
  chatsUsers: Array<User> = [];
  topMsg: string = "";
  btmMsg: string = "";
  readed: boolean;
  newChatDoc: number = 0;
  mentionTop: number = 0;
  mentionBtm: number = 0;
  currentY: number = 0;
  mentionRoomSb: Subscription;
  chatSb: Subscription;
  paramsSb: Subscription;
  roomSb: Subscription;
  userSb: Subscription;
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore
    , private php: PhpService) { }
  ngOnInit() {
    this.roomSb = this.data.roomState.subscribe(room => {
      if (this.data.user.id) {
        setTimeout(() => {
          let content = <any>document.getElementById('chatscontent');
          let chats = content.children[2].children;
          var footer = <any>document.getElementById('footer');
          if (chats.length) {
            if (chats[chats.length - 1].offsetTop + chats[chats.length - 1].offsetHeight > footer.offsetTop) {
              this.onScrollEnd({ currentTarget: content });
            } else {
              var upds = [];
              for (let i = 0; i < chats.length; i++) {
                upds.push(new Date(chats[i].children[0].innerHTML))
              }
              this.deleteMention(upds);
            }
          }
        }, 3000);
      }
    });
    this.paramsSb = this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.data.room = new Room;
        this.data.joinRoom(this.data.room);
        this.chatInit();
      } else if (this.data.rooms.length) {
        this.readRooms(this.data.rooms, params.id);
      } else {
        this.data.readRooms();
        this.data.roomsState.subscribe(rooms => {
          this.readRooms(rooms, params.id);
        });
      }
    });

    this.userSb = this.data.userState.subscribe(user => {
      if (user.id) {
        /*
         this.db.collection('user').doc(this.user.id.toString()).collection('mention', ref => ref.orderBy('upd', 'desc')).get().subscribe(query => {
           let mentions = [];
           query.forEach(mention => {
             let data: any = {};
             data = mention.data();
             data.id = mention.id;
             mentions.push(data);
           });
           this.loadMentionRooms(mentions);
         });*/
        this.mentionRoomSb = this.db.collection('user').doc(this.data.user.id.toString()).collection('mention', ref => ref.orderBy('upd', 'desc')).
          snapshotChanges().subscribe((res: Array<any>) => {
            let data: any = {};
            let mentions = [];
            for (let i = 0; i < res.length; i++) {
              data = res[i].payload.doc.data();
              data.id = res[i].payload.doc.id;
              mentions.push(data);
            }
            this.data.mentionRoom(mentions);
          });
      }
    });
  }
  deleteMention(upds) {
    let mentions = this.data.mentions[this.data.room.id.toString()];
    if (mentions && mentions.length) {
      let upd0 = upds[0].getTime(); let upd9 = upds[upds.length - 1].getTime();
      let deleteMentions = mentions.filter(mention => {
        let mentionUpd = mention.upd.toDate().getTime();
        return upd0 <= mentionUpd && mentionUpd <= upd9;// console.log(upd0 + "<=" + mentionUpd + "<=" + upd9);        
      });
      for (let i = 0; i < deleteMentions.length; i++) {
        this.db.collection('user').doc(this.data.user.id.toString()).collection('mention').doc(deleteMentions[i].id).delete();
        console.log("メンション削除" + deleteMentions[i].id + ":" + upds[0] + "<=" + deleteMentions[i].upd.toDate() + ">=" + upds[upds.length - 1]);
        mentions = mentions.filter(mention => mention.id !== deleteMentions[i].id);
      }
      if (deleteMentions.length) {
        this.data.mentions[this.data.room.id] = mentions;
        let mentionRooms = this.data.mentionRooms.filter(mentionRoom => mentionRoom.id === this.data.room.id);
        mentionRooms[0].count -= deleteMentions.length;
        if (!mentionRooms[0].count) {
          this.data.mentionRooms = this.data.mentionRooms.filter(mentionRoom => mentionRoom.id !== this.data.room.id);
        }
        this.data.mentionRoomsSubject.next(this.data.mentionRooms);
      }
      let mentionTop = mentions.filter(mention => mention.upd.toDate().getTime() < upd0);
      this.mentionTop = mentionTop.length;
      let mentionBtm = mentions.filter(mention => mention.upd.toDate().getTime() > upd9);
      this.mentionBtm = mentionBtm.length;
    } else {
      this.mentionTop = 0; this.mentionBtm = 0;
    }
  }
  mentionTopBtm(mentions) {

  }
  readRooms(rooms, id) {
    let room = rooms.filter(room => { return room.id == id });
    this.data.room = room.length ? room[0] : new Room;
    this.data.joinRoom(this.data.room);
    this.chatInit();
  }
  chatInit() {
    this.chats = []; this.currentY = 0; this.readed = false; this.top.disabled = true; this.btm.disabled = true;
    this.chatLoad(false, this.data.room.csd ? "btm" : "top");
    if (this.chatSb) this.chatSb.unsubscribe();
    this.chatSb = this.db.collection('room').doc(this.data.room.id.toString()).collection('chat', ref =>
      ref.where('upd', '>', new Date())).valueChanges().subscribe(data => {
        if (data.length) {
          this.chats.unshift(data[data.length - 1]);
          setTimeout(() => {
            let content = <any>document.getElementById('chatscontent');
            let chats = content.children[2].children;
            let currentY = this.currentY + content.scrollHeight;
            let offsetTop = chats[chats.length - 1].offsetTop;
            if (this.currentY + content.scrollHeight > chats[chats.length - 1].offsetTop) {
              this.content.scrollToBottom(300);//this.data.scroll('btm');
              this.btmMsg = "";
              this.data.room.csd = data[0].upd.toDate();
              this.php.get("room", { uid: this.data.user.id, rid: this.data.room.id, csd: this.data.dateFormat(this.data.room.csd) }).subscribe(dummy => { });
            } else {
              //this.btmMsg = "新着メッセージを表示↓";
              this.newChatDoc += data.length;
            }
          }, 1000);
        }
      });
  }
  chatLoad(e, direction) {
    var cursor: Date; let db; this.topMsg = ""; this.btmMsg = "";
    const dbcon = this.db.collection('room').doc(this.data.room.id.toString());
    if (this.chats.length) {
      cursor = direction === 'top' ? this.chats[this.chats.length - 1].upd.toDate() : this.chats[0].upd.toDate();
    } else {
      cursor = this.data.room.csd ? new Date(this.data.room.csd) : new Date();
    }
    if (direction === 'top') {
      db = dbcon.collection('chat', ref => ref.where('upd', "<", cursor).orderBy('upd', 'desc').limit(20));
    } else {
      db = dbcon.collection('chat', ref => ref.where('upd', ">", cursor).orderBy('upd', 'asc').limit(20));
    }
    this.chatsUsers.unshift(this.data.user);
    db.get().subscribe(query => {
      let chatsUser = this.chatsUsers.pop();
      if (chatsUser.id !== this.data.user.id) return;
      let docs1 = docsPush(query, this);
      let limit = direction === 'btm' && !this.chats.length && docs1.length < 20 ? 20 - docs1.length : 0;
      if (!limit) { limit = 1; cursor = new Date("1/1/1900"); }
      db = dbcon.collection('chat', ref => ref.where('upd', "<=", cursor).orderBy('upd', 'desc').limit(limit));
      db.get().subscribe(query => {
        let docs2 = docsPush(query, this);
        if (direction === 'top') {
          this.chats.push(...docs1);
        } else {
          this.chats.push(...docs2);
          this.chats.unshift(...docs1.reverse());
        }
        let docs = docs1.concat(docs2);
        if (docs.length && this.chats.length === docs.length) {
          setTimeout(() => {
            if (direction === "top" || !docs1.length) {
              this.content.scrollToBottom(300);//this.data.scroll("btm");
              this.btmMsg = "";
            } else {
              if (docs2.length) {
                let content = <any>document.getElementById('chatscontent');
                let chats = content.children[2].children;//let chats = <any>document.getElementsByClassName('chat');
                let cursorTop: number = 0; let cursorHeight: number = 0;
                for (let i = 0; i < chats.length; i++) {
                  if (new Date(chats[i].children[0].innerHTML).getTime() >= cursor.getTime()) {
                    cursorTop = chats[i].offsetTop; cursorHeight = chats[i].offsetHeight; break;
                  }
                }
                if (chats[chats.length - 1].offsetTop + chats[chats.length - 1].offsetHeight - cursorTop > content.scrollHeight) {
                  this.content.scrollToTop(300);
                } else {
                  this.content.scrollToBottom(300);
                  this.btmMsg = "";
                }
              } else {
                this.topMsg = "既読メッセージを表示↑";
                this.content.scrollByPoint(0, 20, 300);//this.data.scroll("btmOne");
              }
            }
            setTimeout(() => {
              this.top.disabled = false; this.btm.disabled = false;
            }, 3000);
          }, 1000);
        }
        if (e) {
          e.target.complete();
          if (!docs.length) e.target.disabled = true;
        }
        if (!this.chats.length) this.topMsg = "一番乗りだ！";
      });
    });
    function docsPush(query, that) {
      let docs = [];
      query.forEach(doc => {
        var d = doc.data();
        if (d.upd.toDate().getTime() <= new Date(that.data.room.csd).getTime() && !that.readed) {
          d.readed = true;
          that.readed = true;
        };
        docs.push(d);
      });
      return docs;
    }
  }

  onScroll(e) {
    this.currentY = e.detail.currentY;
  }
  onScrollEnd(e) {
    if (this.data.user.id) {
      var chats = e.currentTarget.children[2].children;
      var upds = [];//見えてるチャットの日付の集合
      for (let i = 0; i < chats.length; i++) {
        if (chats[i].offsetTop >= this.currentY &&
          chats[i].offsetTop + chats[i].offsetHeight < this.currentY + e.currentTarget.scrollHeight - 30) {
          upds.push(new Date(chats[i].children[0].innerHTML));
        }
      }
      if (upds.length) {
        this.deleteMention(upds);
        let upd = upds[upds.length - 1];
        if (!this.data.room.csd || new Date(this.data.room.csd).getTime() < upd.getTime()) {
          this.data.room.csd = upd;
          this.php.get("room", { uid: this.data.user.id, rid: this.data.room.id, csd: this.data.dateFormat(upd) }).subscribe(dummy => { });
        }
      }
    }
  }
  btmClick() {
    if (this.btmMsg = "新着メッセージを表示↓") {
      this.db.collection('room').doc(this.data.room.id.toString()).collection('chat', ref => ref.orderBy('upd', 'desc')
        .limit(1)).get().subscribe(query => {
          let doc = query[0].doc.data();
          let csd = doc.upd.toDate();
          let chats = <any>document.getElementsByClassName('chat');
          let upd = new Date(chats[chats.length - 1].children[0].innerHTML);
          if (upd.getTime() >= csd.getTime()) {
            this.content.scrollToBottom(300);//this.data.scroll('btm');
          } else {
            this.data.room.csd = csd;
            this.chatInit();
          }
        });
    }
  }
  ngOnDestroy() {
    if (this.roomSb) this.roomSb.unsubscribe();
    if (this.userSb) this.userSb.unsubscribe();
    if (this.chatSb) this.chatSb.unsubscribe();
    if (this.paramsSb) this.paramsSb.unsubscribe();
  }
}










/*
      setTimeout(() => {
          let chats = <any>document.getElementsByClassName('chat');
          let content = <any>document.getElementById('chatscontent');
          if (!chats.length || chats[chats.length - 1].offsetTop + chats[chats.length - 1].offsetHeight < content.scrollHeight) {
            db = dbcon.collection('chat', ref => ref.where('upd', "<=", cursor).orderBy('upd', 'desc').limit(20));
            db.get().subscribe(query => {
              docs = [];
              query.forEach(doc => {
                var d = doc.data();
                if (this.data.readedFlag) {
                  if (d.upd.toDate().getTime() <= new Date(this.data.room.csd).getTime()) {
                    d.readed = true;
                    this.data.readedFlagChange(false);
                  }
                }
                docs.push(d);
              });
            });
          }
        }, 1000);


*/