'use strict';

/*
  app:// protokoli uchun xavfsiz fayl yo'li va MIME turini aniqlash.
  main.js dan foydalaniladi; alohida fayl bo'lgani uchun Electron'siz sinab ko'rish mumkin.
*/

const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2'
};

function resolveAppFile(root, requestUrl) {

  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch (_) {
    return { status: 400, message: 'Bad request' };
  }

  if (pathname.includes('\0')) {
    return { status: 400, message: 'Bad request' };
  }

  if (pathname === '' || pathname === '/') {
    pathname = '/index.html';
  }

  const normalizedRoot = path.normalize(root);

  const filePath = path.normalize(path.join(normalizedRoot, pathname));

  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : normalizedRoot + path.sep;

  // app/ papkasidan tashqariga chiqishga yo'l qo'ymaymiz
  if (!filePath.startsWith(rootWithSep)) {
    return { status: 403, message: 'Forbidden' };
  }

  const ext = path.extname(filePath).toLowerCase();

  return {
    status: 200,
    filePath: filePath,
    mime: MIME[ext] || 'application/octet-stream'
  };

}

module.exports = { resolveAppFile, MIME };
