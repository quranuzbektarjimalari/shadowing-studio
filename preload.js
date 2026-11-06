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
    ),

  // YouTube video haqida ma'lumot: sarlavha va shakl (oEmbed, asosiy jarayon orqali)
  youtubeInfo: (id) => ipcRenderer.invoke('youtube:info', String(id)),

  // Oynani to'liq ekranga o'tkazish / qaytarish (Esc va F11 ham ishlaydi)
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),

  // To'liq ekran holati o'zgarganda (F11, menyu, Esc) chaqiriladi
  onFullscreenChange: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on('window:fullscreen', (_event, isFullscreen) => callback(Boolean(isFullscreen)));
    }
  }

});
