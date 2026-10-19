'use strict';

const { app, BrowserWindow, Menu, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { createAppServer } = require('./appserver');
const { encodeToMp3 } = require('./encoder');

const APP_ROOT = path.join(__dirname, 'app');

/* Avval shu port ishlatiladi (sozlamalar — localStorage — port o'zgarmasa saqlanib qoladi) */
const PREFERRED_PORT = 47285;

let appOrigin = '';
let mainWindow = null;

// Audio avto-o'tish (keyingi videoni o'zi boshlash) uchun
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

/*
  Video kompyuter xotirasiga (diskka) yuklanmasligi uchun: YouTube videosi pleyer orqali
  RAM buferiga oqim bo'lib keladi; diskdagi HTTP / media keshi o'chiriladi va har gal tozalanadi.
  (Sozlamalar — localStorage — saqlanib qoladi.)
*/
app.commandLine.appendSwitch('disk-cache-size', '1');
app.commandLine.appendSwitch('media-cache-size', '1');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.shadowingstudio.app');
}

/* ---------- MP3 kodlash (ffmpeg / LAME) ---------- */

function resolveFfmpegPath() {

  // Sinov uchun qo'lda ko'rsatish mumkin
  if (process.env.SHADOWING_FFMPEG) {
    return process.env.SHADOWING_FFMPEG;
  }

  let ffmpegPath = null;

  try {
    ffmpegPath = require('ffmpeg-static');
  } catch (_) {
    return null;
  }

  if (!ffmpegPath) {
    return null;
  }

  // Yig'ilgan dasturda fayl app.asar ichida emas, app.asar.unpacked ichida turadi
  return String(ffmpegPath).replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');

}

function isTrustedSender(event) {

  const url = (event.senderFrame && event.senderFrame.url) || event.sender.getURL();

  return Boolean(appOrigin) && String(url).startsWith(appOrigin + '/');

}

function registerWindowIpc() {

  ipcMain.handle('window:toggle-fullscreen', (event) => {

    if (!isTrustedSender(event) || !mainWindow || mainWindow.isDestroyed()) {
      return false;
    }

    mainWindow.setFullScreen(!mainWindow.isFullScreen());

    return true;

  });

}

function notifyFullscreen(isFullscreen) {

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('window:fullscreen', isFullscreen);
  }

}

function registerAudioIpc() {

  ipcMain.handle('audio:mp3-available', (event) => {

    if (!isTrustedSender(event)) {
      return false;
    }

    const ffmpegPath = resolveFfmpegPath();

    return Boolean(ffmpegPath && fs.existsSync(ffmpegPath));

  });

  ipcMain.handle('audio:encode-mp3', async (event, data, options) => {

    if (!isTrustedSender(event)) {
      throw new Error('Ruxsat yo\'q');
    }

    const ffmpegPath = resolveFfmpegPath();

    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      throw new Error('ffmpeg topilmadi');
    }

    const valid = data instanceof ArrayBuffer || ArrayBuffer.isView(data);

    if (!valid || !data.byteLength || data.byteLength > 500 * 1024 * 1024) {
      throw new Error('Audio ma\'lumoti noto\'g\'ri');
    }

    return encodeToMp3(data, {
      ffmpegPath: ffmpegPath,
      bitrateKbps: options && options.bitrateKbps
    });

  });

}

function buildMenu() {

  const template = [
    {
      label: 'Ko\u2018rinish',
      submenu: [
        { role: 'togglefullscreen', label: 'To\u2018liq ekran' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Dasturchi vositalari' },
        { type: 'separator' },
        { role: 'quit', label: 'Chiqish' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

}

function configureSession() {

  const ses = session.defaultSession;

  /*
    Ruxsatlar: faqat shadowing yozuvi uchun MIKROFON (audio) ruxsat etiladi,
    va faqat dasturning o'z sahifasi uchun. Kamera va boshqalar rad etiladi.
  */
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {

    const requestingUrl = String((details && details.requestingUrl) || webContents.getURL() || '');

    const mediaTypes = (details && details.mediaTypes) || [];

    callback(
      permission === 'media' &&
      requestingUrl.startsWith(appOrigin + '/') &&
      mediaTypes.length > 0 &&
      mediaTypes.every((type) => type === 'audio')
    );

  });

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return permission === 'media' && String(requestingOrigin) === appOrigin;
  });

  /*
    YouTube joylashtirilgan pleyeri so'rovida Referer bo'lishi shart (aks holda "153" xatosi).
    Odatda brauzer o'zi yuboradi; yo'q bo'lsa, dastur manzili qo'yiladi.
  */
  ses.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] },
    (details, callback) => {

      const headers = details.requestHeaders;

      if (!headers.Referer && !headers.referer) {
        headers.Referer = appOrigin + '/';
      }

      callback({ requestHeaders: headers });

    }
  );

  // Oddiy brauzer kabi ko'rinish: "Electron/..." va ilova nomi olib tashlanadi
  const cleanAgent = String(app.userAgentFallback || '')
    .replace(/\sElectron\/\S+/, '')
    .replace(new RegExp('\\s' + String(app.getName()).replace(/[^\w]/g, '.') + '\\/\\S+'), '');

  if (cleanAgent) {
    ses.setUserAgent(cleanAgent);
  }

}

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    show: false,
    title: 'Shadowing Studio',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Oyna orqa fonda bo'lsa ham video / A-B takror to'xtab qolmasin
      backgroundThrottling: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('enter-full-screen', () => notifyFullscreen(true));
  mainWindow.on('leave-full-screen', () => notifyFullscreen(false));

  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  // Yangi oyna ochilmaydi; faqat https havolalar (masalan "YouTube'da ochish") brauzerda ochiladi
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {

    if (/^https:\/\//i.test(url)) {
      shell.openExternal(url);
    }

    return { action: 'deny' };

  });

  // Dastur oynasi boshqa saytga o'tib ketmaydi
  mainWindow.webContents.on('will-navigate', (event, url) => {

    if (!url.startsWith(appOrigin + '/')) {
      event.preventDefault();
    }

  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadURL(appOrigin + '/index.html');

}

if (!app.requestSingleInstanceLock()) {

  // Dastur allaqachon ochiq — ikkinchi nusxa ochilmaydi
  app.quit();

} else {

  app.on('second-instance', () => {

    if (mainWindow) {

      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();

    }

  });

  app.whenReady().then(async () => {

    const { server, listen } = createAppServer(APP_ROOT);

    const port = await listen(PREFERRED_PORT);

    appOrigin = 'http://localhost:' + port;

    app.on('will-quit', () => {
      server.close();
      session.defaultSession.clearCache().catch(() => {});
    });

    configureSession();

    // Oldingi ishdan qolgan keshni tozalaymiz
    await session.defaultSession.clearCache().catch(() => {});
    registerAudioIpc();
    registerWindowIpc();
    buildMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

  }).catch((error) => {

    console.error('Dastur ishga tushmadi:', error);

    app.quit();

  });

}

app.on('window-all-closed', () => {
  app.quit();
});
