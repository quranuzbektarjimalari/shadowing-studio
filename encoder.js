'use strict';

/*
  WAV (yoki boshqa audio) -> MP3 (LAME, CBR) aylantirish.
  Electron'ga bog'liq emas: faqat Node.js + ffmpeg fayli kerak. main.js shu modulni ishlatadi.
*/

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const MIN_BITRATE_KBPS = 128;
const MAX_BITRATE_KBPS = 320;
const DEFAULT_BITRATE_KBPS = 192;

function clampBitrate(value) {

  const number = Math.round(Number(value));

  if (!Number.isFinite(number)) {
    return DEFAULT_BITRATE_KBPS;
  }

  // Sifat talabi: kamida 128 kbps
  return Math.min(MAX_BITRATE_KBPS, Math.max(MIN_BITRATE_KBPS, number));

}

function runProcess(command, args, timeoutMs) {

  return new Promise((resolve, reject) => {

    let stderr = '';
    let finished = false;

    let child;

    try {
      child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (error) {
      reject(error);
      return;
    }

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        child.kill();
        reject(new Error('MP3 kodlash vaqti tugadi'));
      }
    }, timeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-2000);
    });

    child.on('error', (error) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        reject(error);
      }
    });

    child.on('close', (code) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('ffmpeg xatosi (kod ' + code + '): ' + stderr.trim()));
        }
      }
    });

  });

}

/**
 * @param {Buffer|Uint8Array|ArrayBuffer} input  audio fayl baytlari (odatda WAV)
 * @param {{ffmpegPath: string, bitrateKbps?: number, inputExt?: string, timeoutMs?: number}} options
 * @returns {Promise<Buffer>} MP3 baytlari
 */
async function encodeToMp3(input, options = {}) {

  const ffmpegPath = options.ffmpegPath;

  if (!ffmpegPath) {
    throw new Error('ffmpeg topilmadi');
  }

  const bitrate = clampBitrate(options.bitrateKbps);

  const ext = String(options.inputExt || 'wav').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'wav';

  const data = input instanceof ArrayBuffer
    ? Buffer.from(input)
    : Buffer.from(input.buffer, input.byteOffset, input.byteLength);

  if (!data.length) {
    throw new Error('Bo\'sh audio');
  }

  const id = crypto.randomBytes(8).toString('hex');

  const inputFile = path.join(os.tmpdir(), 'shadowing-' + id + '.' + ext);

  const outputFile = path.join(os.tmpdir(), 'shadowing-' + id + '.mp3');

  await fs.promises.writeFile(inputFile, data);

  try {

    await runProcess(
      ffmpegPath,
      [
        '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
        '-i', inputFile,
        '-vn',
        '-map_metadata', '-1',
        '-c:a', 'libmp3lame',
        '-b:a', bitrate + 'k',
        '-f', 'mp3',
        outputFile
      ],
      options.timeoutMs || 180000
    );

    const mp3 = await fs.promises.readFile(outputFile);

    if (!mp3.length) {
      throw new Error('MP3 natijasi bo\'sh');
    }

    return mp3;

  } finally {

    await Promise.allSettled([
      fs.promises.unlink(inputFile),
      fs.promises.unlink(outputFile)
    ]);

  }

}

module.exports = {
  encodeToMp3,
  clampBitrate,
  MIN_BITRATE_KBPS,
  MAX_BITRATE_KBPS,
  DEFAULT_BITRATE_KBPS
};
