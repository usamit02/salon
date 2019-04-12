import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataService } from '../provider/data.service';
import { UiService } from '../provider/ui.service';
import { Router } from '@angular/router';
declare var Peer: any;
@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent implements OnInit {
  @ViewChild(IonContent) content: IonContent;
  paramsSb: Subscription;
  params;
  peer;
  peerRoom;
  constructor(private route: ActivatedRoute, private data: DataService, private router: Router, private ui: UiService) { }
  ngOnInit() {
    this.paramsSb = this.route.params.subscribe(params => {
      this.params = params;
    });
  }
  ngAfterViewInit() {
    if (this.params.id === undefined || this.params.rtc === undefined) {
      this.ui.alert("放送を表示できません。");
    } else {
      this.rtcInit();
    }
  }
  rtcInit() {
    const rtc: string = this.params.rtc;
    let myVideoPeerId: string;
    let yourVideoPeerId: string;
    let audioPeerId: string;
    let localStream: MediaStream;
    let myVideo: HTMLVideoElement;
    let yourVideo: HTMLVideoElement;
    let audio: HTMLAudioElement;
    let mediaTag = document.getElementById("media");
    if (rtc !== "headset") {
      let media = rtc === 'videocam' ?
        { video: { width: { min: 240, max: 320 }, height: { min: 180, max: 240 } }, audio: true } :
        { video: false, audio: true };
      navigator.mediaDevices.getUserMedia(media).then(stream => {
        localStream = stream;
        if (rtc === 'videocam') {
          mediaTag.insertAdjacentHTML('beforeend', '<video id="myVideo"></video>');
          myVideo = <HTMLVideoElement>document.getElementById('myVideo');
          myVideo.srcObject = stream;
          myVideo.onloadedmetadata = (e) => {
            setTimeout(() => {
              myVideo.muted = true;
              //this.content.resize();
            }, 1000);
          };
        }
      }
      ).catch(err => {
        this.ui.alert("ビデオカメラが接続されていません。");
      });
    }
    this.peer = new Peer(rtc + "_" + this.data.user.id, {
      key: '11d26de3-711f-4a5f-aa60-30142aeb70d9',
      debug: 3
    });
    this.peer.on('open', () => {
      let peerMode = rtc === 'headset' ? { mode: 'sfu' } : { mode: 'sfu', stream: localStream };
      this.peerRoom = this.peer.joinRoom(this.params.id, peerMode);
      this.peerRoom.on('stream', stream => {
        let pid = stream.peerId.split("_");
        if (pid[1] !== this.data.user.id) {
          if (pid[0] === "mic") {
            mediaTag.insertAdjacentHTML('beforeend', '<audio id="audio"></audio>');
            audio = <HTMLAudioElement>document.getElementById('audio');
            audio.srcObject = stream;
            audioPeerId = stream.peerId;
            audio.play();
          } else if (pid[0] === "videocam") {
            if (!myVideo) {
              mediaTag.insertAdjacentHTML('beforeend', '<video id="myVideo"></video>');
              myVideo = <HTMLVideoElement>document.getElementById('myVideo');
              myVideo.srcObject = stream;
              myVideoPeerId = stream.peerId;
              myVideo.onloadedmetadata = (e) => {
                setTimeout(() => {
                  myVideo.play();
                  //this.content.resize();
                }, 1000);
              };
            } else {
              if (!yourVideo) {
                mediaTag.insertAdjacentHTML('beforeend', '<video id="yourVideo"></video>');
                yourVideo = <HTMLVideoElement>document.getElementById('yourVideo');
                yourVideo.srcObject = stream;
                yourVideoPeerId = stream.peerId;
                yourVideo.onloadedmetadata = (e) => {
                  setTimeout(() => {
                    yourVideo.play();
                    //this.content.resize();
                  }, 1000);
                };
              }
            }
          }
        }
      });
      this.peerRoom.on('peerLeave', peerId => {
        if (myVideo && myVideoPeerId == peerId) {
          myVideo.pause(); myVideo.srcObject = undefined; myVideoPeerId = "";
        }
        if (yourVideo && yourVideoPeerId == peerId) {
          yourVideo.pause(); yourVideo.srcObject = undefined; yourVideoPeerId = "";
        }
        if (audio && audioPeerId == peerId) {
          audio.pause(); audio.srcObject = undefined; audioPeerId = "";
        }
      });
      this.peerRoom.on('removeStream', stream => {
      });
      this.peerRoom.on('close', () => {
        if (myVideo) {
          myVideo.pause(); myVideo.srcObject = undefined; myVideoPeerId = "";
        }
        if (yourVideo) {
          yourVideo.pause(); yourVideo.srcObject = undefined; yourVideoPeerId = "";
        }
        if (audio) {
          audio.pause(); audio.srcObject = undefined; audioPeerId = "";
        }
        localStream = undefined;
        this.peer.disconnect();
      });
    });
    this.peer.on('error', err => {
      alert(err.type + ':' + err.message);
    });
    this.peer.on('close', () => {
    });
    this.peer.on('disconnected', () => {
      //this.router.navigate(['/home/room', this.params.id]);
    });
  }
  close() {
    this.router.navigate(['/home/room', this.params.id]);
  }
  ngOnDestroy() {
    if (this.paramsSb) this.paramsSb.unsubscribe();
    if (this.peerRoom) {
      this.peerRoom.close();
    }
  }
}
