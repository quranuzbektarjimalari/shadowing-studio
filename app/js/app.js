"use strict";

import {
  parseSubtitles,
  decodeSubtitleBuffer,
  findCueIndex
} from "./subtitles.js";

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

const video = $("video");
const takeAudio = $("takeAudio");

const videoInput = $("videoInput");
const openVideoBtn = $("openVideoBtn");
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

let videoURL = null;

/* playlist: { file, name, key, subFile, subName, cues } */
let playlist = [];
let playlistIndex = -1;
let autoNext = true;
let appendMode = false;

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

/* panel */
let currentTab = "videos";

/* =========================================================
   HELPERS
========================================================= */

const VIDEO_EXTENSIONS = [
  ".mp4", ".m4v", ".mov", ".webm", ".mkv", ".avi",
  ".ogv", ".mpg", ".mpeg", ".wmv", ".3gp"
];

function fileName(file) {
  return String(file && file.name || "").toLowerCase();
}

function isVideoFile(file) {

  if (!file) {
    return false;
  }

  const type = String(file.type || "").toLowerCase();

  return (
    type.startsWith("video/") ||
    VIDEO_EXTENSIONS.some((ext) => fileName(file).endsWith(ext))
  );

}

function isSubtitleFile(file) {

  const name = fileName(file);

  return name.endsWith(".srt") || name.endsWith(".vtt");

}

function baseName(name) {
  return String(name || "").replace(/\.[^.]+$/, "");
}

function hasVideoSource() {
  return typeof video.src === "string" && video.src.trim() !== "";
}

function noVideo() {
  showStatus("Avval video oching");
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

  showStatus((delta > 0 ? "+" : "") + delta + "s");

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

function naturalCompare(a, b) {

  // "Lesson 2" "Lesson 10" dan oldin keladi
  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base"
  });

}

/* =========================================================
   STATUS
========================================================= */

let statusTimer = null;

