"use strict";

import {
  parseSubtitles,
  decodeSubtitleBuffer,
  findCueIndex
} from "./subtitles.js";

import {
  chooseChannelMode,
  mixToMono,
  buildWavBuffer,
  levelToPercent,
  CLIP_LEVEL
} from "./audio-utils.js";

import { YouTubeMedia } from "./youtube-media.js";

import { extractYouTubeLinks } from "./youtube-url.js";

/* =========================================================
   GLOBAL ERROR PROTECTION
========================================================= */

window.addEventListener("error", (event) => {
  console.error("Application error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

/* =========================================================
   ELEMENTS
========================================================= */

const $ = (id) => document.getElementById(id);

const ytHost = $("ytHost");
const shield = $("videoShield");
const takeAudio = $("takeAudio");

/* YouTube pleyeri: video oqim bo'lib keladi (yuklanmaydi). <video> elementiga o'xshab ishlaydi. */
const video = new YouTubeMedia(ytHost, { origin: window.location.origin });

const openVideoBtn = $("openVideoBtn");

const urlDialog = $("urlDialog");
const urlText = $("urlText");
const urlHint = $("urlHint");
const urlOpenBtn = $("urlOpenBtn");
const urlAddBtn = $("urlAddBtn");
const urlCancelBtn = $("urlCancelBtn");
const subInput = $("subInput");
const openSubBtn = $("openSubBtn");

const stagePlaceholder = $("stagePlaceholder");
const subtitleText = $("subtitleText");
const recIndicator = $("recIndicator");
const recTimeEl = $("recTime");

const sentenceBtn = $("sentenceBtn");
const autoPauseBtn = $("autoPauseBtn");
const subBtn = $("subBtn");
const recBtn = $("recBtn");
const compareBtn = $("compareBtn");

const cuePrevBtn = $("cuePrevBtn");
const cueNextBtn = $("cueNextBtn");
const cueInput = $("cueInput");
const cueCount = $("cueCount");

const prevVideoBtn = $("prevVideoBtn");
const playBtn = $("playBtn");
const nextVideoBtn = $("nextVideoBtn");
const panelBtn = $("panelBtn");
const panelBadge = $("panelBadge");

const progress = $("progress");
const currentTimeEl = $("currentTime");
const durationEl = $("duration");
const speedBtn = $("speedBtn");
const muteBtn = $("muteBtn");
const volume = $("volume");
const loopBtn = $("loopBtn");
const btnA = $("btnA");
const btnB = $("btnB");
const clearLoopBtn = $("clearLoopBtn");
const statusEl = $("status");

const sidePanel = $("sidePanel");
const panelCloseBtn = $("panelCloseBtn");
const tabButtons = {
  videos: $("tabVideos"),
  cues: $("tabCues"),
  takes: $("tabTakes")
};
const panes = {
  videos: $("paneVideos"),
  cues: $("paneCues"),
  takes: $("paneTakes")
};
const videosTitle = $("videosTitle");
const cuesTitle = $("cuesTitle");
const takesTitle = $("takesTitle");
const videoList = $("videoList");
const cueList = $("cueList");
const takeList = $("takeList");
const addVideoBtn = $("addVideoBtn");
const autoNextBtn = $("autoNextBtn");
const clearVideosBtn = $("clearVideosBtn");
const loadSubBtn = $("loadSubBtn");
const removeSubBtn = $("removeSubBtn");
const clearTakesBtn = $("clearTakesBtn");
const studioBtn = $("studioBtn");
const micSelect = $("micSelect");
const micRefreshBtn = $("micRefreshBtn");
const bitrateSelect = $("bitrateSelect");
const formatNote = $("formatNote");
const recMeterFill = $("recMeterFill");
const toastEl = $("toast");
const videoFrame = $("videoFrame");
const zoomOutBtn = $("zoomOutBtn");
const zoomResetBtn = $("zoomResetBtn");
const zoomInBtn = $("zoomInBtn");
const miniProgress = $("miniProgress");
const dropOverlay = $("dropOverlay");

/* =========================================================
   STATE
========================================================= */

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

/* Gap atrofidagi qo'shimcha vaqt: so'zning boshi / oxiri kesilmasligi uchun */
const PAD_BEFORE = 0.1;
const PAD_AFTER = 0.2;

const MAX_TAKES = 15;
const MAX_RECORD_SECONDS = 600;

let speedIndex = 2;
let previousVolume = 1;


/* playlist: { file, name, key, subFile, subName, cues } */
let playlist = [];
let playlistIndex = -1;
let autoNext = true;

/* subtitr */
let cues = [];
let cueIdx = -1;
let cueEls = [];
let subsVisible = true;
let subScale = 1;

/* A-B / gapni takrorlash */
let pointA = null;
let pointB = null;
let loopEnabled = false;
let sentenceLoop = false;
let sentenceCueIdx = -1;
let autoPause = false;
let lastTickTime = -1;

/* yozish / solishtirish */
let takes = [];
let takeCounter = 0;
let recSession = null;
let recStarting = false;
let recTimerId = 0;
let compareToken = 0;
let compareActive = false;
let playingTakeId = null;

/* video masshtabi (zoom) va siljitish (pan) */
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

let videoZoom = 1;
let panX = 0;
let panY = 0;
let panDrag = null;
let suppressClick = false;

/* to'liq ekran / boshqaruvni yashirish */
let controlsHidden = false;
let isFullscreen = false;
let peekPinned = false;
let peekTimer = 0;
let cursorIdleTimer = 0;

/* panel */
let currentTab = "videos";

/* =========================================================
   HELPERS
========================================================= */

function fileName(file) {
  return String(file && file.name || "").toLowerCase();
}

function isSubtitleFile(file) {

  const name = fileName(file);

  return name.endsWith(".srt") || name.endsWith(".vtt");

}

function hasVideoSource() {
  return typeof video.src === "string" && video.src.trim() !== "";
}

function noVideo() {
  showStatus("Avval YouTube havolasini kiriting (Ctrl+O)");
}

function getFiniteDuration() {

  const value = Number(video.duration);

  return Number.isFinite(value) && value >= 0 ? value : 0;

}

function clampTime(value) {

  const total = getFiniteDuration();

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  if (total <= 0) {
    return Math.max(0, numeric);
  }

  return Math.max(0, Math.min(total, numeric));

}

function seekTo(time) {

  try {
    video.currentTime = clampTime(time);
  } catch (error) {
    console.error("Video seek error:", error);
  }

}

function seekBy(delta) {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  seekTo((Number(video.currentTime) || 0) + delta);

  showStatus(
    (delta > 0 ? "+" : "") + delta + "s · " +
    formatTime(video.currentTime) + " / " + formatTime(getFiniteDuration())
  );

}

function formatTime(seconds) {

  const value = Number(seconds);

  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);

  const secs = Math.floor(value % 60);

  return minutes + ":" + String(secs).padStart(2, "0");

}

/* =========================================================
   STATUS
========================================================= */

let statusTimer = null;
let toastTimer = null;

function showToast(text, durationMs) {

  clearTimeout(toastTimer);

  toastEl.textContent = text;

  toastEl.classList.add("show");

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, durationMs);

}

function showStatus(text, durationMs = 1500) {

  const message = String(text || "");

  clearTimeout(statusTimer);

  statusEl.textContent = message;

  statusEl.title = message;

  // Pleyerdagi joy tor — uzun xabarlar videoning ustida to'liq ko'rsatiladi.
  // Boshqaruv yashirin bo'lsa pleyer ko'rinmaydi, shuning uchun hamma xabar videoning ustida chiqadi.
  if (message.length > 16) {
    showToast(message, Math.max(Number(durationMs) || 0, 2200));
  } else if (controlsHidden && message) {
    showToast(message, Math.max(Number(durationMs) || 0, 1100));
  }

  if (Number.isFinite(durationMs) && durationMs > 0) {

    statusTimer = setTimeout(() => {
      statusEl.textContent = "";
      statusEl.title = "";
    }, durationMs);

  }

}

/* =========================================================
   PLAY / PAUSE
========================================================= */

function updatePlayIcon() {

  playBtn.innerHTML = video.paused
    ? '<i class="fa-solid fa-play"></i>'
    : '<i class="fa-solid fa-pause"></i>';

}

async function playVideo() {

  try {
    await video.play();
  } catch (error) {

    if (error && error.name === "AbortError") {
      return;
    }

    console.error("Video play error:", error);

    showStatus("Video ijro etilmadi");

  }

  updatePlayIcon();

}

async function togglePlay() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  // Solishtirish davom etayotgan bo'lsa — uni to'xtatamiz
  if (compareActive) {
    cancelCompare();
    video.pause();
    updatePlayIcon();
    return;
  }

  stopTakePlayback();

  if (video.paused) {
    await playVideo();
  } else {
    video.pause();
  }

  updatePlayIcon();

  if (controlsHidden) {
    showStatus(video.paused ? "Pauza" : "Ijro", 900);
  }

}

playBtn.addEventListener("click", togglePlay);

shield.addEventListener("click", () => {

  // Sudrab siljitishni tugatgan "click" video'ni to'xtatib qo'ymasin
  if (suppressClick) {
    suppressClick = false;
    return;
  }

  togglePlay();

});

shield.addEventListener("dblclick", toggleFullscreen);

stagePlaceholder.addEventListener("click", () => openVideoBtn.click());

/* =========================================================
   TO'LIQ EKRAN va BOSHQARUVNI YASHIRISH
   To'liq ekranda faqat video va subtitr ko'rinadi, dastur klaviatura bilan boshqariladi.
   Boshqaruvlar: oynaning yuqori/pastki chetiga sichqoncha olib borilganda yoki "H" bilan.
========================================================= */

function setControlsHidden(on) {

  controlsHidden = on;

  document.body.classList.toggle("controls-hidden", on);

  if (!on) {

    peekPinned = false;

    clearTimeout(peekTimer);

    clearTimeout(cursorIdleTimer);

    document.body.classList.remove("controls-peek", "cursor-idle");

  }

}

function peekControls() {

  document.body.classList.add("controls-peek");

  clearTimeout(peekTimer);

  if (peekPinned) {
    return;
  }

  const hideLater = () => {

    if (peekPinned) {
      return;
    }

    // Sichqoncha panel ustida turgan bo'lsa, yopib yubormaymiz
    if (document.querySelector("#playerBar:hover, #toolStrip:hover, #sidePanel:hover")) {
      peekTimer = setTimeout(hideLater, 600);
      return;
    }

    document.body.classList.remove("controls-peek");

  };

  peekTimer = setTimeout(hideLater, 2500);

}

/* "H": to'liq ekranda — panelni qadab qo'yish / yashirish; oynada — boshqaruvni yashirish / qaytarish */
function toggleControls() {

  if (!isFullscreen) {

    setControlsHidden(!controlsHidden);

    showStatus(
      controlsHidden
        ? "Boshqaruv yashirildi (H — qaytarish)"
        : "Boshqaruv qaytarildi",
      2500
    );

    return;

  }

  if (!controlsHidden) {
    setControlsHidden(true);
  }

  peekPinned = !peekPinned;

  if (peekPinned) {

    clearTimeout(peekTimer);

    document.body.classList.add("controls-peek");

  } else {

    document.body.classList.remove("controls-peek");

  }

}

