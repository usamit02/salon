import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonInfiniteScroll, ActionSheetController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Room, DataService } from '../provider/data.service';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import { PhpService } from '../provider/php.service';
import { tinyinit } from '../../environments/environment';
import { Socket } from 'ngx-socket-io';
import { UiService } from '../provider/ui.service';
declare var tinymce; declare var twttr;
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  @ViewChild('chatscontent') content: IonContent;
  @ViewChild('top') top: IonInfiniteScroll; @ViewChild('btm') btm: IonInfiniteScroll;
  rid: number;//部屋番号
  room: Room;
  chats = [];//チャットデータ　表示は逆順になる
  loading: boolean = false;//初回読み込み時の自動スクロールにion-infinate-scrollが反応するのを止める。
  dbcon: AngularFirestoreDocument<{}>;//firestore接続バッファ　ダイレクト(direct)と部屋(room)で使い分け
  topMsg: string = ""; btmMsg: string = "";
  readed: boolean;
  newMsg: number = 0;
  newChat: number = 0;
  loadUpd: Date;//最初にチャットロードした時間
  newUpds = [];//新着メッセージ
  mentionTop: number = 0; mentionBtm: number = 0;
  Y: number = 0;//現在のスクロール位置
  H: number = 0;//現在のスクロール高さ
  cursor: Date = null;//firestore読込の際の中央日付
  twitter: boolean = false;//twitter.widgets.load()実行用
  mentionRoomsSb: Subscription; mentionDbSb: Subscription; newchatSb: Subscription; chatSb: Subscription;
  paramsSb: Subscription; userSb: Subscription; allRoomsSb: Subscription;//各rxjs、メモリリーク対策destroy時破棄用
  constructor(private actionSheetCtrl: ActionSheetController, private route: ActivatedRoute, public data: DataService, private readonly db: AngularFirestore
    , private php: PhpService, private storage: AngularFireStorage, private socket: Socket, private ui: UiService) { }
  ngOnInit() {
    this.paramsSb = this.route.params.subscribe(params => {
      this.rid = Number(params.id);
      this.cursor = params.csd ? new Date(Number(params.csd) * 1000) : null;
      this.init();
    });
    this.userSb = this.data.userState.subscribe(user => {
      this.data.readRooms().then(rooms => {
        this.init();
      });
    });
    this.mentionRoomsSb = this.data.mentionRoomsSubject.asObservable().subscribe(mentionRooms => {
      this.onScrollEnd();
    });
  }
  init() {
    if (this.rid > 1000000000) {//ダイレクト
      if (this.data.user.id) {
        this.php.get('direct', { uid: this.data.user.id, rid: this.rid }).then(res => {
          if (res.cursor && !this.cursor) this.cursor = new Date(res.cursor);
        }).finally(() => {
          this.chatInit(this.rid);
          let na = this.data.directUser ? this.data.directUser.na + "へメッセージ" : "ダイレクト";
          let room: Room = { id: this.rid, na: na, chat: true };
          this.data.joinRoom(room);
        });
      }//ログインしてなければ何もしない    
    } else {
      let newRoom = new Room;
      let id = this.rid;
      do {
        let parents = this.data.fullRooms.filter(room => { return room.id === id; });
        if (parents.length) {
          let targets = this.data.allRooms.filter(room => { return room.id === id; });
          if (targets.length) {
            newRoom = targets[0]; break;
          }
          id = parents[0].parent;
        } else {
          break;
        }
      } while (id);
      this.rid = newRoom.id;
      this.cursor = this.cursor || !newRoom.csd ? this.cursor : new Date(newRoom.csd);
      this.data.joinRoom(newRoom);
      if (newRoom.chat) this.chatInit();
    }
  }
  chatInit(direct?: number) {
    this.chats = []; this.Y = 0; this.readed = false; this.twitter = false; this.newUpds = []; this.loadUpd = new Date();
    this.top.disabled = true; this.btm.disabled = true;//無限スクロール無効
    this.dbcon = direct ? this.db.collection('direct').doc(direct.toString()) : this.db.collection('room').doc(this.rid.toString());
    this.chatLoad(false, this.data.room.csd || this.cursor ? "btm" : "top", this.cursor);
    if (this.newchatSb) this.newchatSb.unsubscribe();
    this.newchatSb = this.dbcon.collection('chat', ref => ref.where('upd', '>', this.loadUpd)).stateChanges(['added']).
      subscribe(action => {//チャットロード以降の書き込み 
        let chat = action[0].payload.doc.data();
        this.dbcon.collection('chat', ref => ref.where('upd', "<", chat.upd).orderBy('upd', 'desc').
          limit(1)).get().subscribe(query => {//書き込み直前のチャットを取得
            if (query.docs.length) {//初回書き込みでない
              if (query.docs[0].data().upd.toDate().getTime() === this.chats[0].upd.toDate().getTime()) {//読込済最新チャットの次の投稿
                this.chats.unshift(chat);//チャットが連続していれば書き込みを足す（chats[0]が最新、reverse）
                this.chatChange();
                setTimeout(() => {
                  let chatElement = <any>document.getElementById('chat' + (this.chats.length - 1).toString());//新規チャット
                  if (this.Y + this.H > chatElement.offsetTop) {
                    this.content.scrollToBottom(300);
                    this.btmMsg = "";
                  } else {//画面上に最近のチャットが表示されていない
                    this.newUpds.push(chat.upd.toDate());//新着メッセージを追加
                  }
                }, 1000);
              } else {//読込済最新チャットの次のチャットはない                
                this.newUpds.push(chat.upd.toDate());//新着メッセージを追加                
              }
            } else {//初回書き込み
              this.chats.unshift(chat);
              this.topMsg = "";
            }
            if (chat.twitter) {
              setTimeout(() => {
                twttr.widgets.load();
              }, 3000);
            };
          });
      });
    setTimeout(() => {
      this.onScrollEnd();
    }, 3000);
  }
  chatLoad(e, direction, cursor?: Date) {
    console.log("chatload");
    if (!e) {
      this.loading = true;
    } else if (this.loading) {
      e.target.complete();
      this.loading = false;
      return;//初回読み込み時の自動スクロールにion-infinate-scrollが反応するのを止める。
    }
    let db; this.topMsg = ""; this.btmMsg = "";
    if (!cursor) {
      if (this.chats.length) {
        cursor = direction === 'top' ? this.chats[this.chats.length - 1].upd.toDate() : this.chats[0].upd.toDate();
      } else {
        cursor = this.data.room.csd ? new Date(this.data.room.csd) : this.loadUpd;
      }
    }
    if (direction === 'top') {
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<", cursor).orderBy('upd', 'desc').limit(20));
    } else {
      db = this.dbcon.collection('chat', ref => ref.where('upd', ">", cursor).where('upd', '<', this.loadUpd).orderBy('upd', 'asc').limit(20));
    }
    let uid: string = this.data.user.id;//自動ログイン時重複読込対策
    db.get().subscribe(query => {
      let docs1 = docsPush(query, this);
      let limit: number = direction === 'btm' && !this.chats.length && docs1.length < 20 ? 20 - docs1.length : 0;
      if (!limit) { limit = 1; cursor = new Date("1/1/1900"); }
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<=", cursor).orderBy('upd', 'desc').limit(limit));
      db.get().subscribe(query => {
        if (uid !== this.data.user.id) return;//自動ログイン時重複読込対策 
        let docs2 = docsPush(query, this);
        if (direction === 'top') {
          this.chats.push(...docs1);
        } else {
          this.chats.push(...docs2);
          this.chats.unshift(...docs1.reverse());
        }
        let docs = docs1.concat(docs2);
        if (e) {//infinatescrollからの場合、スピナーを止める
          e.target.complete();
          if (!docs.length) e.target.disabled = true;//読み込むchatがなかったら以降infinatescroll無効
        }
        if (this.chats.length) {
          this.chatChange();
          if (this.chats.length === docs.length) {
            setTimeout(() => {
              if (direction === "top" || !docs1.length) {
                this.content.scrollToBottom(300).then(() => { scrollFin(this); }); //this.data.scroll("btm");
                this.btmMsg = "";
              } else {
                if (docs2.length) {
                  let content = <any>document.getElementById('chatscontent');
                  let chats = content.children[2].children;
                  let cursorTop: number = 0; let cursorHeight: number = 0;
                  for (let i = 0; i < chats.length; i++) {
                    if (this.chats[chats.length - i - 1].upd.toDate().getTime() >= cursor.getTime()) {
                      cursorTop = chats[i].offsetTop; cursorHeight = chats[i].offsetHeight; break;
                    }
                  }
                  if (chats[chats.length - 1].offsetTop + chats[chats.length - 1].offsetHeight - cursorTop > content.scrollHeight) {
                    this.content.scrollToTop(300).then(() => { scrollFin(this); });
                  } else {
                    this.content.scrollToBottom(300).then(() => { scrollFin(this); });
                    this.btmMsg = "";
                  }
                } else {
                  scrollFin(this);
                  //this.topMsg = "既読メッセージを表示↑";
                  //this.content.scrollByPoint(0, 20, 300);//this.data.scroll("btmOne");
                }
              }
              setTimeout(() => {
                if (this.twitter) {
                  twttr.widgets.load();
                  this.twitter = false;
                }
              }, 1000);
            }, 1000);
          }
        } else {//読み込むchatがない
          this.topMsg = "一番乗りだ！";
        }
      });
    });
    function docsPush(query, that) {//firestoreの返り値を配列へ、同時に既読位置とツイッターがあるか記録
      let docs = []
      query.forEach(doc => {
        let d = doc.data();
        if (d.upd.toDate().getTime() <= new Date(that.data.room.csd).getTime() && !that.readed) {
          d.readed = true;
          that.readed = true;
        };
        if (d.twitter) that.twitter = true;
        docs.push(d);
      });
      return docs;
    }
    function scrollFin(that) {//無限スクロールを有効にする
      that.top.disabled = false; that.btm.disabled = false; that.loading = false;
    }
  }
  chatChange() {
    if (this.chatSb) this.chatSb.unsubscribe();
    this.chatSb = this.dbcon.collection('chat', ref => ref.where('upd', '<=', this.chats[0].upd).
      where('upd', '>=', this.chats[this.chats.length - 1].upd)).stateChanges(['modified']).
      subscribe(action => {//チャットロード以降の変更   
        console.log("chatchange");
        let chat = action[0].payload.doc.data();
        for (let i = 0; i < this.chats.length; i++) {
          if (this.chats[i].upd.toDate().getTime() === chat.upd.toDate().getTime()) {
            this.chats[i] = chat;
            break;
          }
        }
      });
  }
  onScrollEnd() {
    this.content.getScrollElement().then(content => {
      this.Y = content.scrollTop;//console.log("H:" + content.scrollHeight + " Top:" + content.scrollTop);
      this.H = content.offsetHeight;
      if (this.data.user.id) {
        let upds = this.currentUpds();
        if (upds.length) {
          this.deleteNotice(upds);
          let upd = upds[upds.length - 1];//画面上見えてる最新の日付
          if (!this.data.room.csd || new Date(this.data.room.csd).getTime() < upd.getTime()) {
            this.data.room.csd = upd;
            this.php.get("room", { uid: this.data.user.id, rid: this.rid, csd: this.data.dateFormat(upd) });
          }
        }
      }
    });
  }
  deleteNotice(upds) {
    let upd0 = upds[0].getTime(); let upd9 = upds[upds.length - 1].getTime();
    this.newUpds = this.newUpds.filter(upd => upd.getTime() < upd0 || upd9 < upd.getTime());//新着メッセージ
    let mentions = this.data.mentions[this.rid.toString()];//メンション
    if (mentions && mentions.length) {
      let deleteMentions = mentions.filter(mention => {
        let upd = mention.upd.toDate().getTime();
        return upd0 <= upd && upd <= upd9;// console.log(upd0 + "<=" + upd + "<=" + upd9);        
      });
      for (let i = 0; i < deleteMentions.length; i++) {
        this.db.collection('user').doc(this.data.user.id.toString()).collection('mention').doc(deleteMentions[i].id).delete();
        console.log("メンション削除" + deleteMentions[i].id + ":" + upds[0] + "<=" + deleteMentions[i].upd.toDate() + ">=" + upds[upds.length - 1]);
        mentions = mentions.filter(mention => { return mention.id !== deleteMentions[i].id; });
      }
      if (deleteMentions.length) {
        this.data.mentions[this.rid] = mentions;
        let mentionRooms = this.data.mentionRooms.filter(mentionRoom => { return mentionRoom.id === this.rid; });
        mentionRooms[0].count -= deleteMentions.length;
        if (!mentionRooms[0].count) {
          this.data.mentionRooms = this.data.mentionRooms.filter(mentionRoom => { return mentionRoom.id !== this.rid; });
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
  currentUpds() {
    let chats = <any>document.getElementsByClassName('chat'); //contents.target.children[2].children;
    let upds = [];//見えてるチャットの日付の集合
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].offsetTop >= this.Y &&
        chats[i].offsetTop + chats[i].offsetHeight < this.Y + this.H) {
        upds.push(this.chats[chats.length - i - 1].upd.toDate());//new Date(chats[i].children[0].innerHTML));
      }
    }
    return upds;
  }
  btmClick() {
    if (this.btmMsg = "新着メッセージを表示↓") {
      this.db.collection('room').doc(this.rid.toString()).collection('chat',
        ref => ref.orderBy('upd', 'desc').limit(1)).get().subscribe(query => {
          let doc = query[0].doc.data();
          let csd = doc.upd.toDate();
          if (this.chats[0].upd.toDate().getTime() >= csd.getTime()) {//最新のchatを読込済なら
            this.content.scrollToBottom(300);
          } else {
            this.data.room.csd = csd;
            this.chatInit();//カーソルを最新にしてリロード
          }
        });
    }
  }
  noticeClick(type) {
    let upd = this.chats[0].upd.toDate();//new Date(chats[chats.length - 1].children[0].innerHTML);
    if (type === "mentionTop") {

    } else if (type === "mentionBtm") {
      let mentions = this.data.mentions[this.rid.toString()];
      let currentUpds = this.currentUpds();
      let loadedMentions = mentions.filter(mention =>
        mention.upd.toDate().getTime() <= upd.getTime() &&
        mention.upd.toDate().getTime() > currentUpds[currentUpds.length - 1].getTime());
      if (loadedMentions && loadedMentions.length) {
        let scrollTo: number = this.Y;
        let mentionUpd = loadedMentions[0].upd.toDate().getTime();
        for (let i = 0; i < this.chats.length; i++) {
          if (this.chats[i].upd.toDate().getTime() === mentionUpd) {
            let chat = <any>document.getElementById("chat" + (this.chats.length - i - 1).toString());
            scrollTo = chat.offsetTop; break;
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
  chatClick(e) {
    if (e.target.className === 'react') {
      let item = e.target.children[0];
      if (item.style.display === 'none') {
        item.style.display = 'inline';
      } else {
        item.style.display = 'none';
      }
    }
  }
  async chatPress(e, uid, na, idx) {
    let buttons: Array<any> = [];
    if (this.data.user.id) {
      buttons = [
        { text: 'リアクション', icon: 'happy', handler: () => { this.emoji(e, idx); } },
        { text: '通報', icon: 'thumbs-down', handler: () => { this.tip(na, idx) } }];
    }
    if (uid === this.data.user.id || this.data.room.auth > 200) {
      buttons.push(
        { text: '編集', icon: 'brush', handler: () => { this.edit(idx); } }
      );
      buttons.push(
        { text: '削除', icon: 'trash', handler: () => { this.delete(idx); } }
      );
    }
    buttons.push({ text: 'urlをコピー', icon: 'copy', handler: () => { this.copy(idx) } });
    buttons.push({ text: '戻る', icon: 'exit', role: 'cancel' })
    const actionSheet = await this.actionSheetCtrl.create({ header: na, buttons: buttons });
    await actionSheet.present();
  }
  emoji(e, idx) {
    let chats = this.chats.filter(chat => { return chat.emoji });
    for (let i = 0; i < chats.length; i++) {
      chats[i].emoji = false;
    }
    let chat = this.chats[this.chats.length - idx - 1];
    chat.emoji = true;
    setTimeout(() => {
      tinymce.init(
        {
          selector: ".emoji", menubar: false, inline: true, plugins: ['emoticons'], toolbar: 'emoticons',
          setup: editor => {
            editor.on('init', e => {
              let emoji = <any>document.getElementsByClassName('emoji');
              emoji[0].focus();
              let bar = <any>document.getElementsByClassName('tox-toolbar');
              let button = bar[0].children[0].children[0];//bar[0].getElementsByTagName('button');
              button.focus();
              button.click();
            });
            editor.on('change', e => {
              this.dbcon.collection('chat', ref => ref.where('upd', "==", chat.upd)).get().subscribe(query => {
                if (query.docs.length) {
                  let doc = query.docs[0].data();
                  let id: string
                  if (doc.react) {
                    id = Object.keys(doc.react).length.toString();
                  } else {
                    id = "0";
                    doc.react = {};
                  }
                  let txt = editor.getContent({ format: 'text' });
                  doc.react[id] = { upd: new Date(), emoji: txt, na: this.data.user.na };
                  this.dbcon.collection('chat').doc(query.docs[0].id).update({ react: doc.react });
                  chat.emoji = false;
                  editor.destroy();
                  editor.remove();
                } else {
                  alert('リアクション(' + chat.upd + ')に失敗しました。');
                }
              });
            });
          }
        });
    }, 200);
  }
  tip(na, idx) {
    let chat = this.chats[this.chats.length - idx - 1];
    let tip = JSON.stringify({ uid: chat.uid, na: chat.na, txt: chat.txt, upd: chat.upd.toDate() });
    this.php.get("tip", { rid: this.rid, room: this.data.room.na, uid: this.data.user.id, tiper: this.data.user.na, chat: tip }).then(res => {
      this.ui.pop(na + "による問題がある投稿を役員に通報しました。");
    });
  }
  copy(idx) {
    let upd = this.chats[this.chats.length - idx - 1].upd.toDate();
    let url = "https;//" + location.host + "/home/room/" + this.rid + "/" + Math.floor(upd.getTime() / 1000);
    if (execCopy(url)) {
      this.ui.pop("クリップボードに投稿urlをコピーしました。");
    } else {
      this.ui.alert("クリップボードが使用できません。");
    }
    function execCopy(string) {
      var tmp = document.createElement("div");
      var pre = document.createElement('pre');
      pre.style.webkitUserSelect = 'auto';
      pre.style.userSelect = 'auto';
      tmp.appendChild(pre).textContent = string;
      var s = tmp.style;
      s.position = 'fixed';
      s.right = '200%';
      document.body.appendChild(tmp);
      document.getSelection().selectAllChildren(tmp);
      var result = document.execCommand("copy");
      document.body.removeChild(tmp);
      return result;
    }
  }
  edit(idx) {
    let chat = document.getElementById("chat" + idx);
    let txts = chat.getElementsByClassName('chattxt');
    if (txts.length) {
      let txt = <HTMLDivElement>txts[0];
      txt.classList.add("tiny");
      txt.contentEditable = 'true';
      this.chats[this.chats.length - idx - 1].edit = true;
      tinymce.init(tinyinit);
    }
  }
  editSend(e, idx) {
    let div = e.currentTarget.parentElement.parentElement.parentElement.getElementsByClassName("chattxt");
    let chat = this.chats[this.chats.length - idx - 1];//new Date(item.children[0].innerHTML);
    this.dbcon.collection('chat', ref => ref.where('upd', "==", chat.upd)).get().subscribe(query => {
      if (query.docs.length) {
        let txt = tinymce.activeEditor.getContent({ format: 'html' });
        this.dbcon.collection('chat').doc(query.docs[0].id).update({
          rev: new Date(),
          txt: txt
        });
        tinymce.activeEditor.destroy();
        tinymce.activeEditor.remove();
        div[0].classList.remove("tiny");
        div[0].contentEditable = false;
        chat.edit = false;
      } else {
        alert('編集(' + chat.upd + ')に失敗しました。');
      }
    });
  }
  delete(idx) {
    let upd = this.chats[this.chats.length - idx - 1].upd;
    let chat = document.getElementById("chat" + idx);
    let mentions = chat.getElementsByClassName("mention");
    for (let i = 0; i < mentions.length; i++) {
      let db = this.db.collection('user').doc(mentions[i].id);
      db.collection('mention', ref => ref.where('upd', "==", upd)).get().subscribe(query => {
        if (query.docs.length) {
          db.collection('mention').doc(query.docs[0].id).delete();
        };
      });
    }
    this.dbcon.collection('chat', ref => ref.where('upd', "==", upd)).get().subscribe(query => {
      if (query.docs.length) {
        let doc = query.docs[0].data();
        if (doc.img) {
          this.storage.ref("room/" + this.rid + "/" + doc.img).delete();
          this.storage.ref("room/" + this.rid + "/org/" + doc.img).delete();
        }
        this.dbcon.collection('chat').doc(query.docs[0].id).delete();
        this.chats = this.chats.filter(chat => chat.upd.toDate().getTime() !== upd.toDate().getTime());
      } else {
        alert('投稿(' + upd + ')の削除に失敗しました。');
      }
    });
  }
  popMember(e, uid) {
    this.php.get("member", { rid: this.rid, uid: uid }).then(res => {
      let member = { id: uid, na: '', avatar: '', auth: 0, payroomid: 0, authroomid: 0 };
      if (res.members.length) member = res.members[0];
      this.data.popMemberSubject.next({
        member: member,
        event: e
      });
    });
  }
  ngOnDestroy() {
    if (this.userSb) this.userSb.unsubscribe();
    if (this.newchatSb) this.newchatSb.unsubscribe();
    //if (this.chat1Sb) this.chat1Sb.unsubscribe();
    //if (this.chat2Sb) this.chat2Sb.unsubscribe();
    if (this.mentionRoomsSb) this.mentionRoomsSb.unsubscribe();
    if (this.mentionDbSb) this.mentionDbSb.unsubscribe();
    if (this.paramsSb) this.paramsSb.unsubscribe();
    if (this.allRoomsSb) this.allRoomsSb.unsubscribe();
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