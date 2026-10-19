/*
  YouTube havolalarini o'qish (sof funksiyalar — DOM'ga bog'liq emas, alohida sinab ko'rish mumkin).
*/

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be"
]);

/* "90" | "90s" | "1m30s" | "1h2m3s" | "1:30" | "1:02:03" -> soniya */
export function parseStartTime(value) {

  const text = String(value || "").trim().toLowerCase();

  if (!text) {
    return 0;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return Math.floor(Number(text));
  }

  if (/^\d+(:\d{1,2}){1,2}$/.test(text)) {

    return text
      .split(":")
      .map(Number)
      .reduce((total, part) => total * 60 + part, 0);

  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);

  if (match && (match[1] || match[2] || match[3])) {

    return (
      Number(match[1] || 0) * 3600 +
      Number(match[2] || 0) * 60 +
      Number(match[3] || 0)
    );

  }

  return 0;

}

/**
 * Bitta havola yoki video ID sini o'qiydi.
 * @returns {{ id: string, start: number, url: string } | null}
 */
export function parseYouTubeLink(raw) {

  let text = String(raw || "").trim();

  if (!text) {
    return null;
  }

  // Faqat 11 belgili video ID
  if (ID_PATTERN.test(text)) {

    return {
      id: text,
      start: 0,
      url: "https://www.youtube.com/watch?v=" + text
    };

  }

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    text = "https://" + text;
  }

  let url;

  try {
    url = new URL(text);
  } catch (_) {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  let id = "";

  if (host === "youtu.be" || host === "www.youtu.be") {

    id = segments[0] || "";

  } else if (segments[0] === "watch") {

    id = url.searchParams.get("v") || "";

  } else if (["embed", "shorts", "live", "v", "e"].includes(segments[0])) {

    id = segments[1] || "";

  }

  if (!ID_PATTERN.test(id)) {
    return null;
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  const start = parseStartTime(
    url.searchParams.get("t") ||
    url.searchParams.get("start") ||
    hashParams.get("t") ||
    ""
  );

  return {
    id: id,
    start: start,
    url: "https://www.youtube.com/watch?v=" + id
  };

}

/**
 * Matndan (bir nechta qator / bo'sh joy bilan ajratilgan) havolalarni ajratib oladi.
 * Bitta so'zdan iborat matn bo'lsa, oddiy video ID ham qabul qilinadi.
 * @returns {{ links: {id,start,url}[], invalid: string[] }}
 */
export function extractYouTubeLinks(input) {

  const tokens = String(input || "").split(/\s+/).filter(Boolean);

  const links = [];

  const invalid = [];

  const seen = new Set();

  for (const token of tokens) {

    const looksLikeLink = /:\/\/|youtu/i.test(token);

    if (tokens.length > 1 && !looksLikeLink) {
      continue;
    }

    const parsed = parseYouTubeLink(token);

    if (!parsed) {

      if (looksLikeLink || tokens.length === 1) {
        invalid.push(token);
      }

      continue;

    }

    const key = parsed.id + "@" + parsed.start;

    if (!seen.has(key)) {
      seen.add(key);
      links.push(parsed);
    }

  }

  return { links: links, invalid: invalid };

}
