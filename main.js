'use strict';

const { app, BrowserWindow, Menu, protocol, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { resolveAppFile } = require('./serve');

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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Oyna orqa fonda bo'lsa ham audio / A-B takror to'xtab qolmasin
      backgroundThrottling: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

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