function showStatus(text, durationMs = 1500) {

  clearTimeout(statusTimer);

  statusEl.textContent = String(text || "");

  if (Number.isFinite(durationMs) && durationMs > 0) {

    statusTimer = setTimeout(() => {
      statusEl.textContent = "";
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

}

playBtn.addEventListener("click", togglePlay);

video.addEventListener("click", togglePlay);

video.addEventListener("dblclick", toggleFullscreen);

stagePlaceholder.addEventListener("click", () => openVideoBtn.click());

async function toggleFullscreen() {

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

}

function resetProgressUI() {

  progress.value = "0";
  progress.max = "0";
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";

}

video.addEventListener("loadedmetadata", () => {

  const total = getFiniteDuration();

  progress.max = String(total);
  progress.value = "0";
  durationEl.textContent = formatTime(total);
  currentTimeEl.textContent = "0:00";

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

video.addEventListener("error", () => {

  if (!hasVideoSource()) {
    return;
  }

  console.error("Video element error:", video.error);

  updatePlayIcon();

  showStatus(
    "Videoni o'qib bo'lmadi (MP4 H.264 yoki WebM tavsiya etiladi)",
    4000
  );

});

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

}

function resetSpeed() {

  speedIndex = speeds.indexOf(1);

  updateSpeed();

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

});

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

    showStatus("Avval video oching, so'ng subtitr yuklang", 3000);

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

function revokeVideoURL() {

  if (videoURL) {

    URL.revokeObjectURL(videoURL);

    videoURL = null;

  }

}

function updateTitleAndPlaceholder() {

  const track = playlist[playlistIndex];

  stagePlaceholder.classList.toggle("gone", Boolean(track));

  document.title = track
    ? baseName(track.name) + " — Shadowing Studio"
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

  revokeVideoURL();

  clearABLoop(false);

  playlistIndex = index;

  lastTickTime = -1;

  videoURL = URL.createObjectURL(track.file);

  video.src = videoURL;

  video.loop = false;

  video.load();

  // load() tezlikni 1x ga qaytaradi — tanlangan tezlikni tiklaymiz
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
      ? (index + 1) + "/" + playlist.length + " · " + track.name
      : track.name,
    2500
  );

  if (options.autoplay) {
    playVideo();
  }

}

function pairSubtitles(items, subs) {

  const unused = subs.slice();

  for (const item of items) {

    const base = baseName(item.name).toLowerCase();

    const found = unused.findIndex((sub) => {

      const subBase = baseName(sub.name).toLowerCase();

      return subBase === base || subBase.startsWith(base + ".");

    });

    if (found !== -1) {
      item.subFile = unused.splice(found, 1)[0];
    }

  }

  // Bitta video va bitta subtitr bo'lsa — nomidan qat'i nazar juftlanadi
  if (items.length === 1 && !items[0].subFile && unused.length) {
    items[0].subFile = unused[0];
  }

}

function addMediaFiles(fileList, append) {

  const all = Array.from(fileList || []);

  const videos = all.filter(isVideoFile);

  const subs = all.filter(isSubtitleFile);

  if (!videos.length && !subs.length) {

    alert("Iltimos, video fayl (MP4, WebM...) yoki subtitr (.srt / .vtt) tanlang.");

    return;

  }

  // Faqat subtitr tanlangan bo'lsa — joriy videoga ulanadi
  if (!videos.length) {

    applySubtitleToCurrent(subs[0]);

    return;

  }

  const incoming = videos
    .map((file) => ({
      file: file,
      name: file.name,
      key: [file.name, file.size, file.lastModified].join("|"),
      subFile: null,
      subName: "",
      cues: null
    }))
    .sort(naturalCompare);

  pairSubtitles(incoming, subs);

  if (append && playlist.length) {

    const known = new Set(playlist.map((track) => track.key));

    const fresh = incoming.filter((track) => !known.has(track.key));

    if (!fresh.length) {

      showStatus("Bu videolar ro'yxatda bor", 2000);

      return;

    }

    fresh.forEach(startSubtitleParse);

    playlist = playlist.concat(fresh);

    renderVideoList();

    showStatus(fresh.length + " ta video qo'shildi", 2000);

    return;

  }

  incoming.forEach(startSubtitleParse);

  playlist = incoming;

  loadTrack(0, { autoplay: false });

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

  revokeVideoURL();

  video.removeAttribute("src");

  video.load();

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

  showStatus("Keyingi video uchun yangi fayl oching");

}

prevVideoBtn.addEventListener("click", previousVideo);
nextVideoBtn.addEventListener("click", nextVideo);

openVideoBtn.addEventListener("click", () => {

  appendMode = false;

  videoInput.click();

});

videoInput.addEventListener("change", (e) => {

  const files = e.target.files;

  const append = appendMode;

  appendMode = false;

  if (!files || !files.length) {
    return;
  }

  addMediaFiles(files, append);

  videoInput.value = "";

});

addVideoBtn.addEventListener("click", () => {

  appendMode = true;

  videoInput.click();

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
      "Ro'yxat bo'sh. «Qo'shish» orqali video tanlang (subtitr .srt / .vtt ni birga tanlash mumkin).";

    videoList.appendChild(empty);

  }

  playlist.forEach((track, i) => {

    const li = document.createElement("li");

    li.className = "list-item" + (i === playlistIndex ? " current" : "");

    li.dataset.index = String(i);

    li.title = track.name;

    const num = document.createElement("span");

    num.className = "item-num";

    num.textContent = String(i + 1);

    const main = document.createElement("span");

    main.className = "item-main";

    const name = document.createElement("span");

    name.className = "item-text";

    name.textContent = track.name;

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
      "Subtitr yo'q. Videoning o'zi bilan birga .srt / .vtt faylni tanlang yoki «Subtitr» tugmasini bosing.";

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
========================================================= */

function pickMimeType() {

  if (!window.MediaRecorder) {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";

}

function extensionForMime(mime) {

  const type = String(mime || "").toLowerCase();

  if (type.includes("ogg")) {
    return "ogg";
  }

  if (type.includes("mp4")) {
    return "m4a";
  }

  return "webm";

}

function setRecUI(on) {

  recBtn.classList.toggle("rec", on);

  recBtn.querySelector("i").className =
    "fa-solid " + (on ? "fa-stop" : "fa-microphone");

  recBtn.querySelector("span").textContent = on ? "To'xtatish" : "Yozish";

  recIndicator.classList.toggle("show", on);

  if (!on) {
    recTimeEl.textContent = "REC 0:00";
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
    !window.MediaRecorder
  ) {

    showStatus("Bu muhitda yozish qo'llab-quvvatlanmaydi", 4000);

    return;

  }

  cancelCompare();

  stopTakePlayback();

  recStarting = true;

  let stream;

  try {

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      }
    });

  } catch (error) {

    recStarting = false;

    handleMicError(error);

    return;

  }

  recStarting = false;

  // Ruxsat so'ralayotganda video olib tashlangan bo'lishi mumkin
  if (!hasVideoSource()) {

    stream.getTracks().forEach((track) => track.stop());

    return;

  }

  const mimeType = pickMimeType();

  let recorder;

  try {

    recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType: mimeType } : undefined
    );

  } catch (error) {

    stream.getTracks().forEach((track) => track.stop());

    handleMicError(error);

    return;

  }

  const track = playlist[playlistIndex];

  const session = {
    recorder: recorder,
    stream: stream,
    chunks: [],
    mimeType: mimeType,
    videoName: track ? track.name : "video",
    startTime: Number(video.currentTime) || 0,
    endTime: 0,
    startCue: cueIdx,
    startedAt: performance.now(),
    openPanelAfter: true
  };

  recorder.addEventListener("dataavailable", (e) => {

    if (e.data && e.data.size) {
      session.chunks.push(e.data);
    }

  });

  recorder.addEventListener("stop", () => finalizeRecording(session));

  recorder.addEventListener("error", (e) => {
    console.error("MediaRecorder error:", e.error || e);
  });

  recSession = session;

  recorder.start(250);

  setRecUI(true);

  recTimerId = setInterval(updateRecTimer, 250);

  // Shadowing: video bilan birga gapirasiz
  if (video.paused) {
    playVideo();
  }

  showStatus("Yozilmoqda — quloqchin bilan yaxshiroq", 3000);

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

function stopRecording(options = {}) {

  const session = recSession;

  if (!session) {
    return;
  }

  session.endTime = video.ended
    ? getFiniteDuration()
    : Number(video.currentTime) || 0;

  session.openPanelAfter = !options.silent;

  if (options.pauseVideo) {
    video.pause();
  }

  if (session.recorder.state !== "inactive") {

    try {
      session.recorder.stop();
    } catch (error) {
      console.error("Recorder stop error:", error);
      finalizeRecording(session);
    }

  } else {

    finalizeRecording(session);

  }

}

function finalizeRecording(session) {

  if (session.finalized) {
    return;
  }

  session.finalized = true;

  session.stream.getTracks().forEach((track) => track.stop());

  clearInterval(recTimerId);

  if (recSession === session) {
    recSession = null;
  }

  setRecUI(false);

  const blob = new Blob(
    session.chunks,
    { type: session.recorder.mimeType || session.mimeType || "audio/webm" }
  );

  if (!blob.size) {

    showStatus("Yozuv bo'sh chiqdi", 3000);

    return;

  }

  takeCounter++;

  const start = session.startTime;

  const end = Math.max(session.endTime, start);

  const take = {
    id: takeCounter,
    blob: blob,
    url: URL.createObjectURL(blob),
    videoName: session.videoName,
    start: start,
    end: end,
    seconds: (performance.now() - session.startedAt) / 1000,
    cueNumber: session.startCue >= 0 ? session.startCue + 1 : 0
  };

  takes.unshift(take);

  while (takes.length > MAX_TAKES) {

    const old = takes.pop();

    URL.revokeObjectURL(old.url);

  }

  renderTakeList();

  showStatus("Yozuv saqlandi", 2500);

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
  if (track && track.name !== take.videoName) {

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

function downloadTake(take) {

  const link = document.createElement("a");

  link.href = take.url;

  link.download =
    "shadowing_" +
    baseName(take.videoName).replace(/[^\w.-]+/g, "_") +
    "_" +
    take.id +
    "." +
    extensionForMime(take.blob.type);

  document.body.appendChild(link);

  link.click();

  link.remove();

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

    sub.textContent =
      take.videoName + " · " + Math.max(1, Math.round(take.seconds)) + " s";

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
      makeItemButton("fa-download", "Faylga saqlash", "save", take.id),
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

function dragHasFiles(e) {

  return Boolean(
    e.dataTransfer &&
    Array.from(e.dataTransfer.types || []).includes("Files")
  );

}

function setDropOverlay(show) {

  dropOverlay.classList.toggle("show", show);

}

window.addEventListener("dragenter", (e) => {

  if (!dragHasFiles(e)) {
    return;
  }

  e.preventDefault();

  dragDepth++;

  setDropOverlay(true);

});

window.addEventListener("dragover", (e) => {

  if (!dragHasFiles(e)) {
    return;
  }

  // Aks holda Electron faylni ochishga urinadi
  e.preventDefault();

  e.dataTransfer.dropEffect = "copy";

});

window.addEventListener("dragleave", (e) => {

  if (!dragHasFiles(e)) {
    return;
  }

  dragDepth = Math.max(0, dragDepth - 1);

  if (dragDepth === 0) {
    setDropOverlay(false);
  }

});

window.addEventListener("drop", (e) => {

  if (!dragHasFiles(e)) {
    return;
  }

  e.preventDefault();

  dragDepth = 0;

  setDropOverlay(false);

  const files = Array.from(e.dataTransfer.files || []);

  if (!files.some((file) => isVideoFile(file) || isSubtitleFile(file))) {

    showStatus("Faqat video va subtitr (.srt / .vtt) fayllar qo'llab-quvvatlanadi", 3500);

    return;

  }

  // Ro'yxat bo'lsa — qo'shiladi, bo'lmasa — birinchisi yuklanadi
  addMediaFiles(files, true);

});

/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener("keydown", (e) => {

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
      changeSubtitleSize(0.1);
      break;

    case "-":
    case "_":
      e.preventDefault();
      changeSubtitleSize(-0.1);
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

  clearInterval(recTimerId);

  if (recSession) {

    try {
      recSession.stream.getTracks().forEach((track) => track.stop());
    } catch (_) {}

  }

  revokeVideoURL();

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