function onFullscreenState(isFull) {

  isFullscreen = Boolean(isFull);

  setControlsHidden(isFullscreen);

  if (isFullscreen) {

    showToast(
      "To'liq ekran · H — boshqaruv · I — ma'lumot · F yoki Esc — chiqish",
      4500
    );

  }

}

async function toggleFullscreen() {

  // O'rnatilgan dasturda oynaning o'zi to'liq ekranga o'tadi (Esc ham ishlaydi)
  if (native && typeof native.toggleFullscreen === "function") {

    try {
      await native.toggleFullscreen();
    } catch (error) {
      console.error("Fullscreen error:", error);
    }

    return;

  }

  try {

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }

  } catch (error) {
    console.error("Fullscreen error:", error);
  }

}

function initFullscreenSupport() {

  document.addEventListener("fullscreenchange", () => {
    onFullscreenState(Boolean(document.fullscreenElement));
  });

  // F11 yoki menyu orqali o'zgarganda ham holat yangilanadi
  if (native && typeof native.onFullscreenChange === "function") {
    native.onFullscreenChange(onFullscreenState);
  }

}

document.addEventListener("mousemove", (e) => {

  document.body.classList.remove("cursor-idle");

  clearTimeout(cursorIdleTimer);

  if (!controlsHidden) {
    return;
  }

  // Boshqaruv yashirin: sichqoncha harakatsiz qolsa, kursor ham yashirinadi
  cursorIdleTimer = setTimeout(() => {
    document.body.classList.add("cursor-idle");
  }, 2200);

  const target = e.target instanceof Element ? e.target : null;

  const nearEdge =
    e.clientY >= window.innerHeight - 80 || e.clientY <= 56;

  if (nearEdge || (target && target.closest("#playerBar, #toolStrip, #sidePanel"))) {
    peekControls();
  }

});

function showInfo() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  let text =
    formatTime(video.currentTime) + " / " + formatTime(getFiniteDuration()) +
    " · " + speeds[speedIndex] + "x";

  if (cues.length) {
    text += " · Gap " + Math.max(0, cueIdx + 1) + " / " + cues.length;
  }

  if (videoZoom !== 1) {
    text += " · Zoom " + Math.round(videoZoom * 100) + "%";
  }

  showStatus(text, 2800);

}

/* =========================================================
   TIME / PROGRESS
========================================================= */

function updateProgressUI() {

  const total = getFiniteDuration();

  const current = Number(video.currentTime);

  if (total > 0) {

    progress.max = String(total);

    progress.value = String(
      Math.min(total, Math.max(0, Number.isFinite(current) ? current : 0))
    );

  }

  currentTimeEl.textContent = formatTime(current);

  durationEl.textContent = formatTime(total);

  miniProgress.style.setProperty(
    "--mini-progress",
    (total > 0 && Number.isFinite(current)
      ? Math.max(0, Math.min(100, (current / total) * 100))
      : 0).toFixed(2) + "%"
  );

}

function resetProgressUI() {

  progress.value = "0";
  progress.max = "0";
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";

}

video.addEventListener("loadedmetadata", () => {

  // Yangi videoning nisbati boshqa bo'lishi mumkin: masshtab saqlanadi, siljitish nolga qaytadi
  panX = 0;
  panY = 0;
  applyVideoTransform();

  // Havoladagi boshlanish vaqti (t=...) bo'lsa, haqiqiy joy ko'rsatiladi
  updateProgressUI();

  tickCue(Number(video.currentTime) || 0);

});

video.addEventListener("timeupdate", () => {

  updateProgressUI();

  checkABLoop();

  tickCue(Number(video.currentTime) || 0);

});

video.addEventListener("seeking", () => {

  lastTickTime = -1;

});

video.addEventListener("seeked", () => {

  lastTickTime = Number(video.currentTime) || 0;

  updateProgressUI();

  tickCue(lastTickTime);

});

progress.addEventListener("input", () => {

  if (!hasVideoSource()) {
    return;
  }

  const value = Number(progress.value);

  if (!Number.isFinite(value)) {
    return;
  }

  seekTo(value);

});

// Slayder qo'yib yuborilgach fokus olib tashlanadi, aks holda tezkor tugmalar ishlamay qoladi
progress.addEventListener("change", () => progress.blur());

video.addEventListener("canplay", updatePlayIcon);
video.addEventListener("play", updatePlayIcon);
video.addEventListener("pause", updatePlayIcon);

video.addEventListener("ended", () => {

  updatePlayIcon();

  // A-B yoki gap takrori faol bo'lsa, undan chiqib ketmaymiz
  if (loopEnabled && pointA !== null && pointB !== null) {
    return;
  }

  if (
    autoNext &&
    playlistIndex >= 0 &&
    playlistIndex < playlist.length - 1
  ) {
    loadTrack(playlistIndex + 1, { autoplay: true });
  }

});

function describeVideoError(error) {

  switch (error && error.code) {

    case 2:
      return "YouTube havolasi noto'g'ri";

    case 5:
      return "YouTube pleyer xatosi — qayta urinib ko'ring";

    case 100:
      return "Video topilmadi yoki yopiq (private)";

    case 101:
    case 150:
    case 152:
      return "Video egasi bu videoni boshqa dasturlarda ko'rsatishni taqiqlagan";

    case 153:
      return "YouTube pleyer sozlamasi xatosi (153) — dasturni qayta ishga tushiring";

    case "api":
      return "YouTube yuklanmadi — internetni tekshiring";

    default:
      return "Videoni ochib bo'lmadi";

  }

}

video.addEventListener("error", () => {

  if (!hasVideoSource()) {
    return;
  }

  console.error("YouTube player error:", video.error);

  updatePlayIcon();

  showStatus(describeVideoError(video.error), 6000);

});

// Sarlavha YouTube'dan olinadi (havola kiritilganda faqat ID ma'lum bo'ladi)
function syncTrackTitle() {

  const track = playlist[playlistIndex];

  if (!track || track.id !== video.videoId) {
    return;
  }

  const title = video.title;

  if (title && title !== track.title) {

    track.title = title;

    renderVideoList();

    updateTitleAndPlaceholder();

  }

}

video.addEventListener("loadedmetadata", syncTrackTitle);
video.addEventListener("canplay", syncTrackTitle);
video.addEventListener("playing", syncTrackTitle);

/* =========================================================
   FRAME LOOP — A-B / gap takrori / "gapdan keyin to'xta" aniq ishlashi uchun
   (timeupdate ~250 ms da bir marta keladi; ijro paytida har kadrda tekshiramiz)
========================================================= */

let frameId = 0;

function frameLoop() {

  frameId = 0;

  if (video.paused || video.ended) {
    return;
  }

  checkABLoop();

  tickCue(Number(video.currentTime) || 0);

  frameId = requestAnimationFrame(frameLoop);

}

function startFrameLoop() {

  if (!frameId && !video.paused) {
    frameId = requestAnimationFrame(frameLoop);
  }

}

video.addEventListener("play", startFrameLoop);
video.addEventListener("playing", startFrameLoop);

/* =========================================================
   SPEED
========================================================= */

function updateSpeed() {

  if (!Number.isFinite(speeds[speedIndex]) || speeds[speedIndex] <= 0) {
    speedIndex = speeds.indexOf(1);
  }

  const safeSpeed = speeds[speedIndex];

  video.playbackRate = safeSpeed;

  speedBtn.textContent = safeSpeed + "x";

}

function nextSpeed() {

  speedIndex = (speedIndex + 1) % speeds.length;

  updateSpeed();

  showStatus("Tezlik: " + speeds[speedIndex] + "x");

}

function resetSpeed() {

  speedIndex = speeds.indexOf(1);

  updateSpeed();

  showStatus("Tezlik: 1x");

}

speedBtn.addEventListener("click", nextSpeed);

/* =========================================================
   VOLUME
========================================================= */

function updateMuteIcon(vol) {

  const safe = Number.isFinite(Number(vol)) ? Number(vol) : 0;

  let icon = "fa-volume-high";

  if (safe <= 0) {
    icon = "fa-volume-xmark";
  } else if (safe < 0.5) {
    icon = "fa-volume-low";
  }

  muteBtn.innerHTML = '<i class="fa-solid ' + icon + '"></i>';

}

function setVolume(value) {

  let v = Number(value);

  if (!Number.isFinite(v)) {
    v = 1;
  }

  v = Math.max(0, Math.min(1, v));

  video.volume = v;

  volume.value = String(v);

  if (v > 0) {
    previousVolume = v;
  }

  updateMuteIcon(v);

}

function changeVolume(delta) {

  setVolume(video.volume + delta);

  showStatus("Ovoz: " + Math.round(video.volume * 100) + "%");

}

volume.addEventListener("input", () => setVolume(volume.value));

volume.addEventListener("change", () => volume.blur());

muteBtn.addEventListener("click", () => {

  if (video.volume > 0) {

    previousVolume = video.volume;

    video.volume = 0;

    volume.value = "0";

  } else {

    const restored = Number.isFinite(Number(previousVolume))
      ? Math.max(0.01, Math.min(1, Number(previousVolume)))
      : 1;

    video.volume = restored;

    volume.value = String(restored);

  }

  updateMuteIcon(video.volume);

  showStatus(video.volume > 0 ? "Ovoz yoqildi" : "Ovoz o'chirildi");

});

/* =========================================================
   A-B LOOP  (+ gapni takrorlash shu mexanizm ustida ishlaydi)
========================================================= */

function updateLoopButton() {

  loopBtn.classList.toggle("active", Boolean(loopEnabled || video.loop));

}

function updateSentenceButton() {

  sentenceBtn.classList.toggle("active", sentenceLoop);

}

function setPointA() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  const current = Number(video.currentTime);

  // A nuqta currentTime'dan 0.2 sekund oldin olinadi
  pointA = Math.max(0, (Number.isFinite(current) ? Math.max(0, current) : 0) - 0.2);

  pointB = null;

  loopEnabled = false;

  sentenceLoop = false;

  sentenceCueIdx = -1;

  video.loop = false;

  btnA.classList.add("active");
  btnB.classList.remove("active");

  updateLoopButton();
  updateSentenceButton();

  showStatus("A: " + formatTime(pointA));

}

function setPointB() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (pointA === null) {
    showStatus("Avval A ni bosing");
    return;
  }

  const calculatedB = Number(video.currentTime);

  if (!Number.isFinite(calculatedB)) {
    showStatus("B nuqtani aniqlab bo'lmadi");
    return;
  }

  if (calculatedB <= pointA) {
    showStatus("B A dan keyin bo'lishi kerak");
    return;
  }

  pointB = calculatedB;

  loopEnabled = true;

  sentenceLoop = false;

  sentenceCueIdx = -1;

  video.loop = false;

  btnB.classList.add("active");
  loopBtn.classList.add("active");

  updateSentenceButton();

  seekTo(pointA);

  if (video.paused) {
    playVideo();
  }

  showStatus("A-B faol");

}

