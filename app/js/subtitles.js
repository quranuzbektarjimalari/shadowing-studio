/*
  Subtitr (SRT / WebVTT) o'qish moduli.
  Sof funksiyalar — DOM'ga bog'liq emas, shuning uchun alohida sinab ko'rish mumkin.
*/

const TIMING_RE =
  /((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})/;

function timestampToSeconds(stamp) {

  // "00:01:02,345" | "01:02.345" | "1:02:03.4"
  const parts = stamp.replace(",", ".").split(":");

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    seconds = Number(parts[2]);
  } else {
    minutes = Number(parts[0]);
    seconds = Number(parts[1]);
  }

  return hours * 3600 + minutes * 60 + seconds;

}

function cleanCueText(raw) {

  return raw
    // HTML / VTT teglar: <i>, <b>, <c.yellow>, <00:00:01.000>, <v Speaker>
    .replace(/<[^>]*>/g, "")
    // ASS / SSA effektlar: {\an8}, {\i1}
    .replace(/\{\\[^}]*\}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

}

/**
 * SRT yoki WebVTT matnini [{ start, end, text }] ga aylantiradi (start bo'yicha tartiblangan).
 */
export function parseSubtitles(input) {

  const text =
    String(input || "")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n");

  const cues = [];

  for (const block of text.split(/\n[ \t]*\n/)) {

    const lines = block.split("\n");

    const timingIndex =
      lines.findIndex((line) => TIMING_RE.test(line));

    if (timingIndex === -1) {
      continue;
    }

    const match = TIMING_RE.exec(lines[timingIndex]);

    const start = timestampToSeconds(match[1]);

    let end = timestampToSeconds(match[2]);

    const cueText =
      cleanCueText(lines.slice(timingIndex + 1).join("\n"));

    if (
      !cueText ||
      !Number.isFinite(start) ||
      !Number.isFinite(end)
    ) {
      continue;
    }

    if (end <= start) {
      end = start + 1;
    }

    cues.push({ start, end, text: cueText });

  }

  cues.sort((a, b) => a.start - b.start);

  return cues;

}

/**
 * Fayl baytlarini matnga aylantiradi: UTF-8 (BOM bilan/siz), UTF-16 (BOM bilan),
 * boshqa holatda Windows-1252.
 */
export function decodeSubtitleBuffer(buffer) {

  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_) {
    return new TextDecoder("windows-1252").decode(bytes);
  }

}

/**
 * t vaqtida (yoki undan oldin) boshlangan oxirgi gapning indeksi; yo'q bo'lsa -1.
 */
export function findCueIndex(cues, t) {

  let low = 0;
  let high = cues.length - 1;
  let answer = -1;

  while (low <= high) {

    const mid = (low + high) >> 1;

    if (cues[mid].start <= t) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }

  }

  return answer;

}
