import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { ActivatedRoute, Params } from '@angular/router';
import { Room, DataService } from '../provider/data.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit {
  @ViewChild(IonContent) content: IonContent;
  room: Room;
  _chats: BehaviorSubject<any[]>;
  chatsOb: Observable<any[]>;
  chats = [];
  chatEnd;//Date = new Date();
  constructor(private route: ActivatedRoute, private data: DataService, private readonly db: AngularFirestore) { }
  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.id === undefined) {
        this.room = new Room;
        this.initChat();
      } else if (this.data.rooms.length) {
        this.readRooms(this.data.rooms, params.id);
      } else {
        this.data.readRooms();
        this.data.roomsState.subscribe(rooms => {
          this.readRooms(rooms, params.id);
        });
      }
    });
    this.chatsOb.subscribe(chats => this.chats = chats);
  }
  readRooms(rooms, id) {
    let room = rooms.filter(room => { return room.id == id });
    this.room = room.length ? room[0] : new Room;
    this.initChat();
  }
  initChat() {
    this.data.joinRoom(this.room);
    this._chats = new BehaviorSubject([]);
    this.chatsOb = this._chats.asObservable();
    //const first = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.orderBy('upd').limit(10));
    this.loadChat(ref => ref.orderBy('upd').limit(10)).subscribe(data => {
      if (data.length) {
        this.chatEnd = data[0].doc;
        this._chats.next(data);
      }
    });
  }
  nextChat() {
    this.loadChat(ref => ref.orderBy('upd').endBefore(this.chatEnd).limit(10)).subscribe(data => {
      if (data.length) {
        this.chatEnd = data[0].doc;
        this._chats.next(data);
      }
    });
  }
  loadChat(ref): Observable<any[]> {
    return this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref).snapshotChanges().
      pipe(map(actions => {
        return actions.map(a => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          const doc = a.payload.doc;
          return { id, ...data, doc };
        });
      }));
    //this.chatCollection = this.db.collection('room').doc(this.room.id.toString()).collection('chat', ref => ref.orderBy('upd'));



    /*
       this.db.collection('room').doc(this.room.id.toString())
         .collection('chat', ref => ref.orderBy('upd').limit(20)).get().subscribe(docs => {
           docs.forEach(doc => {
             this.chats.push(doc.data());
           });
           this.chatEnd = docs[0].id;
           this.content.scrollToBottom();
         });
        
       this.db.collection('room').doc(this.room.id.toString()).collection('chat').stateChanges(['added']).subscribe(action => {
         let a = action;
         console.log(a);
       }); */

    /*
    chat.get().subscribe(data => {
      
    })
    chat.stateChanges(['added']).subscribe(action => {
        let a = action;
      });
    subscribe(chats => {
      this.chats = chats;
      let chatEnd = this.chats[0].upd;
      let chatStart = this.chats[this.chats.length - 1].upd;
      console.log(chatStart + "から" + chatEnd);
      
    });*/


    //, ref => ref.orderBy('upd', 'desc').startAt(this.chatEnd).limit(20)).


  }
}