function checkABLoop() {

  if (
    compareActive ||
    !loopEnabled ||
    pointA === null ||
    pointB === null ||
    !hasVideoSource()
  ) {
    return;
  }

  const current = Number(video.currentTime);

  if (Number.isFinite(current) && current >= pointB) {
    seekTo(pointA);
  }

}

function clearABLoop(showMessage = true) {

  pointA = null;
  pointB = null;
  loopEnabled = false;
  sentenceLoop = false;
  sentenceCueIdx = -1;

  btnA.classList.remove("active");
  btnB.classList.remove("active");

  updateLoopButton();
  updateSentenceButton();

  if (hasVideoSource()) {
    tickCue(Number(video.currentTime) || 0);
  }

  if (showMessage) {
    showStatus("A-B loop o'chirildi");
  }

}

btnA.addEventListener("click", setPointA);
btnB.addEventListener("click", setPointB);
clearLoopBtn.addEventListener("click", () => clearABLoop(true));

loopBtn.addEventListener("click", () => {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (pointA !== null && pointB !== null) {

    loopEnabled = !loopEnabled;

    video.loop = false;

    if (!loopEnabled) {
      sentenceLoop = false;
      sentenceCueIdx = -1;
      updateSentenceButton();
    }

  } else {

    video.loop = !video.loop;

    loopEnabled = false;

  }

  updateLoopButton();

  showStatus(
    pointA !== null && pointB !== null
      ? (loopEnabled ? "A-B takror yoqildi" : "A-B takror o'chirildi")
      : (video.loop ? "Video takrori yoqildi" : "Video takrori o'chirildi")
  );

});

/* =========================================================
   VIDEO ZOOM (kattalashtirish / kichiklashtirish) va PAN (siljitish)
   Faqat video rasmi o'zgaradi — subtitr va boshqaruv elementlari joyida qoladi.
========================================================= */

function frameSize() {

  const rect = videoFrame.getBoundingClientRect();

  return { w: rect.width, h: rect.height };

}

/* Zoom 100% bo'lgandagi video rasmining ramka ichidagi o'lchami (object-fit: contain) */
function fittedVideoSize() {

  const frame = frameSize();

  const vw = video.videoWidth;

  const vh = video.videoHeight;

  if (!vw || !vh) {
    return frame;
  }

  const scale = Math.min(frame.w / vw, frame.h / vh);

  return { w: vw * scale, h: vh * scale };

}

function clampPan() {

  const frame = frameSize();

  const fit = fittedVideoSize();

  // Kattalashgan rasm ramkadan kichik bo'lsa — siljitish yo'q (markazda turadi)
  const maxX = Math.max(0, (fit.w * videoZoom - frame.w) / 2);

  const maxY = Math.max(0, (fit.h * videoZoom - frame.h) / 2);

  panX = Math.max(-maxX, Math.min(maxX, panX));

  panY = Math.max(-maxY, Math.min(maxY, panY));

}

function applyVideoTransform() {

  clampPan();

  ytHost.style.transform =
    videoZoom === 1 && panX === 0 && panY === 0
      ? ""
      : "translate(" + panX + "px, " + panY + "px) scale(" + videoZoom + ")";

  zoomResetBtn.textContent = Math.round(videoZoom * 100) + "%";

  zoomInBtn.disabled = videoZoom >= ZOOM_MAX - 1e-9;

  zoomOutBtn.disabled = videoZoom <= ZOOM_MIN + 1e-9;

  videoFrame.classList.toggle("zoomed", videoZoom > 1);

}

/**
 * @param {number} target  yangi masshtab (1 = 100%)
 * @param {{x:number,y:number}=} anchor  ramka markaziga nisbatan nuqta (px) — zoom shu nuqta tomon
 */
function setVideoZoom(target, anchor) {

  const next = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target)) * 100) / 100;

  const ratio = next / videoZoom;

  if (anchor) {

    // Kursor ostidagi nuqta joyida qoladi
    panX = anchor.x - (anchor.x - panX) * ratio;

    panY = anchor.y - (anchor.y - panY) * ratio;

  } else {

    panX *= ratio;

    panY *= ratio;

  }

  videoZoom = next;

  applyVideoTransform();

}

function zoomBy(delta) {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  setVideoZoom(videoZoom + delta);

  showStatus("Zoom: " + Math.round(videoZoom * 100) + "%");

}

function resetVideoZoom() {

  panX = 0;

  panY = 0;

  setVideoZoom(1);

  showStatus("Zoom: 100%");

}

zoomInBtn.addEventListener("click", () => zoomBy(ZOOM_STEP));

zoomOutBtn.addEventListener("click", () => zoomBy(-ZOOM_STEP));

zoomResetBtn.addEventListener("click", resetVideoZoom);

/* Ctrl + g'ildirak (yoki touchpad chimchilash): kursor tomon zoom */
videoFrame.addEventListener(
  "wheel",
  (e) => {

    if (!e.ctrlKey && !e.metaKey) {
      return;
    }

    e.preventDefault();

    if (!hasVideoSource()) {
      return;
    }

    const rect = videoFrame.getBoundingClientRect();

    setVideoZoom(
      videoZoom * Math.exp(-e.deltaY * 0.0025),
      {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      }
    );

  },
  { passive: false }
);

/* Kattalashtirilganda videoni sichqoncha (yoki barmoq) bilan siljitish */
shield.addEventListener("pointerdown", (e) => {

  suppressClick = false;

  if (e.button !== 0 || videoZoom <= 1) {
    return;
  }

  panDrag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    startPanX: panX,
    startPanY: panY,
    moved: false
  };

  try {
    shield.setPointerCapture(e.pointerId);
  } catch (_) {}

});

shield.addEventListener("pointermove", (e) => {

  if (!panDrag || e.pointerId !== panDrag.id) {
    return;
  }

  const dx = e.clientX - panDrag.x;

  const dy = e.clientY - panDrag.y;

  // Tasodifiy titroq "siljitish" deb hisoblanmasin
  if (!panDrag.moved && Math.hypot(dx, dy) < 4) {
    return;
  }

  panDrag.moved = true;

  videoFrame.classList.add("panning");

  panX = panDrag.startPanX + dx;

  panY = panDrag.startPanY + dy;

  applyVideoTransform();

});

function endPan(e) {

  if (!panDrag || e.pointerId !== panDrag.id) {
    return;
  }

  if (panDrag.moved) {
    suppressClick = true;
  }

  panDrag = null;

  videoFrame.classList.remove("panning");

  try {
    shield.releasePointerCapture(e.pointerId);
  } catch (_) {}

}

shield.addEventListener("pointerup", endPan);

shield.addEventListener("pointercancel", endPan);

// Oyna / ramka o'lchami o'zgarsa (to'liq ekran ham) — siljitish chegarasi qayta hisoblanadi
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => applyVideoTransform()).observe(videoFrame);
}

/* =========================================================
   SUBTITLES: gaplar, ustki yozuv, navigatsiya
========================================================= */

function cueWindow(i) {

  const cue = cues[i];

  const prev = cues[i - 1];

  const next = cues[i + 1];

  let a = Math.max(0, cue.start - PAD_BEFORE);

  if (prev) {
    a = Math.max(a, Math.min(prev.end, cue.start));
  }

  let b = cue.end + PAD_AFTER;

  if (next) {
    b = Math.min(b, Math.max(next.start, cue.end));
  }

  const total = getFiniteDuration();

  if (total > 0) {
    b = Math.min(b, total);
  }

  return { a, b };

}

function pauseLimit(i) {

  return cueWindow(i).b;

}

let shownSubtitle = "";

function setSubtitleText(text) {

  if (text === shownSubtitle) {
    return;
  }

  shownSubtitle = text;

  subtitleText.textContent = text;

}

function refreshCueNumbers() {

  cueCount.textContent = String(cues.length);

  cueInput.disabled = cues.length === 0;

  if (document.activeElement !== cueInput) {
    cueInput.value = cues.length ? String(Math.max(0, cueIdx + 1)) : "0";
  }

  cueInput.max = String(Math.max(1, cues.length));

}

function onCueChanged() {

  refreshCueNumbers();

  highlightCue();

}

function tickCue(t) {

  let idx = -1;

  if (cues.length) {

    idx =
      sentenceLoop && sentenceCueIdx >= 0
        ? sentenceCueIdx
        : findCueIndex(cues, t);

  }

  if (idx !== cueIdx) {

    cueIdx = idx;

    onCueChanged();

  }

  let text = "";

  if (idx >= 0) {

    const cue = cues[idx];

    if (sentenceLoop || t < cue.end + 0.05) {
      text = cue.text;
    }

  }

  setSubtitleText(text);

  // "Gapdan keyin to'xta": gap oxiridan o'tgan paytni aniqlaymiz
  if (
    autoPause &&
    !loopEnabled &&
    !compareActive &&
    !video.paused &&
    lastTickTime >= 0 &&
    cues.length
  ) {

    const previousIdx = findCueIndex(cues, lastTickTime);

    if (previousIdx >= 0) {

      const limit = pauseLimit(previousIdx);

      if (
        lastTickTime < limit &&
        t >= limit &&
        t - lastTickTime < 1
      ) {

        video.pause();

        showStatus("Takrorlang...", 2500);

      }

    }

  }

  lastTickTime = t;

}

function setCues(list) {

  cues = Array.isArray(list) ? list : [];

  cueIdx = -2;

  shownSubtitle = "\u0000";

  if (sentenceLoop) {
    clearABLoop(false);
  }

  renderCueList();

  refreshCueNumbers();

  tickCue(Number(video.currentTime) || 0);

  removeSubBtn.disabled = cues.length === 0;

}

function jumpToCue(i, options = {}) {

  if (!cues.length) {
    return;
  }

  const index = Math.max(0, Math.min(cues.length - 1, i));

  if (sentenceLoop) {

    applySentenceLoop(index, { seek: true, play: Boolean(options.play) });

  } else {

    seekTo(cues[index].start);

    showStatus("Gap " + (index + 1) + " / " + cues.length);

    if (options.play && video.paused) {
      playVideo();
    }

  }

  tickCue(Number(video.currentTime) || 0);

}

function nextCue() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (!cues.length) {
    seekBy(5);
    return;
  }

  const t = Number(video.currentTime) || 0;

  const target =
    (sentenceLoop && sentenceCueIdx >= 0
      ? sentenceCueIdx
      : findCueIndex(cues, t + 0.05)) + 1;

  if (target >= cues.length) {
    showStatus("Oxirgi gap");
    return;
  }

  jumpToCue(target);

}

function prevCue() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (!cues.length) {
    seekBy(-5);
    return;
  }

  const t = Number(video.currentTime) || 0;

  const current =
    sentenceLoop && sentenceCueIdx >= 0
      ? sentenceCueIdx
      : findCueIndex(cues, t);

  // Gap boshidan 1 soniyadan ko'p o'tgan bo'lsa — shu gapni boshidan
  const target =
    !sentenceLoop && current >= 0 && t - cues[current].start > 1
      ? current
      : Math.max(0, current - 1);

  jumpToCue(target);

}

