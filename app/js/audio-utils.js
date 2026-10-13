/*
  Yozuv uchun sof audio funksiyalar (DOM'ga bog'liq emas — alohida sinab ko'rish mumkin).
*/

/* Shu darajadan (0..1) yuqori cho'qqi "clipping" (ovoz kesilishi) deb hisoblanadi */
export const CLIP_LEVEL = 0.99;

/**
 * Stereo kirishdan mono yozuvni qanday olishni tanlaydi.
 * Studiya interfeyslarida mikrofon ko'pincha faqat 1-kanalda bo'ladi; ikkala kanalni
 * o'rtachalash esa ovozni 6 dB pasaytirib yuboradi. Bir kanal ikkinchisidan
 * sezilarli (>= 12 dB) kuchli bo'lsa — faqat shu kanal olinadi.
 *
 * @param {number} sumSqLeft   chap kanal kvadratlari yig'indisi
 * @param {number|null} sumSqRight  o'ng kanal (mono bo'lsa null)
 * @param {number} samples     bir kanaldagi namunalar soni
 * @returns {"left"|"right"|"avg"}
 */
export function chooseChannelMode(sumSqLeft, sumSqRight, samples) {

  if (sumSqRight === null || sumSqRight === undefined || !samples) {
    return "left";
  }

  const rmsLeft = Math.sqrt(sumSqLeft / samples);

  const rmsRight = Math.sqrt(sumSqRight / samples);

  const loud = Math.max(rmsLeft, rmsRight);

  const quiet = Math.min(rmsLeft, rmsRight);

  // Deyarli jimlik — farq qilishning ma'nosi yo'q
  if (loud < 1e-4) {
    return "avg";
  }

  if (quiet < loud * 0.25) {
    return rmsLeft >= rmsRight ? "left" : "right";
  }

  return "avg";

}

function peakOf(chunks) {

  let peak = 0;

  for (const chunk of chunks) {

    for (let i = 0; i < chunk.length; i++) {

      const value = Math.abs(chunk[i]);

      if (value > peak) {
        peak = value;
      }

    }

  }

  return peak / 32768;

}

/**
 * Int16 bo'laklaridan mono yozuv yig'adi.
 * @returns {{ chunks: Int16Array[], peak: number }} peak: 0..1
 */
export function mixToMono(chunksLeft, chunksRight, mode) {

  if (!chunksRight || mode === "left") {
    return { chunks: chunksLeft, peak: peakOf(chunksLeft) };
  }

  if (mode === "right") {
    return { chunks: chunksRight, peak: peakOf(chunksRight) };
  }

  const mixed = [];

  for (let c = 0; c < chunksLeft.length; c++) {

    const left = chunksLeft[c];

    const right = chunksRight[c];

    const out = new Int16Array(left.length);

    for (let i = 0; i < left.length; i++) {
      out[i] = (left[i] + right[i]) >> 1;
    }

    mixed.push(out);

  }

  return { chunks: mixed, peak: peakOf(mixed) };

}

/**
 * 16-bit mono PCM WAV fayl baytlarini yig'adi.
 */
export function buildWavBuffer(chunks, totalSamples, sampleRate) {

  const dataBytes = totalSamples * 2;

  const buffer = new ArrayBuffer(44 + dataBytes);

  const view = new DataView(buffer);

  const writeText = (offset, text) => {

    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }

  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);              // block align
  view.setUint16(34, 16, true);             // 16 bit
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);

  const pcm = new Int16Array(buffer, 44, totalSamples);

  let offset = 0;

  for (const chunk of chunks) {

    pcm.set(chunk, offset);

    offset += chunk.length;

  }

  return buffer;

}

/**
 * Cho'qqi darajasini (0..1) indikator foiziga (0..100) o'tkazadi: -60 dBFS .. 0 dBFS.
 */
export function levelToPercent(level) {

  if (!(level > 0)) {
    return 0;
  }

  const db = 20 * Math.log10(Math.min(1, level));

  return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));

}
