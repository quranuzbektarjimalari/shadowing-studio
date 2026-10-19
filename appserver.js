'use strict';

/*
  Dastur fayllarini ichki HTTP server orqali beradi (faqat 127.0.0.1).

  Nega "app://" emas: YouTube joylashtirilgan pleyeri (embed) sahifa manzili oddiy
  http(s) bo'lishini talab qiladi (aks holda "153" xatosi). http://localhost qabul qilinadi.

  Xavfsizlik: faqat GET/HEAD; faqat app/ papkasidagi fayllar; Host sarlavhasi tekshiriladi
  (DNS-rebinding'dan himoya); boshqa saytlar bu serverdan hech narsa o'qiy olmaydi.
*/

const http = require('http');
const fs = require('fs');
const { resolveAppFile } = require('./serve');

function createAppServer(root) {

  const server = http.createServer(async (req, res) => {

    const send = (status, body, headers = {}) => {
      res.writeHead(status, Object.assign({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }, headers));
      res.end(req.method === 'HEAD' ? undefined : body);
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
      return;
    }

    // DNS-rebinding himoyasi: faqat localhost / 127.0.0.1 nomi bilan murojaat qilinsa javob beramiz
    const port = server.address() && server.address().port;

    const host = String(req.headers.host || '').toLowerCase();

    if (host !== 'localhost:' + port && host !== '127.0.0.1:' + port) {
      send(403, 'Forbidden host');
      return;
    }

    const result = resolveAppFile(root, 'http://localhost' + req.url);

    if (result.status !== 200) {
      send(result.status, result.message);
      return;
    }

    let data;

    try {
      data = await fs.promises.readFile(result.filePath);
    } catch (_) {
      send(404, 'Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': result.mime,
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    });

    res.end(req.method === 'HEAD' ? undefined : data);

  });

  /** Avval tanlangan port, band bo'lsa — tasodifiy bo'sh port. @returns {Promise<number>} */
  function listen(preferredPort) {

    return new Promise((resolve, reject) => {

      const attempt = (port) => {

        const onError = (error) => {

          server.removeListener('listening', onListening);

          if (error.code === 'EADDRINUSE' && port !== 0) {
            attempt(0);
          } else {
            reject(error);
          }

        };

        const onListening = () => {

          server.removeListener('error', onError);

          resolve(server.address().port);

        };

        server.once('error', onError);

        server.once('listening', onListening);

        server.listen(port, '127.0.0.1');

      };

      attempt(preferredPort);

    });

  }

  return { server, listen };

}

module.exports = { createAppServer };