function firstCue() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (cues.length) {
    jumpToCue(0);
  } else {
    seekTo(0);
    showStatus("Boshiga");
  }

}

function lastCue() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (cues.length) {
    jumpToCue(cues.length - 1);
  } else {
    seekTo(getFiniteDuration());
  }

}

cuePrevBtn.addEventListener("click", prevCue);
cueNextBtn.addEventListener("click", nextCue);

cueInput.addEventListener("change", () => {

  const value = Number(cueInput.value);

  if (!cues.length || !Number.isFinite(value)) {
    refreshCueNumbers();
    return;
  }

  jumpToCue(Math.floor(value) - 1);

  cueInput.blur();

});

cueInput.addEventListener("blur", refreshCueNumbers);

/* ---------- gapni takrorlash ---------- */

function applySentenceLoop(i, options = {}) {

  const w = cueWindow(i);

  pointA = w.a;
  pointB = w.b;

  loopEnabled = true;
  sentenceLoop = true;
  sentenceCueIdx = i;

  video.loop = false;

  btnA.classList.add("active");
  btnB.classList.add("active");

  updateLoopButton();
  updateSentenceButton();

  if (options.seek) {
    seekTo(w.a);
  }

  if (options.play && video.paused) {
    playVideo();
  }

  showStatus("Gap " + (i + 1) + " takrori");

}

function toggleSentenceLoop() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (sentenceLoop) {

    clearABLoop(false);

    showStatus("Gap takrori o'chirildi");

    return;

  }

  if (!cues.length) {

    showStatus("Gap takrori uchun subtitr kerak (A-B dan foydalaning)", 3000);

    return;

  }

  const t = Number(video.currentTime) || 0;

  const index = Math.max(0, findCueIndex(cues, t));

  applySentenceLoop(index, { seek: true, play: true });

}

sentenceBtn.addEventListener("click", toggleSentenceLoop);

/* ---------- gapdan keyin to'xta ---------- */

function toggleAutoPause() {

  autoPause = !autoPause;

  autoPauseBtn.classList.toggle("active", autoPause);

  showStatus(
    autoPause
      ? "Har gapdan keyin to'xtaydi"
      : "Gapdan keyin to'xtash o'chirildi",
    2200
  );

}

autoPauseBtn.addEventListener("click", toggleAutoPause);

/* ---------- subtitr ko'rinishi ---------- */

function toggleSubtitles() {

  subsVisible = !subsVisible;

  document.body.classList.toggle("subs-off", !subsVisible);

  subBtn.classList.toggle("active", subsVisible);

  showStatus(subsVisible ? "Subtitr yoqildi" : "Subtitr yashirildi");

}

function changeSubtitleSize(delta) {

  subScale = Math.max(0.6, Math.min(2.2, Math.round((subScale + delta) * 10) / 10));

  document.documentElement.style.setProperty("--sub-scale", String(subScale));

  showStatus("Subtitr: " + Math.round(subScale * 100) + "%");

}

subBtn.addEventListener("click", toggleSubtitles);

/* ---------- subtitr faylini yuklash ---------- */

async function attachSubtitle(track, file, announce = true) {

  try {

    const text = decodeSubtitleBuffer(await file.arrayBuffer());

    const parsed = parseSubtitles(text);

    track.subFile = file;

    track.subName = file.name;

    track.cues = parsed;

    track.parsing = false;

    if (playlist[playlistIndex] === track) {
      setCues(parsed);
    }

    renderVideoList();

    if (announce) {

      showStatus(
        parsed.length
          ? "Subtitr: " + parsed.length + " ta gap"
          : "Subtitrda gap topilmadi",
        2500
      );

    }

  } catch (error) {

    console.error("Subtitle error:", error);

    track.parsing = false;

    track.cues = [];

    renderVideoList();

    showStatus("Subtitrni o'qib bo'lmadi", 3000);

  }

}

function startSubtitleParse(track) {

  if (track.subFile) {

    track.parsing = true;

    attachSubtitle(track, track.subFile, false);

  }

}

function applySubtitleToCurrent(file) {

  const track = playlist[playlistIndex];

  if (!track) {

    showStatus("Avval YouTube videosini oching, so'ng subtitr yuklang", 3500);

    return;

  }

  attachSubtitle(track, file, true);

}

function removeSubtitle() {

  const track = playlist[playlistIndex];

  if (!track) {
    return;
  }

  track.subFile = null;
  track.subName = "";
  track.cues = [];

  setCues([]);

  renderVideoList();

  showStatus("Subtitr olib tashlandi");

}

openSubBtn.addEventListener("click", () => {

  if (!playlist.length) {
    noVideo();
    return;
  }

  subInput.click();

});

loadSubBtn.addEventListener("click", () => openSubBtn.click());

removeSubBtn.addEventListener("click", removeSubtitle);

subInput.addEventListener("change", (e) => {

  const file = e.target.files && e.target.files[0];

  if (file) {

    if (isSubtitleFile(file)) {
      applySubtitleToCurrent(file);
    } else {
      showStatus("Faqat .srt yoki .vtt subtitr qo'llab-quvvatlanadi", 3000);
    }

  }

  subInput.value = "";

});

/* =========================================================
   PLAYLIST (videolar)
========================================================= */

function trackName(track) {

  if (!track) {
    return "";
  }

  return track.title || "YouTube · " + track.id;

}

function updateTitleAndPlaceholder() {

  const track = playlist[playlistIndex];

  stagePlaceholder.classList.toggle("gone", Boolean(track));

  document.title = track
    ? trackName(track) + " — Shadowing Studio"
    : "Shadowing Studio";

}

function loadTrack(index, options = {}) {

  if (index < 0 || index >= playlist.length) {
    return;
  }

  const track = playlist[index];

  stopRecording({ silent: true });

  cancelCompare();

  stopTakePlayback();

  video.pause();

  clearABLoop(false);

  playlistIndex = index;

  lastTickTime = -1;

  video.loop = false;

  // Video YouTube'dan oqim bo'lib keladi — hech narsa kompyuterga yuklanmaydi
  video.open(track.id, track.start || 0);

  // Tanlangan tezlik yangi videoga ham qo'llanadi
  updateSpeed();

  resetProgressUI();

  updateLoopButton();

  updatePlayIcon();

  updateTitleAndPlaceholder();

  setCues(track.cues || []);

  if (track.subFile && !track.cues && !track.parsing) {
    startSubtitleParse(track);
  }

  renderVideoList();

  showStatus(
    playlist.length > 1
      ? (index + 1) + "/" + playlist.length + " · " + trackName(track)
      : trackName(track),
    2500
  );

  if (options.autoplay) {
    playVideo();
  }

}

/**
 * @param {{id:string,start:number,url:string}[]} links
 * @param {{append?: boolean, activate?: boolean}} options
 *   append  — mavjud ro'yxatga qo'shadi (aks holda ro'yxat almashtiriladi)
 *   activate — qo'shilgan birinchi yangi videoga o'tadi
 */
function addVideoLinks(links, options = {}) {

  if (!links.length) {
    return;
  }

  const incoming = links.map((link) => ({
    id: link.id,
    start: link.start || 0,
    url: link.url,
    key: link.id + "@" + (link.start || 0),
    title: "",
    subFile: null,
    subName: "",
    cues: null
  }));

  if (options.append && playlist.length) {

    const known = new Set(playlist.map((track) => track.key));

    const fresh = incoming.filter((track) => !known.has(track.key));

    if (!fresh.length) {

      // Havola ro'yxatda bor — kerak bo'lsa o'shanga o'tamiz
      if (options.activate) {

        const existing = playlist.findIndex((track) => track.key === incoming[0].key);

        if (existing >= 0 && existing !== playlistIndex) {
          loadTrack(existing);
        }

      }

      showStatus("Bu video ro'yxatda bor", 2000);

      return;

    }

    const firstNew = playlist.length;

    playlist = playlist.concat(fresh);

    renderVideoList();

    showStatus(fresh.length + " ta video qo'shildi", 2000);

    if (options.activate) {
      loadTrack(firstNew);
    }

    return;

  }

  playlist = incoming;

  loadTrack(0);

  if (playlist.length > 1) {
    openPanel("videos");
  }

}

function removeTrack(index) {

  if (index < 0 || index >= playlist.length) {
    return;
  }

  if (index === playlistIndex) {

    const wasPlaying = !video.paused;

    playlist.splice(index, 1);

    if (!playlist.length) {

      clearPlaylist(false);

      return;

    }

    loadTrack(Math.min(index, playlist.length - 1), { autoplay: wasPlaying });

  } else {

    playlist.splice(index, 1);

    if (index < playlistIndex) {
      playlistIndex--;
    }

    renderVideoList();

  }

}

function clearPlaylist(showMessage = true) {

  stopRecording({ silent: true });

  cancelCompare();

  video.pause();

  playlist = [];

  playlistIndex = -1;

  video.clear();

  clearABLoop(false);

  resetProgressUI();

  updateLoopButton();

  updatePlayIcon();

  updateTitleAndPlaceholder();

  setCues([]);

  renderVideoList();

  if (showMessage) {
    showStatus("Ro'yxat tozalandi");
  }

}

function previousVideo() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  // Video boshlanganiga 3 soniyadan kam bo'lsa — oldingi videoga o'tamiz
  if (playlistIndex > 0 && video.currentTime <= 3) {

    loadTrack(playlistIndex - 1, { autoplay: !video.paused });

    return;

  }

  video.pause();

  seekTo(0);

  clearABLoop(false);

  updatePlayIcon();

  showStatus("Boshiga");

}

function nextVideo() {

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (playlistIndex >= 0 && playlistIndex < playlist.length - 1) {

    loadTrack(playlistIndex + 1, { autoplay: !video.paused });

    return;

  }

  if (playlist.length > 1) {

    showStatus("Bu oxirgi video");

    return;

  }

  video.pause();

  seekTo(0);

  clearABLoop(false);

  updatePlayIcon();

  showStatus("Keyingi video uchun yangi havola kiriting");

}

prevVideoBtn.addEventListener("click", previousVideo);
nextVideoBtn.addEventListener("click", nextVideo);

/* =========================================================
   YOUTUBE HAVOLASI OYNASI
========================================================= */

let urlDialogMode = "replace";

function isUrlDialogOpen() {
  return !urlDialog.classList.contains("hidden");
}

function updateUrlHint() {

  const { links, invalid } = extractYouTubeLinks(urlText.value);

  urlHint.className = "dialog-hint";

  if (!urlText.value.trim()) {
    urlHint.textContent = "";
    return;
  }

  if (!links.length) {
    urlHint.textContent = "YouTube havolasi topilmadi";
    urlHint.classList.add("error");
    return;
  }

  urlHint.textContent =
    links.length + " ta video topildi" +
    (invalid.length ? " · " + invalid.length + " ta havola noto'g'ri" : "");

  urlHint.classList.add(invalid.length ? "error" : "ok");

}

function openUrlDialog(mode) {

  urlDialogMode = mode === "append" ? "append" : "replace";

  urlText.value = "";

  updateUrlHint();

  urlDialog.classList.remove("hidden");

  setTimeout(() => urlText.focus(), 0);

}

