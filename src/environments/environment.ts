// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false
};
import { SocketIoConfig } from 'ngx-socket-io';
export const firebaseConfig = {
  apiKey: 'AIzaSyB8s5OQAXCjki499Q-YpN5ip2LCejRX80o',
  authDomain: 'salon-clife.firebaseapp.com',
  databaseURL: 'https://salon-clife.firebaseio.com',
  projectId: 'salon-clife',
  storageBucket: 'salon-clife.appspot.com',
  messagingSenderId: '1091781872346'
};
//export const socketConfig: SocketIoConfig = { url: 'http://localhost:3003', options: {} };
export const socketConfig: SocketIoConfig = { url: 'https://www.clife.cf:3003', options: {} };
//export const socketConfig: SocketIoConfig = { url: 'http://35.193.127.88:3003', options: {} };
export const FOLDER = { id: 1, na: "ブロガーズギルド", parent: 1, folder: true };
export const AUTH = {
  '0': { id: 0, na: "審査待ち", class: 'ready' },
  '1': { id: 1, na: "メンバー", class: 'member' },
  '100': { id: 100, na: "アシスタント", class: 'assist' },
  '200': { id: 200, na: "マネージャー", class: 'manager' },
  '500': { id: 500, na: "クリエイター", class: 'creator' },
  '1000': { id: 1000, na: "マスター", class: 'master' },
  '9000': { id: 9000, na: "オーナー", class: 'owner' }
};
//export const PHPURL = "http://localhost/public_html/";
export const PHPURL = "https://bloggersguild.cf/";
export const tinyinit = {
  selector: ".tiny",
  menubar: false,
  inline: true,
  //theme: 'inlite',
  mobile: {
    theme: 'mobile',
    plugins: ['autosave', 'lists', 'autolink'],
    toolbar: ['undo', 'bold', 'italic', 'styleselect', 'emoticons']
  },
  language_url: 'https://bloggersguild.cf/js/ja.js',
  plugins: [
    'autolink autosave codesample link lists advlist table paste emoticons'
  ],
  toolbar: 'undo redo | forecolor | emoticons styleselect | blockquote link copy paste',
  contextmenu: 'restoredraft | inserttable cell row column deletetable | bullist numlist',
  forced_root_block: false, allow_conditional_comments: true, allow_html_in_named_anchor: true, allow_unsafe_link_target: true,

}



/*

export const firebaseConfig = {
  apiKey: 'AIzaSyAvD0ftnENGOCvE9cOPB8AklV7JeMY4cfg',
  authDomain: 'blogersguild1.firebaseapp.com',
  databaseURL: 'https://blogersguild1.firebaseio.com',
  projectId: 'blogersguild1',
  storageBucket: 'blogersguild1.appspot.com',
  messagingSenderId: '1091781872346'
};








 */





/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
