'use strict';

/*
  Xavfsiz ko'prik (contextIsolation yoqiq): sahifaga faqat ikkita funksiya beriladi.
  MP3 kodlash asosiy jarayonda (main.js) bajariladi.
*/

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shadowingNative', {

  mp3Available: () => ipcRenderer.invoke('audio:mp3-available'),

  encodeMp3: (arrayBuffer, options) =>
    ipcRenderer.invoke(
      'audio:encode-mp3',
      arrayBuffer,
      { bitrateKbps: options && options.bitrateKbps }
    )

});