function closeUrlDialog() {

  urlDialog.classList.add("hidden");

  urlText.blur();

}

function submitUrlDialog(append) {

  const { links, invalid } = extractYouTubeLinks(urlText.value);

  if (!links.length) {

    urlHint.textContent = "YouTube havolasi topilmadi — havolani tekshiring";
    urlHint.className = "dialog-hint error";

    return;

  }

  closeUrlDialog();

  addVideoLinks(links, { append: append });

  if (invalid.length) {
    showStatus(invalid.length + " ta noto'g'ri havola o'tkazib yuborildi", 3500);
  }

}

openVideoBtn.addEventListener("click", () => openUrlDialog("replace"));

addVideoBtn.addEventListener("click", () => openUrlDialog("append"));

urlText.addEventListener("input", updateUrlHint);

urlOpenBtn.addEventListener("click", () => submitUrlDialog(false));

urlAddBtn.addEventListener("click", () => submitUrlDialog(true));

urlCancelBtn.addEventListener("click", closeUrlDialog);

// Oyna tashqarisini bosish — yopish
urlDialog.addEventListener("pointerdown", (e) => {

  if (e.target === urlDialog) {
    closeUrlDialog();
  }

});

urlDialog.addEventListener("keydown", (e) => {

  if (e.key === "Escape") {

    e.preventDefault();

    e.stopPropagation();

    closeUrlDialog();

    return;

  }

  // Ctrl + Enter — tezkor tasdiqlash
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {

    e.preventDefault();

    submitUrlDialog(urlDialogMode === "append");

  }

});

// Havolani istalgan joyda Ctrl + V bilan joylashtirish
document.addEventListener("paste", (e) => {

  const target = e.target;

  const tag =
    target && typeof target.tagName === "string"
      ? target.tagName.toUpperCase()
      : "";

  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (target && target.isContentEditable) ||
    isUrlDialogOpen()
  ) {
    return;
  }

  const text = e.clipboardData ? e.clipboardData.getData("text") : "";

  const { links } = extractYouTubeLinks(text);

  // YouTube havolasi bo'lmasa — hech narsaga aralashmaymiz
  if (!links.length) {
    return;
  }

  e.preventDefault();

  addVideoLinks(links, { append: playlist.length > 0, activate: true });

});

autoNextBtn.addEventListener("click", () => {

  autoNext = !autoNext;

  autoNextBtn.classList.toggle("on", autoNext);

  showStatus(autoNext ? "Avto-o'tish yoqildi" : "Avto-o'tish o'chirildi");

});

clearVideosBtn.addEventListener("click", () => clearPlaylist(true));

/* =========================================================
   PANEL (Videolar / Gaplar / Yozuvlar)
========================================================= */

function isPanelOpen() {
  return !sidePanel.classList.contains("hidden");
}

function setPanelTab(tab) {

  currentTab = tab;

  for (const name of Object.keys(panes)) {

    panes[name].classList.toggle("show", name === tab);

    tabButtons[name].classList.toggle("current", name === tab);

  }

  if (tab === "cues") {
    highlightCue(true);
  }

  if (tab === "takes") {
    refreshMicList({ probe: Boolean(native) });
  }

}

function openPanel(tab) {

  sidePanel.classList.remove("hidden");

  panelBtn.classList.add("active");

  setPanelTab(tab || currentTab);

}

function closePanel() {

  sidePanel.classList.add("hidden");

  panelBtn.classList.remove("active");

}

function togglePanel(tab) {

  if (isPanelOpen() && currentTab === tab) {
    closePanel();
  } else {
    openPanel(tab);
  }

}

panelBtn.addEventListener("click", () => togglePanel(currentTab));

panelCloseBtn.addEventListener("click", closePanel);

for (const [name, button] of Object.entries(tabButtons)) {

  button.addEventListener("click", () => setPanelTab(name));

}

// Panel tashqarisiga bosilsa — yopiladi
document.addEventListener("pointerdown", (e) => {

  if (!isPanelOpen()) {
    return;
  }

  const target = e.target instanceof Element ? e.target : null;

  if (
    target &&
    (
      target.closest("#sidePanel") ||
      target.closest("#playerBar") ||
      target.closest("#toolStrip")
    )
  ) {
    return;
  }

  closePanel();

});

/* ---------- Videolar ro'yxati ---------- */

function renderVideoList() {

  videoList.replaceChildren();

  if (!playlist.length) {

    const empty = document.createElement("li");

    empty.className = "list-empty";

    empty.textContent =
      "Ro'yxat bo'sh. «Qo'shish» orqali YouTube havolasini kiriting yoki havolani Ctrl+V bilan joylashtiring.";

    videoList.appendChild(empty);

  }

  playlist.forEach((track, i) => {

    const li = document.createElement("li");

    li.className = "list-item" + (i === playlistIndex ? " current" : "");

    li.dataset.index = String(i);

    li.title = trackName(track);

    const num = document.createElement("span");

    num.className = "item-num";

    num.textContent = String(i + 1);

    const main = document.createElement("span");

    main.className = "item-main";

    const name = document.createElement("span");

    name.className = "item-text";

    name.textContent = trackName(track);

    const sub = document.createElement("span");

    sub.className = "item-sub";

    sub.textContent = track.cues && track.cues.length
      ? "Subtitr: " + track.cues.length + " ta gap"
      : track.subFile
        ? "Subtitr o'qilmoqda..."
        : "Subtitrsiz";

    main.append(name, sub);

    const remove = document.createElement("button");

    remove.type = "button";

    remove.className = "item-btn";

    remove.title = "Ro'yxatdan olib tashlash";

    remove.dataset.remove = String(i);

    remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    li.append(num, main, remove);

    videoList.appendChild(li);

  });

  videosTitle.textContent = playlist.length
    ? "Videolar · " + playlist.length + " ta"
    : "Videolar";

  panelBadge.textContent = String(playlist.length);

  panelBadge.style.display = playlist.length > 1 ? "block" : "none";

  clearVideosBtn.disabled = !playlist.length;

  if (isPanelOpen() && currentTab === "videos") {

    const current = videoList.querySelector(".current");

    if (current) {
      current.scrollIntoView({ block: "nearest" });
    }

  }

}

videoList.addEventListener("click", (e) => {

  const target = e.target instanceof Element ? e.target : null;

  if (!target) {
    return;
  }

  const removeButton = target.closest("[data-remove]");

  if (removeButton) {

    removeTrack(Number(removeButton.dataset.remove));

    return;

  }

  const item = target.closest(".list-item");

  if (!item || item.dataset.index === undefined) {
    return;
  }

  const index = Number(item.dataset.index);

  if (index === playlistIndex) {
    togglePlay();
  } else {
    loadTrack(index, { autoplay: true });
  }

});

/* ---------- Gaplar ro'yxati ---------- */

function renderCueList() {

  cueList.replaceChildren();

  cueEls = [];

  if (!cues.length) {

    const empty = document.createElement("li");

    empty.className = "list-empty";

    empty.textContent =
      "Subtitr yo'q. YouTube subtitrini dastur o'qiy olmaydi — gaplar bo'yicha takrorlash uchun .srt / .vtt faylni «Subtitr» tugmasi bilan yuklang.";

    cueList.appendChild(empty);

  } else {

    const frag = document.createDocumentFragment();

    cues.forEach((cue, i) => {

      const li = document.createElement("li");

      li.className = "list-item";

      li.dataset.cue = String(i);

      const num = document.createElement("span");

      num.className = "item-num";

      num.textContent = formatTime(cue.start);

      const main = document.createElement("span");

      main.className = "item-main";

      const text = document.createElement("span");

      text.className = "item-text";

      text.textContent = cue.text.replace(/\n/g, " / ");

      main.appendChild(text);

      li.append(num, main);

      frag.appendChild(li);

      cueEls.push(li);

    });

    cueList.appendChild(frag);

  }

  cuesTitle.textContent = cues.length
    ? "Gaplar · " + cues.length + " ta"
    : "Gaplar";

  highlightedCue = -1;

}

let highlightedCue = -1;

function highlightCue(forceScroll = false) {

  if (highlightedCue !== cueIdx) {

    if (cueEls[highlightedCue]) {
      cueEls[highlightedCue].classList.remove("current");
    }

    if (cueEls[cueIdx]) {
      cueEls[cueIdx].classList.add("current");
    }

    highlightedCue = cueIdx;

    forceScroll = true;

  }

  if (
    forceScroll &&
    cueEls[cueIdx] &&
    isPanelOpen() &&
    currentTab === "cues"
  ) {
    cueEls[cueIdx].scrollIntoView({ block: "nearest" });
  }

}

cueList.addEventListener("click", (e) => {

  const target = e.target instanceof Element ? e.target : null;

  const item = target && target.closest("[data-cue]");

  if (item) {
    jumpToCue(Number(item.dataset.cue), { play: true });
  }

});

/* =========================================================
   MIKROFON BILAN YOZISH (shadowing)
   Yozish: siqilmagan PCM (WAV) — sifat yo'qolmaydi.
   Saqlash: o'rnatilgan dasturda MP3 (192 kbps, CBR) ga aylantiriladi.
========================================================= */

/* Faqat o'rnatilgan Windows dasturida mavjud (preload.js beradi) */
const native = window.shadowingNative || null;

const MP3_BITRATE_OPTIONS = [128, 192, 256, 320];

const DEFAULT_MP3_KBPS = 256;

let mp3Kbps = DEFAULT_MP3_KBPS;
let mp3Ready = false;

/* Studiya rejimi: brauzerning exo / shovqin bostirish / avto-gain filtrlari O'CHIQ —
   studiya mikrofoni ovozi buzilmaydi. Karnay bilan ishlaganda filtrni yoqish mumkin. */
let studioMode = true;

let micDeviceId = "";
let micProbed = false;
let micFellBack = false;
let recMeterTimerId = 0;
let clipUntil = 0;

/* ---------- sozlamalarni eslab qolish ---------- */

const SETTINGS_KEY = "shadowing-studio-settings";

function loadSettings() {

  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
  } catch (_) {
    return {};
  }

}

function saveSettings(patch) {

  try {

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(Object.assign(loadSettings(), patch))
    );

  } catch (_) {}

}

function applySavedSettings() {

  const saved = loadSettings();

  if (typeof saved.studioMode === "boolean") {
    studioMode = saved.studioMode;
  }

  if (typeof saved.micDeviceId === "string") {
    micDeviceId = saved.micDeviceId;
  }

  if (MP3_BITRATE_OPTIONS.includes(Number(saved.mp3Kbps))) {
    mp3Kbps = Number(saved.mp3Kbps);
  }

  studioBtn.classList.toggle("on", studioMode);

  bitrateSelect.value = String(mp3Kbps);

}

async function initMp3Support() {

  try {

    mp3Ready =
      Boolean(native) &&
      typeof native.mp3Available === "function" &&
      Boolean(await native.mp3Available());

  } catch (error) {

    console.error("MP3 support check failed:", error);

    mp3Ready = false;

  }

  updateFormatNote();

  renderTakeList();

}

