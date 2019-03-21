// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false
};
import { SocketIoConfig } from 'ngx-socket-io';
export const firebaseConfig = {
  apiKey: 'AIzaSyAvD0ftnENGOCvE9cOPB8AklV7JeMY4cfg',
  authDomain: 'blogersguild1.firebaseapp.com',
  databaseURL: 'https://blogersguild1.firebaseio.com',
  projectId: 'blogersguild1',
  storageBucket: 'blogersguild1.appspot.com',
  messagingSenderId: '1091781872346'
};
//export const socketConfig: SocketIoConfig = { url: 'http://localhost:3002', options: {} };
export const socketConfig: SocketIoConfig = { url: 'https://www.clife.cf:3002', options: {} };

export const tinyinit = {
  selector: ".tiny",
  menubar: false,
  inline: true,
  //theme: 'inlite',
  mobile: {
    theme: 'mobile',
    plugins: ['autosave', 'lists', 'autolink'],
    toolbar: ['undo', 'bold', 'italic', 'styleselect']
  },
  language_url: 'https://bloggersguild.cf/js/ja.js',
  plugins: [
    'autolink autosave codesample contextmenu link lists advlist table textcolor paste'
  ],
  toolbar: 'undo redo | forecolor backcolor | fontselect fontsizeselect styleselect | bullist numlist | blockquote link copy paste',
  contextmenu: 'up down restoredraft del | inserttable cell row column deletetable | paystart payend',
  forced_root_block: false, allow_conditional_comments: true, allow_html_in_named_anchor: true, allow_unsafe_link_target: true,
  setup: editor => {
    editor.on('Change', e => {
      console.log('editer change' + e);
    });
  }
}









/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
