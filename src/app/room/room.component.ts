import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Room, User, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { PhpService } from '../provider/php.service';
import { tinyinit } from '../../environments/environment';
declare var $; declare var tinymce;
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
  dbcon;
  topMsg: string = ""; btmMsg: string = "";
  readed: boolean;
  newMsg: number = 0;
  newChat: number = 0;
  loadUpd: Date;
  newUpds = [];
  mentionTop: number = 0; mentionBtm: number = 0;
  currentY: number = 0;
  mentionRoomsSb: Subscription; mentionDbSb: Subscription; chatSb: Subscription; paramsSb: Subscription; userSb: Subscription;
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore
    , private php: PhpService) { }
  ngOnInit() {
    this.paramsSb = this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.data.room = new Room;
        this.data.joinRoom(this.data.room);
        this.chatInit();
      } else if (params.id > 1000000000 && this.data.user.id) {//ダイレクトメール
        this.chatInit(params.id);
        this.data.joinRoom({ id: params.id, na: this.data.directUser.na + "へメール", chat: true })
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
      if (this.mentionDbSb) this.mentionDbSb.unsubscribe();
      if (user.id) {
        this.mentionDbSb = this.db.collection('user').doc(this.data.user.id.toString()).collection('mention',
          ref => ref.orderBy('upd', 'desc')).snapshotChanges().subscribe((res: Array<any>) => {
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
    this.mentionRoomsSb = this.data.mentionRoomsSubject.asObservable().subscribe(mentionRooms => {
      this.onScrollEnd({ currentTarget: <any>document.getElementById('chatscontent') });
    });
  }
  deleteNotice(upds) {
    let upd0 = upds[0].getTime(); let upd9 = upds[upds.length - 1].getTime();
    this.newUpds = this.newUpds.filter(upd => upd.getTime() < upd0 || upd9 < upd.getTime());//新着メッセージ
    let mentions = this.data.mentions[this.data.room.id.toString()];//メンション
    if (mentions && mentions.length) {
      let deleteMentions = mentions.filter(mention => {
        let upd = mention.upd.toDate().getTime();
        return upd0 <= upd && upd <= upd9;// console.log(upd0 + "<=" + upd + "<=" + upd9);        
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
      let mentionTops = mentions.filter(mention => mention.upd.toDate().getTime() < upd0);
      this.mentionTop = mentionTops.length;
      let mentionBtms = mentions.filter(mention => mention.upd.toDate().getTime() > upd9);
      this.mentionBtm = mentionBtms.length;
      console.log("メンション数" + this.mentionBtm);
    } else {
      this.mentionTop = 0; this.mentionBtm = 0;
    }
  }
  readRooms(rooms: Array<Room>, id: number) {
    let room = rooms.filter(room => { return room.id == id });
    this.data.room = room.length ? room[0] : new Room;
    this.data.joinRoom(this.data.room);
    if (room[0].chat) this.chatInit();
  }
  chatInit(direct?: string) {
    this.chats = []; this.currentY = 0; this.readed = false; this.newUpds = [];
    this.top.disabled = true; this.btm.disabled = true;
    this.dbcon = direct ? this.db.collection('direct').doc(direct) : this.db.collection('room').doc(this.data.room.id.toString());
    this.chatLoad(false, this.data.room.csd ? "btm" : "top");
    if (this.chatSb) this.chatSb.unsubscribe();
    this.chatSb = this.dbcon.collection('chat', ref => ref.where('upd', '>', new Date())).valueChanges().
      subscribe(data => {        //チャットロード以降の書き込み   
        if (!data.length) return;
        this.dbcon.collection('chat', ref => ref.where('upd', "<", data[data.length - 1].upd).orderBy('upd', 'desc').
          limit(1)).get().subscribe(query => {//書き込み直前のチャットを取得
            if (query.docs.length) {//初回書き込みでない
              if (query.docs[0].data().upd.toDate().getTime() === this.chats[0].upd.toDate().getTime()) {
                this.chats.unshift(data[data.length - 1]);//チャットが連続していれば書き込みを足す（chats[0]が最新、reverse）
                setTimeout(() => {
                  let content = <any>document.getElementById('chatscontent');
                  let chats = content.children[2].children;
                  if (this.currentY + content.scrollHeight > chats[chats.length - 1].offsetTop) {
                    this.content.scrollToBottom(300);
                    this.btmMsg = "";
                    this.data.room.csd = data[0].upd.toDate();
                    this.php.get("room", { uid: this.data.user.id, rid: this.data.room.id, csd: this.data.dateFormat(this.data.room.csd) }).subscribe(dummy => { });
                  } else {//画面上に最近のチャットが表示されていない
                    this.newUpds.push(data[data.length - 1].upd.toDate());
                  }
                }, 1000);
              } else {//最近のチャットをchatLoadで読み込んでいない
                this.newUpds.push(data[data.length - 1].upd.toDate());
              }
            } else {//初回書き込み
              this.chats.unshift(data[data.length - 1]);
            }
          });
      });
    setTimeout(() => {
      this.onScrollEnd({ currentTarget: <any>document.getElementById('chatscontent') });
    }, 3000);
  }
  chatLoad(e, direction, cursor?: Date) {
    let db; this.topMsg = ""; this.btmMsg = "";
    if (!cursor) {
      if (this.chats.length) {
        cursor = direction === 'top' ? this.chats[this.chats.length - 1].upd.toDate() : this.chats[0].upd.toDate();
      } else {
        cursor = this.data.room.csd ? new Date(this.data.room.csd) : new Date();
      }
    }
    if (direction === 'top') {
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<", cursor).orderBy('upd', 'desc').limit(20));
    } else {
      db = this.dbcon.collection('chat', ref => ref.where('upd', ">", cursor).orderBy('upd', 'asc').limit(20));
    }
    this.chatsUsers.unshift(this.data.user);//ログイン切り替え対策用
    db.get().subscribe(query => {
      let chatsUser = this.chatsUsers.pop();//前回読み込んだユーザー
      if (chatsUser.id !== this.data.user.id) return;//現在読み込まれているchatsが別のログインユーザーの場合、追加読込しない
      let docs1 = docsPush(query, this);
      let limit = direction === 'btm' && !this.chats.length && docs1.length < 20 ? 20 - docs1.length : 0;
      if (!limit) { limit = 1; cursor = new Date("1/1/1900"); }
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<=", cursor).orderBy('upd', 'desc').limit(limit));
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
                //this.topMsg = "既読メッセージを表示↑";
                //this.content.scrollByPoint(0, 20, 300);//this.data.scroll("btmOne");
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
        let d = doc.data();
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
      let upds = this.currentUpds(e);
      if (upds.length) {
        this.deleteNotice(upds);
        let upd = upds[upds.length - 1];//画面上見えてる最新の日付
        if (!this.data.room.csd || new Date(this.data.room.csd).getTime() < upd.getTime()) {
          this.data.room.csd = upd;
          this.php.get("room", { uid: this.data.user.id, rid: this.data.room.id, csd: this.data.dateFormat(upd) }).subscribe(dummy => { });
        }
      }
    }
  }
  currentUpds(contents) {
    var chats = contents.currentTarget.children[2].children;
    var upds = [];//見えてるチャットの日付の集合
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].offsetTop >= this.currentY &&
        chats[i].offsetTop + chats[i].offsetHeight < this.currentY + contents.currentTarget.scrollHeight - 30) {
        upds.push(new Date(chats[i].children[0].innerHTML));
      }
    }
    return upds;
  }
  btmClick() {
    if (this.btmMsg = "新着メッセージを表示↓") {
      this.db.collection('room').doc(this.data.room.id.toString()).collection('chat',
        ref => ref.orderBy('upd', 'desc').limit(1)).get().subscribe(query => {
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
  noticeClick(type) {
    let chats = <any>document.getElementsByClassName('chat');
    let upd = new Date(chats[chats.length - 1].children[0].innerHTML);
    if (type === "mentionTop") {

    } else if (type === "mentionBtm") {
      let mentions = this.data.mentions[this.data.room.id.toString()];
      let currentUpds = this.currentUpds({ currentTarget: <any>document.getElementById('chatscontent') });
      let loadedMentions = mentions.filter(mention =>
        mention.upd.toDate().getTime() <= upd.getTime() &&
        mention.upd.toDate().getTime() > currentUpds[currentUpds.length - 1].getTime());
      if (loadedMentions && loadedMentions.length) {
        let scrollTo: number = this.currentY;
        let mentionUpd = loadedMentions[0].upd.toDate().getTime();
        for (let i = 0; i < chats.length; i++) {
          if (new Date(chats[i].children[0].innerHTML).getTime() === mentionUpd) {
            scrollTo = chats[i].offsetTop; break;
          }
        }
        this.content.scrollToPoint(0, scrollTo, 300);
      } else {
        mentions = mentions.filter(mention => mention.upd.toDate().getTime() > upd.getTime());
        this.chats = [];
        this.top.disabled = true; this.btm.disabled = true;
        this.chatLoad(false, "btm", mentions[mentions.length - 1].upd.toDate());
      }
    } else if (type === "newMsg") {
      if (this.newUpds[0].getTime() <= upd.getTime()) {
        this.content.scrollToBottom(300);
      } else {
        this.chats = [];
        this.top.disabled = true; this.btm.disabled = true;
        this.chatLoad(false, "btm", this.newUpds[0]);
      }
    }
  }
  edit(e) {
    let item = e.currentTarget.parentElement.parentElement.parentElement;
    let icon = e.currentTarget.children[0];
    let div = item.getElementsByClassName("chattxt");
    if (icon.name === "brush") {
      div[0].classList.add("tiny");
      div[0].contentEditable = true;
      tinymce.init(tinyinit);
      icon.name = "send";
    } else {
      let upd = new Date(item.children[0].innerHTML);
      this.dbcon.collection('chat', ref => ref.where('upd', "==", upd)).get().subscribe(query => {
        if (query.docs.length) {
          let txt = tinymce.activeEditor.getContent({ format: 'html' });
          this.dbcon.collection('chat').doc(query.docs[0].id).update({
            rev: new Date(),
            txt: txt
          });
          div[0].classList.remove("tiny");
          div[0].contentEditable = false;
          icon.name = "brush";
        } else {
          alert('編集(' + upd + ')に失敗しました。');
        }
      });
    }
  }
  delete(e) {
    let item = e.currentTarget.parentElement.parentElement.parentElement;
    let div = item.getElementsByClassName("chattxt");
    let upd = new Date(item.children[0].innerHTML);
    let mentions = div[0].getElementsByClassName("mention");
    if (mentions.length) {
      for (let i = 0; i < mentions.length; i++) {
        let uid = mentions[i].id;
        let db = this.db.collection('user').doc(uid);
        db.collection('mention', ref => ref.where('upd', "==", upd)).get().subscribe(query => {
          if (query.docs.length) db.collection('mention').doc(query.docs[0].data().uid).delete();
        });
      }
    }
    this.dbcon.collection('chat', ref => ref.where('upd', "==", upd)).get().subscribe(query => {
      if (query.docs.length) {
        this.dbcon.collection('chat').doc(query.docs[0].id).delete();
        this.chats = this.chats.filter(chat => chat.upd.toDate().getTime() !== upd.getTime());
      } else {
        alert('書き込み(' + upd + ')削除に失敗しました。');
      }
    });
  }
  popMember(e) {
    let chatIndex = e.currentTarget.parentElement.children[1].innerHTML;
    let chat = this.chats[this.chats.length - chatIndex - 1];
    this.php.get("member", { rid: this.data.room.id, uid: chat.uid }).subscribe((res: any) => {
      if (!res || res.error) {
        alert("データベースエラーによりメンバーの取得に失敗しました。");
      } else {
        let member = { id: chat.uid, na: chat.na, avatar: chat.avatar, auth: 0, payroomid: 0, authroomid: 0 };
        if (res.length) member = res[0];
        this.data.popMemberSubject.next({
          member: member,
          event: e
        });
      }
    });
  }
  ngOnDestroy() {
    if (this.userSb) this.userSb.unsubscribe();
    if (this.chatSb) this.chatSb.unsubscribe();
    if (this.mentionRoomsSb) this.mentionRoomsSb.unsubscribe();
    //if (this.mentionDbSb) this.mentionDbSb.unsubscribe();
    if (this.paramsSb) this.paramsSb.unsubscribe();
  }
}




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
  /*  this.roomSb = this.data.roomState.subscribe(room => {
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
      });*/