function updateFormatNote() {

  bitrateSelect.disabled = !mp3Ready;

  formatNote.textContent = mp3Ready
    ? "Saqlash: MP3, " + mp3Kbps + " kbps (CBR). Yozish siqilmagan (WAV, 16-bit) olinadi — " +
      "sifat yo'qolmaydi; MP3 saqlashdan oldin fonda tayyorlanadi."
    : "MP3 kodlagichi mavjud emas — yozuvlar siqilmagan WAV (16-bit) formatida saqlanadi. " +
      "MP3 uchun o'rnatilgan Windows dasturidan foydalaning.";

}

function setStudioMode(on) {

  studioMode = on;

  studioBtn.classList.toggle("on", on);

  saveSettings({ studioMode: on });

  showStatus(
    on
      ? "Studiya rejimi: filtrsiz, toza ovoz"
      : "Exo / shovqin filtri yoqildi (karnay bilan ishlash uchun)",
    3500
  );

}

studioBtn.addEventListener("click", () => setStudioMode(!studioMode));

bitrateSelect.addEventListener("change", () => {

  const value = Number(bitrateSelect.value);

  if (MP3_BITRATE_OPTIONS.includes(value)) {

    mp3Kbps = value;

    saveSettings({ mp3Kbps: value });

    updateFormatNote();

    showStatus("MP3 sifati: " + value + " kbps", 2500);

  }

  // Tanlagandan keyin fokus olib tashlanadi, aks holda tezkor tugmalar ishlamay qoladi
  bitrateSelect.blur();

});

/* ---------- mikrofon tanlash ---------- */

async function refreshMicList(options = {}) {

  const media = navigator.mediaDevices;

  if (!media || typeof media.enumerateDevices !== "function") {
    return;
  }

  // Qurilma nomlari mikrofon ruxsatidan keyingina ko'rinadi
  if (options.probe && !micProbed) {

    micProbed = true;

    try {

      const probe = await media.getUserMedia({ audio: true });

      probe.getTracks().forEach((track) => track.stop());

    } catch (_) {}

  }

  let devices = [];

  try {

    devices = (await media.enumerateDevices()).filter(
      (device) =>
        device.kind === "audioinput" &&
        device.deviceId !== "default" &&
        device.deviceId !== "communications"
    );

  } catch (error) {

    console.error("enumerateDevices error:", error);

  }

  micSelect.replaceChildren();

  const standard = document.createElement("option");

  standard.value = "";

  standard.textContent = "Standart mikrofon (Windows tanlovi)";

  micSelect.appendChild(standard);

  devices.forEach((device, index) => {

    const option = document.createElement("option");

    option.value = device.deviceId;

    option.textContent = device.label || "Mikrofon " + (index + 1);

    micSelect.appendChild(option);

  });

  micSelect.value = devices.some((device) => device.deviceId === micDeviceId)
    ? micDeviceId
    : "";

}

micSelect.addEventListener("change", () => {

  micDeviceId = micSelect.value;

  saveSettings({ micDeviceId: micDeviceId });

  showStatus(
    micDeviceId ? "Mikrofon tanlandi" : "Standart mikrofon tanlandi",
    2500
  );

  micSelect.blur();

});

micRefreshBtn.addEventListener("click", () => refreshMicList({ probe: true }));

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {

  navigator.mediaDevices.addEventListener("devicechange", () => refreshMicList());

}

/* ---------- siqilmagan PCM yozuvchi (stereo kirishni qo'llaydi) ---------- */

async function createPcmRecorder(stream) {

  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  const context = new AudioCtx({ latencyHint: "interactive" });

  try {

    if (context.state === "suspended") {
      await context.resume();
    }

    const left = [];
    const right = [];

    let hasRight = false;
    let samples = 0;
    let sumSqLeft = 0;
    let sumSqRight = 0;
    let levelPeak = 0;

    const toInt16 = (floats) => {

      const ints = new Int16Array(floats.length);

      let sumSq = 0;
      let peak = 0;

      for (let i = 0; i < floats.length; i++) {

        const value = Math.max(-1, Math.min(1, floats[i]));

        const abs = Math.abs(value);

        sumSq += value * value;

        if (abs > peak) {
          peak = abs;
        }

        ints[i] = value < 0 ? value * 32768 : value * 32767;

      }

      return { ints: ints, sumSq: sumSq, peak: peak };

    };

    const pushSamples = (l, r) => {

      const a = toInt16(l);

      left.push(a.ints);

      sumSqLeft += a.sumSq;

      levelPeak = Math.max(levelPeak, a.peak);

      if (r) {

        const b = toInt16(r);

        right.push(b.ints);

        hasRight = true;

        sumSqRight += b.sumSq;

        levelPeak = Math.max(levelPeak, b.peak);

      }

      samples += l.length;

    };

    const source = context.createMediaStreamSource(stream);

    let node = null;

    if (context.audioWorklet && typeof AudioWorkletNode === "function") {

      try {

        await context.audioWorklet.addModule(
          new URL("./pcm-capture.worklet.js", import.meta.url).href
        );

        node = new AudioWorkletNode(context, "pcm-capture", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 2,
          channelCountMode: "explicit"
        });

        node.port.onmessage = (e) => pushSamples(e.data.l, e.data.r);

      } catch (error) {

        console.warn("AudioWorklet ishlamadi, ScriptProcessor ishlatiladi:", error);

        node = null;

      }

    }

    if (!node) {

      node = context.createScriptProcessor(4096, 2, 1);

      node.onaudioprocess = (e) => {

        const input = e.inputBuffer;

        pushSamples(
          new Float32Array(input.getChannelData(0)),
          input.numberOfChannels > 1
            ? new Float32Array(input.getChannelData(1))
            : null
        );

      };

    }

    // Grafni tirik ushlab turamiz, lekin ovozni karnayga chiqarmaymiz
    const silent = context.createGain();

    silent.gain.value = 0;

    source.connect(node);

    node.connect(silent);

    silent.connect(context.destination);

    return {

      sampleRate: context.sampleRate,

      /* Oxirgi o'qishdan beri eng baland cho'qqi (0..1) */
      readLevel() {

        const value = levelPeak;

        levelPeak = 0;

        return value;

      },

      async stop() {

        try {

          source.disconnect();
          node.disconnect();
          silent.disconnect();

          if (node.port) {
            node.port.onmessage = null;
          }

          node.onaudioprocess = null;

        } catch (_) {}

        await context.close().catch(() => {});

        const stereo = hasRight && right.length === left.length;

        return {
          left: left,
          right: stereo ? right : null,
          samples: samples,
          sumSqLeft: sumSqLeft,
          sumSqRight: stereo ? sumSqRight : null,
          sampleRate: context.sampleRate
        };

      }

    };

  } catch (error) {

    context.close().catch(() => {});

    throw error;

  }

}

function formatBytes(bytes) {

  if (bytes >= 1024 * 1024) {
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  return Math.max(1, Math.round(bytes / 1024)) + " KB";

}

/* ---------- yozish UI ---------- */

function setRecUI(on) {

  recBtn.classList.toggle("rec", on);

  recBtn.querySelector("i").className =
    "fa-solid " + (on ? "fa-stop" : "fa-microphone");

  recBtn.querySelector("span").textContent = on ? "To'xtatish" : "Yozish";

  recIndicator.classList.toggle("show", on);

  if (!on) {

    recTimeEl.textContent = "REC 0:00";

    recMeterFill.style.width = "0%";

    recIndicator.classList.remove("clip");

  }

}

function handleMicError(error) {

  console.error("Microphone error:", error);

  const name = error && error.name;

  if (name === "NotAllowedError" || name === "SecurityError") {

    showStatus("Mikrofonga ruxsat berilmadi", 4000);

    alert(
      "Mikrofonga ruxsat berilmadi.\n\n" +
      "Windows: Sozlamalar → Maxfiylik va xavfsizlik → Mikrofon bo'limida " +
      "«Desktop ilovalarga mikrofondan foydalanishga ruxsat berish» yoqilganini tekshiring."
    );

  } else if (name === "NotFoundError" || name === "OverconstrainedError") {

    showStatus("Mikrofon topilmadi", 4000);

  } else {

    showStatus("Mikrofonni ochib bo'lmadi", 4000);

  }

}

function buildAudioConstraints(useDevice) {

  const constraints = {
    channelCount: { ideal: 2 },
    sampleRate: { ideal: 48000 },
    echoCancellation: !studioMode,
    noiseSuppression: !studioMode,
    autoGainControl: false
  };

  if (useDevice && micDeviceId) {
    constraints.deviceId = { exact: micDeviceId };
  }

  return constraints;

}

async function openMicStream() {

  try {

    return await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(true)
    });

  } catch (error) {

    // Tanlangan mikrofon uzib qo'yilgan bo'lsa — standartiga qaytamiz
    if (
      micDeviceId &&
      error &&
      (error.name === "OverconstrainedError" || error.name === "NotFoundError")
    ) {

      micDeviceId = "";

      saveSettings({ micDeviceId: "" });

      refreshMicList();

      micFellBack = true;

      return navigator.mediaDevices.getUserMedia({
        audio: buildAudioConstraints(false)
      });

    }

    throw error;

  }

}

async function startRecording() {

  if (recSession || recStarting) {
    return;
  }

  if (!hasVideoSource()) {
    noVideo();
    return;
  }

  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function" ||
    !(window.AudioContext || window.webkitAudioContext)
  ) {

    showStatus("Bu muhitda yozish qo'llab-quvvatlanmaydi", 4000);

    return;

  }

  cancelCompare();

  stopTakePlayback();

  recStarting = true;

  micFellBack = false;

  let stream = null;

  let pcm = null;

  try {

    stream = await openMicStream();

    pcm = await createPcmRecorder(stream);

  } catch (error) {

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    recStarting = false;

    handleMicError(error);

    return;

  }

  recStarting = false;

  // Ruxsat so'ralayotganda video olib tashlangan bo'lishi mumkin
  if (!hasVideoSource()) {

    await pcm.stop().catch(() => {});

    stream.getTracks().forEach((track) => track.stop());

    return;

  }

  const track = playlist[playlistIndex];

  recSession = {
    pcm: pcm,
    stream: stream,
    videoName: track ? trackName(track) : "video",
    videoId: track ? track.id : "",
    startTime: Number(video.currentTime) || 0,
    endTime: 0,
    startCue: cueIdx,
    startedAt: performance.now(),
    openPanelAfter: true,
    stopping: false
  };

  setRecUI(true);

  recTimerId = setInterval(updateRecTimer, 250);

  recMeterTimerId = setInterval(updateRecMeter, 80);

  // Shadowing: video bilan birga gapirasiz
  if (video.paused) {
    playVideo();
  }

  // Qaysi mikrofon va qanday sozlamada yozilayotganini ko'rsatamiz
  const audioTrack = stream.getAudioTracks()[0];

  const settings =
    audioTrack && typeof audioTrack.getSettings === "function"
      ? audioTrack.getSettings()
      : {};

  const label = String((audioTrack && audioTrack.label) || "Mikrofon").slice(0, 38);

  showStatus(
    "● " + label +
    " · " + (settings.channelCount || "?") + " kanal" +
    " · " + Math.round(pcm.sampleRate / 100) / 10 + " kHz" +
    (studioMode ? " · filtrsiz" : " · filtr yoqiq") +
    (micFellBack ? " · tanlangan mikrofon topilmadi, standart ishlatildi" : ""),
    micFellBack ? 7000 : 4500
  );

  // Ruxsatdan keyin qurilma nomlari ko'rinadi
  refreshMicList();

}

