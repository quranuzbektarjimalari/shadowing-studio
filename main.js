'use strict';

const { app, BrowserWindow, Menu, ipcMain, protocol, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { resolveAppFile } = require('./serve');
const { encodeToMp3 } = require('./encoder');

const SCHEME = 'app';
const APP_ROOT = path.join(__dirname, 'app');
const ENTRY_URL = SCHEME + '://local/index.html';

/*
  Dastur fayllari file:// emas, maxsus app:// protokoli orqali beriladi.
  Sabab: PDF.js ES-modullari va Web Worker'lari shu usulda ishonchli ishlaydi.
  Bu chaqiruv app "ready" bo'lishidan oldin qilinishi shart.
*/
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

// Audio avto-o'tish (keyingi audioni o'zi boshlash) uchun
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.shadowingstudio.app');
}

let mainWindow = null;

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

  return String(url).startsWith(SCHEME + '://local/');

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

function registerAppProtocol() {

  protocol.handle(SCHEME, async (request) => {

    const result = resolveAppFile(APP_ROOT, request.url);

    if (result.status !== 200) {
      return new Response(result.message, { status: result.status });
    }

    try {

      const data = await fs.promises.readFile(result.filePath);

      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': result.mime }
      });

    } catch (_) {

      return new Response('Not found', { status: 404 });

    }

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
      // Oyna orqa fonda bo'lsa ham audio / A-B takror to'xtab qolmasin
      backgroundThrottling: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('enter-full-screen', () => notifyFullscreen(true));
  mainWindow.on('leave-full-screen', () => notifyFullscreen(false));

  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  // Boshqa saytga o'tish yoki yangi oyna ochishni bloklaymiz (faqat https havolalar brauzerda ochiladi)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(SCHEME + '://')) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadURL(ENTRY_URL);

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

  app.whenReady().then(() => {

    /*
      Ruxsatlar: faqat shadowing yozuvi uchun MIKROFON (audio) ruxsat etiladi,
      va faqat dasturning o'z sahifasi (app://) uchun. Kamera va boshqalar rad etiladi.
    */
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const requestingUrl = String((details && details.requestingUrl) || webContents.getURL() || '');
      const mediaTypes = (details && details.mediaTypes) || [];
      const allowed =
        permission === 'media' &&
        requestingUrl.startsWith(SCHEME + '://local/') &&
        mediaTypes.length > 0 &&
        mediaTypes.every((type) => type === 'audio');
      callback(allowed);
    });

    session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
      return permission === 'media' && String(requestingOrigin).startsWith(SCHEME + '://local');
    });

    registerAppProtocol();
    registerAudioIpc();
    registerWindowIpc();
    buildMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

  });

}

app.on('window-all-closed', () => {
  app.quit();
});