function updateRecTimer() {

  if (!recSession) {
    return;
  }

  const seconds = (performance.now() - recSession.startedAt) / 1000;

  recTimeEl.textContent = "REC " + formatTime(seconds);

  if (seconds >= MAX_RECORD_SECONDS) {

    stopRecording({ pauseVideo: true });

  }

}

function updateRecMeter() {

  if (!recSession || recSession.stopping) {
    return;
  }

  const level = recSession.pcm.readLevel();

  recMeterFill.style.width = levelToPercent(level).toFixed(0) + "%";

  const now = performance.now();

  if (level >= CLIP_LEVEL) {
    clipUntil = now + 1500;
  }

  recIndicator.classList.toggle("clip", now < clipUntil);

}

function stopRecording(options = {}) {

  const session = recSession;

  if (!session || session.stopping) {
    return;
  }

  session.stopping = true;

  session.endTime = video.ended
    ? getFiniteDuration()
    : Number(video.currentTime) || 0;

  session.openPanelAfter = !options.silent;

  clearInterval(recTimerId);

  clearInterval(recMeterTimerId);

  setRecUI(false);

  if (options.pauseVideo) {
    video.pause();
  }

  finalizeRecording(session);

}

async function finalizeRecording(session) {

  let result = null;

  try {

    result = await session.pcm.stop();

  } catch (error) {

    console.error("PCM stop error:", error);

  }

  session.stream.getTracks().forEach((track) => track.stop());

  if (recSession === session) {
    recSession = null;
  }

  if (!result || !result.samples) {

    showStatus("Yozuv bo'sh chiqdi", 3000);

    return;

  }

  // Stereo interfeysda mikrofon bitta kanalda bo'lsa, o'sha kanal olinadi
  const mode = chooseChannelMode(
    result.sumSqLeft,
    result.sumSqRight,
    result.samples
  );

  const mixed = mixToMono(result.left, result.right, mode);

  const blob = new Blob(
    [buildWavBuffer(mixed.chunks, result.samples, result.sampleRate)],
    { type: "audio/wav" }
  );

  takeCounter++;

  const start = session.startTime;

  const take = {
    id: takeCounter,
    blob: blob,
    url: URL.createObjectURL(blob),
    videoName: session.videoName,
    videoId: session.videoId,
    start: start,
    end: Math.max(session.endTime, start),
    seconds: result.samples / result.sampleRate,
    sampleRate: result.sampleRate,
    peak: mixed.peak,
    channelMode: mode,
    cueNumber: session.startCue >= 0 ? session.startCue + 1 : 0,
    mp3Blob: null,
    mp3State: "none",
    mp3Kbps: 0,
    encodePromise: null
  };

  takes.unshift(take);

  while (takes.length > MAX_TAKES) {

    const old = takes.pop();

    URL.revokeObjectURL(old.url);

  }

  renderTakeList();

  if (mixed.peak >= CLIP_LEVEL) {

    showStatus("Ovoz kesilgan (clipping)! Mikrofon gain'ini pasaytiring", 6000);

  } else if (mixed.peak < 0.002) {

    showStatus("Yozuv juda jim — mikrofon va gain'ni tekshiring", 5000);

  } else {

    showStatus(
      result.right && mode !== "avg"
        ? "Yozuv saqlandi (mikrofon kanali avtomatik tanlandi)"
        : "Yozuv saqlandi",
      3000
    );

  }

  encodeTakeToMp3(take);

  if (session.openPanelAfter) {
    openPanel("takes");
  }

}

function toggleRecording() {

  if (recSession) {

    stopRecording({ pauseVideo: true });

  } else {

    startRecording();

  }

}

recBtn.addEventListener("click", toggleRecording);

/* ---------- MP3 ga aylantirish (o'rnatilgan dasturda) ---------- */

function encodeTakeToMp3(take) {

  if (!mp3Ready) {

    take.mp3State = "none";

    return Promise.resolve(false);

  }

  const kbps = mp3Kbps;

  take.mp3State = "pending";

  renderTakeList();

  take.encodePromise = (async () => {

    try {

      const wavBytes = await take.blob.arrayBuffer();

      const output = await native.encodeMp3(
        wavBytes,
        { bitrateKbps: kbps }
      );

      const bytes =
        output instanceof Uint8Array ? output : new Uint8Array(output);

      if (!bytes.length) {
        throw new Error("MP3 natijasi bo'sh");
      }

      take.mp3Blob = new Blob([bytes], { type: "audio/mpeg" });

      take.mp3Kbps = kbps;

      take.mp3State = "ready";

      return true;

    } catch (error) {

      console.error("MP3 encode error:", error);

      take.mp3State = "failed";

      return false;

    } finally {

      renderTakeList();

    }

  })();

  return take.encodePromise;

}

/* =========================================================
   YOZUVLARNI IJRO ETISH VA ASL BILAN SOLISHTIRISH
========================================================= */

function stopTakePlayback() {

  takeAudio.pause();

  if (playingTakeId !== null) {

    playingTakeId = null;

    renderTakeList();

  }

}

function playTake(take) {

  if (recSession) {
    return;
  }

  // Shu yozuv hozir eshitilayotgan bo'lsa — to'xtatamiz
  if (playingTakeId === take.id && !takeAudio.paused) {

    stopTakePlayback();

    return;

  }

  cancelCompare();

  video.pause();

  takeAudio.src = take.url;

  takeAudio.currentTime = 0;

  playingTakeId = take.id;

  renderTakeList();

  takeAudio.play().catch((error) => {

    console.error("Take play error:", error);

    playingTakeId = null;

    renderTakeList();

  });

}

takeAudio.addEventListener("ended", () => {

  if (playingTakeId !== null) {

    playingTakeId = null;

    renderTakeList();

  }

});

function cancelCompare() {

  compareToken++;

  compareActive = false;

  if (!takeAudio.paused) {
    takeAudio.pause();
  }

}

function waitFor(condition, token) {

  return new Promise((resolve) => {

    const tick = () => {

      if (token !== compareToken) {
        resolve(false);
        return;
      }

      if (condition()) {
        resolve(true);
        return;
      }

      requestAnimationFrame(tick);

    };

    tick();

  });

}

async function compareTake(take) {

  if (!take) {

    showStatus("Avval ovozingizni yozing (V)", 3000);

    return;

  }

  if (recSession || !hasVideoSource()) {
    return;
  }

  stopTakePlayback();

  const token = ++compareToken;

  compareActive = true;

  const track = playlist[playlistIndex];

  // Yozuv boshqa videoga tegishli bo'lsa, asl qismini topib bo'lmaydi
  if (track && take.videoId && track.id !== take.videoId) {

    compareActive = false;

    showStatus("Bu yozuv boshqa videoga tegishli", 3500);

    return;

  }

  try {

    // 1) Asl: yozuv boshlangan joydan oxirigacha
    seekTo(take.start);

    await video.play();

    showStatus("Asl...", 5000);

    const reachedEnd = await waitFor(
      () => video.currentTime >= take.end || video.ended || video.paused,
      token
    );

    if (!reachedEnd || token !== compareToken) {
      return;
    }

    const finishedNaturally = video.currentTime >= take.end || video.ended;

    video.pause();

    if (!finishedNaturally) {
      return;
    }

    // 2) Siz
    takeAudio.src = take.url;

    takeAudio.currentTime = 0;

    showStatus("Siz...", 5000);

    await takeAudio.play();

    await new Promise((resolve) => {

      const done = () => {
        takeAudio.removeEventListener("ended", done);
        takeAudio.removeEventListener("pause", done);
        resolve();
      };

      takeAudio.addEventListener("ended", done);
      takeAudio.addEventListener("pause", done);

    });

    if (token === compareToken) {
      showStatus("Solishtirish tugadi", 2000);
    }

  } catch (error) {

    if (!error || error.name !== "AbortError") {
      console.error("Compare error:", error);
    }

  } finally {

    if (token === compareToken) {
      compareActive = false;
    }

    updatePlayIcon();

  }

}

compareBtn.addEventListener("click", () => compareTake(takes[0]));

async function downloadTake(take) {

  if (take.mp3State === "pending" && take.encodePromise) {

    showStatus("MP3 tayyorlanmoqda...", 10000);

    await take.encodePromise;

  } else if (take.mp3State === "failed" && mp3Ready) {

    // Bir marta qayta urinib ko'ramiz
    showStatus("MP3 qayta tayyorlanmoqda...", 10000);

    await encodeTakeToMp3(take);

  }

  // Yozuvdan keyin MP3 sifati o'zgartirilgan bo'lsa — tanlangan sifatda qayta tayyorlaymiz
  if (mp3Ready && take.mp3State === "ready" && take.mp3Kbps !== mp3Kbps) {

    showStatus("MP3 " + mp3Kbps + " kbps ga qayta tayyorlanmoqda...", 10000);

    await encodeTakeToMp3(take);

  }

  const asMp3 = take.mp3State === "ready" && take.mp3Blob;

  const blob = asMp3 ? take.mp3Blob : take.blob;

  const url = asMp3 ? URL.createObjectURL(blob) : take.url;

  const link = document.createElement("a");

  link.href = url;

  const safeName =
    String(take.videoName || "")
      .replace(/[^\w-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);

  link.download =
    "shadowing_" +
    (/[A-Za-z0-9]/.test(safeName) ? safeName : take.videoId || "video") +
    "_" +
    take.id +
    (asMp3 ? ".mp3" : ".wav");

  document.body.appendChild(link);

  link.click();

  link.remove();

  if (asMp3) {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  showStatus(
    asMp3
      ? "MP3 saqlanmoqda (" + take.mp3Kbps + " kbps)"
      : mp3Ready
        ? "MP3 tayyorlanmadi — WAV saqlanmoqda"
        : "WAV saqlanmoqda (MP3 faqat o'rnatilgan dasturda)",
    3500
  );

}

function deleteTake(id) {

  const index = takes.findIndex((take) => take.id === id);

  if (index === -1) {
    return;
  }

  if (playingTakeId === id) {
    takeAudio.pause();
    playingTakeId = null;
  }

  URL.revokeObjectURL(takes[index].url);

  takes.splice(index, 1);

  renderTakeList();

}

function clearTakes() {

  cancelCompare();

  takeAudio.pause();

  playingTakeId = null;

  takes.forEach((take) => URL.revokeObjectURL(take.url));

  takes = [];

  renderTakeList();

}

clearTakesBtn.addEventListener("click", clearTakes);

function makeItemButton(iconClass, title, action, id, extraClass) {

  const button = document.createElement("button");

  button.type = "button";

  button.className = "item-btn" + (extraClass ? " " + extraClass : "");

  button.title = title;

  button.dataset.action = action;

  button.dataset.id = String(id);

  button.innerHTML = '<i class="fa-solid ' + iconClass + '"></i>';

  return button;

}

function renderTakeList() {

  takeList.replaceChildren();

  if (!takes.length) {

    const empty = document.createElement("li");

    empty.className = "list-empty";

    empty.textContent =
      "Yozuv yo'q. «Yozish» (V) ni bosing va video bilan birga gapiring. " +
      "To'xtatgach, yozuvingizni asl bilan solishtiring.";

    takeList.appendChild(empty);

  }

  takes.forEach((take, index) => {

    const li = document.createElement("li");

    li.className = "list-item" + (take.id === playingTakeId ? " current" : "");

    const num = document.createElement("span");

    num.className = "item-num";

    num.textContent = "#" + take.id;

    const main = document.createElement("span");

    main.className = "item-main";

    const title = document.createElement("span");

    title.className = "item-text";

    title.textContent =
      (take.cueNumber ? "Gap " + take.cueNumber + " · " : "") +
      formatTime(take.start) + "–" + formatTime(take.end);

    const sub = document.createElement("span");

    sub.className = "item-sub";

    const formatText =
      take.mp3State === "ready"
        ? "MP3 " + take.mp3Kbps + " kbps · " + formatBytes(take.mp3Blob.size)
        : take.mp3State === "pending"
          ? "MP3 tayyorlanmoqda..."
          : take.mp3State === "failed"
            ? "MP3 xato — WAV saqlanadi"
            : "WAV · " + formatBytes(take.blob.size);

    const peakText =
      take.peak > 0
        ? " · cho'qqi " + Math.round(20 * Math.log10(take.peak)) + " dB"
        : "";

    sub.textContent =
      take.videoName + " · " + Math.max(1, Math.round(take.seconds)) + " s" +
      peakText + " · " + formatText;

    main.append(title, sub);

    li.append(
      num,
      main,
      makeItemButton(
        take.id === playingTakeId ? "fa-pause" : "fa-play",
        "Yozuvimni eshitish",
        "play",
        take.id,
        take.id === playingTakeId ? "playing" : ""
      ),
      makeItemButton("fa-right-left", "Asl bilan solishtirish", "compare", take.id),
      makeItemButton("fa-download", "MP3 ga saqlash", "save", take.id),
      makeItemButton("fa-xmark", "O'chirish", "delete", take.id)
    );

    li.dataset.first = index === 0 ? "1" : "0";

    takeList.appendChild(li);

  });

  takesTitle.textContent = takes.length
    ? "Yozuvlar · " + takes.length + " ta"
    : "Yozuvlar";

  clearTakesBtn.disabled = !takes.length;

  compareBtn.disabled = !takes.length;

}

takeList.addEventListener("click", (e) => {

  const target = e.target instanceof Element ? e.target : null;

  const button = target && target.closest("[data-action]");

  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);

  const take = takes.find((item) => item.id === id);

  if (!take) {
    return;
  }

  switch (button.dataset.action) {

    case "play":
      playTake(take);
      break;

    case "compare":
      compareTake(take);
      break;

    case "save":
      downloadTake(take);
      break;

    case "delete":
      deleteTake(id);
      break;

  }

});

/* =========================================================
   DRAG & DROP — video (va subtitr) faylni oynaga tashlash
========================================================= */

let dragDepth = 0;

function dragHasContent(e) {

  const types = Array.from((e.dataTransfer && e.dataTransfer.types) || []);

  return (
    types.includes("Files") ||
    types.includes("text/uri-list") ||
    types.includes("text/plain")
  );

}

function setDropOverlay(show) {

  dropOverlay.classList.toggle("show", show);

}

window.addEventListener("dragenter", (e) => {

  if (!dragHasContent(e)) {
    return;
  }

  e.preventDefault();

  dragDepth++;

  setDropOverlay(true);

});

window.addEventListener("dragover", (e) => {

  if (!dragHasContent(e)) {
    return;
  }

  // Aks holda Electron faylni / havolani ochishga urinadi
  e.preventDefault();

  e.dataTransfer.dropEffect = "copy";

});

window.addEventListener("dragleave", (e) => {

  if (!dragHasContent(e)) {
    return;
  }

  dragDepth = Math.max(0, dragDepth - 1);

  if (dragDepth === 0) {
    setDropOverlay(false);
  }

});

window.addEventListener("drop", (e) => {

  if (!dragHasContent(e)) {
    return;
  }

  e.preventDefault();

  dragDepth = 0;

  setDropOverlay(false);

  const subs = Array.from(e.dataTransfer.files || []).filter(isSubtitleFile);

  const text =
    e.dataTransfer.getData("text/uri-list") ||
    e.dataTransfer.getData("text/plain") ||
    "";

  const { links } = extractYouTubeLinks(text);

  if (!links.length && !subs.length) {

    showStatus("YouTube havolasi yoki subtitr (.srt / .vtt) tashlang", 3500);

    return;

  }

  // Havola — ro'yxatga qo'shiladi va unga o'tiladi; subtitr — joriy (yangi) videoga ulanadi
  if (links.length) {
    addVideoLinks(links, { append: playlist.length > 0, activate: true });
  }

  if (subs.length) {
    applySubtitleToCurrent(subs[0]);
  }

});

/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener("keydown", (e) => {

  // Havola oynasi ochiq bo'lsa, tezkor tugmalar ishlamaydi
  if (isUrlDialogOpen()) {
    return;
  }

  const target = e.target;

  const tag =
    target && typeof target.tagName === "string"
      ? target.tagName.toUpperCase()
      : "";

  // Input ichida yozayotganda shortcutlar ishlamasin
  if (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    (target && target.isContentEditable)
  ) {
    return;
  }

  // Ctrl / Cmd + O — video ochish
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {

    e.preventDefault();

    openVideoBtn.click();

    return;

  }

  // Space — play / pause
  if (e.code === "Space") {

    e.preventDefault();

    togglePlay();

    return;

  }

  // Ctrl / Cmd / Alt bilan bosilgan tugmalar brauzerga qoldiriladi
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  switch (e.key) {

    /* ----- pleyer (o'zgarishsiz) ----- */

    case "1":
      e.preventDefault();
      setPointA();
      break;

    case "3":
      e.preventDefault();
      setPointB();
      break;

    case "7":
      e.preventDefault();
      clearABLoop(true);
      break;

    case "5":
      e.preventDefault();
      togglePlay();
      break;

    case "4":
      e.preventDefault();
      seekBy(-2);
      break;

    case "6":
      e.preventDefault();
      seekBy(2);
      break;

    case "0":
      e.preventDefault();
      if (hasVideoSource()) {
        seekTo(0);
        showStatus("Boshiga");
      }
      break;

    case "2":
      e.preventDefault();
      changeVolume(-0.1);
      break;

    case "8":
      e.preventDefault();
      changeVolume(0.1);
      break;

    case "9":
      e.preventDefault();
      loopBtn.click();
      break;

    case "m":
    case "M":
      e.preventDefault();
      muteBtn.click();
      break;

    case "/":
      e.preventDefault();
      resetSpeed();
      break;

    case "*":
      e.preventDefault();
      nextSpeed();
      break;

    case "n":
    case "N":
      e.preventDefault();
      nextVideo();
      break;

    case "p":
    case "P":
      e.preventDefault();
      previousVideo();
      break;

    case "l":
    case "L":
      e.preventDefault();
      togglePanel("videos");
      break;

    case "Escape":
      if (isPanelOpen()) {
        e.preventDefault();
        closePanel();
      } else if (isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      }
      break;

    /* ----- gaplar bo'yicha navigatsiya (sahifa navigatsiyasi o'rnida) ----- */

    case "ArrowLeft":
      e.preventDefault();
      prevCue();
      break;

    case "ArrowRight":
      e.preventDefault();
      nextCue();
      break;

    case "ArrowUp":
      e.preventDefault();
      changeVolume(0.1);
      break;

    case "ArrowDown":
      e.preventDefault();
      changeVolume(-0.1);
      break;

    case "Home":
      e.preventDefault();
      firstCue();
      break;

    case "End":
      e.preventDefault();
      lastCue();
      break;

    /* ----- shadowing asboblari ----- */

    case "r":
    case "R":
      e.preventDefault();
      toggleSentenceLoop();
      break;

    case "s":
    case "S":
      e.preventDefault();
      toggleAutoPause();
      break;

    case "t":
    case "T":
      e.preventDefault();
      toggleSubtitles();
      break;

    case "+":
    case "=":
      e.preventDefault();
      zoomBy(ZOOM_STEP);
      break;

    case "-":
    case "_":
      e.preventDefault();
      zoomBy(-ZOOM_STEP);
      break;

    case "z":
    case "Z":
      e.preventDefault();
      if (hasVideoSource()) {
        resetVideoZoom();
      } else {
        noVideo();
      }
      break;

    case "[":
    case "{":
      e.preventDefault();
      changeSubtitleSize(-0.1);
      break;

    case "]":
    case "}":
      e.preventDefault();
      changeSubtitleSize(0.1);
      break;

    case "c":
    case "C":
      e.preventDefault();
      togglePanel("cues");
      break;

    case "y":
    case "Y":
      e.preventDefault();
      togglePanel("takes");
      break;

    case "v":
    case "V":
      e.preventDefault();
      toggleRecording();
      break;

    case "k":
    case "K":
      e.preventDefault();
      compareTake(takes[0]);
      break;

    case "f":
    case "F":
      e.preventDefault();
      toggleFullscreen();
      break;

    case "h":
    case "H":
      e.preventDefault();
      toggleControls();
      break;

    case "i":
    case "I":
      e.preventDefault();
      showInfo();
      break;

  }

});

// Space (keyup) — fokusdagi tugma qo'shimcha "click" bermasin
document.addEventListener("keyup", (e) => {

  if (e.code !== "Space") {
    return;
  }

  const target = e.target;

  const tag =
    target && typeof target.tagName === "string"
      ? target.tagName.toUpperCase()
      : "";

  if (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    (target && target.isContentEditable)
  ) {
    return;
  }

  e.preventDefault();

});

/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener("beforeunload", () => {

  clearTimeout(statusTimer);

  clearTimeout(toastTimer);

  clearInterval(recTimerId);

  clearInterval(recMeterTimerId);

  if (recSession) {

    try {
      recSession.stream.getTracks().forEach((track) => track.stop());
    } catch (_) {}

  }

  video.destroy();

  takes.forEach((take) => URL.revokeObjectURL(take.url));

});

/* =========================================================
   INITIAL STATE
========================================================= */

updatePlayIcon();
updateMuteIcon(video.volume);
updateLoopButton();
updateSentenceButton();
updateSpeed();
renderVideoList();
renderTakeList();
setCues([]);
setPanelTab("videos");
updateTitleAndPlaceholder();
applyVideoTransform();
initFullscreenSupport();
applySavedSettings();
updateFormatNote();
initMp3Support();
refreshMicList();
