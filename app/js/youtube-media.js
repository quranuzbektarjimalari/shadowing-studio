/*
  YouTube pleyerini (rasmiy IFrame Player API) <video> elementiga o'xshatib o'rab beradi.
  Video YouTube serveridan oqim (stream) bo'lib keladi — kompyuter xotirasiga yuklanmaydi.

  Dastur kodi (pleyer, A-B takror, gap takrori, yozish, solishtirish) HTMLMediaElement bilan
  ishlagandek ishlashi uchun kerakli xususiyat va hodisalar shu yerda taqlid qilinadi:
    xususiyatlar: src, paused, ended, currentTime, duration, volume, playbackRate, loop, error ...
    metodlar:     open(), clear(), play(), pause()
    hodisalar:    loadedmetadata, canplay, play, playing, pause, ended, timeupdate, seeking, seeked, error
*/

export const YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
});

const API_URL = "https://www.youtube.com/iframe_api";

/* "Maxfiylik kuchaytirilgan" rejim: cookie'lar pleyer o'ynatilmaguncha o'rnatilmaydi */
const EMBED_HOST = "https://www.youtube-nocookie.com";

const DEFAULT_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

let apiPromise = null;

export function loadYouTubeApi(timeoutMs = 15000) {

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve, reject) => {

    const previous = window.onYouTubeIframeAPIReady;

    const script = document.createElement("script");

    const fail = (message) => {

      clearTimeout(timer);

      apiPromise = null;

      script.remove();

      reject(new Error(message));

    };

    const timer = setTimeout(
      () => fail("YouTube yuklanmadi (internet yo'qmi?)"),
      timeoutMs
    );

    window.onYouTubeIframeAPIReady = () => {

      clearTimeout(timer);

      if (typeof previous === "function") {
        previous();
      }

      resolve(window.YT);

    };

    script.src = API_URL;

    script.async = true;

    script.onerror = () => fail("YouTube yuklanmadi (internet yo'qmi?)");

    document.head.appendChild(script);

  });

  return apiPromise;

}

export class YouTubeMedia extends EventTarget {

  constructor(hostElement, options = {}) {

    super();

    this._host = hostElement;
    this._origin = options.origin || window.location.origin;
    this._embedHost = options.embedHost || EMBED_HOST;

    this._player = null;
    this._ready = false;
    this._readyPromise = null;

    this._videoId = "";
    this._paused = true;
    this._ended = false;
    this._state = YT_STATE.UNSTARTED;

    this._duration = 0;
    this._metaSent = false;
    this._loop = false;

    this._volume = 1;
    this._rate = 1;
    this._availableRates = null;

    this._error = null;

    this._seek = null;
    this._rawTime = 0;
    this._rawStamp = 0;
    this._lastT = 0;

    this._pollId = 0;
    this._lastTimeupdate = 0;
    this._openToken = 0;

    /* open() dan keyin yangi video "cued" bo'lguncha pleyer hali ESKI video ma'lumotini beradi */
    this._fresh = false;
    this._openedAt = 0;
    this._startAt = 0;

    /* YouTube'ning o'z subtitri (CC): kerakmi, qaysi tilda */
    this._ccWanted = false;
    this._ccLang = "";
    this._ccCuedDone = false;
    this._ccPlayDone = false;

  }

  /* ---------------- HTMLMediaElement'ga o'xshash xususiyatlar ---------------- */

  get src() {
    return this._videoId ? "https://www.youtube.com/watch?v=" + this._videoId : "";
  }

  get videoId() {
    return this._videoId;
  }

  get paused() {
    return this._paused;
  }

  get ended() {
    return this._ended;
  }

  get error() {
    return this._error;
  }

  get readyState() {
    return this._metaSent ? 4 : 0;
  }

  /* YouTube pleyerining oxirgi holati: -1, 0 (tugadi), 1 (ijro), 2 (pauza), 3 (buferlash), 5 (cued) */
  get playerState() {
    return this._state;
  }

  get seeking() {
    return Boolean(this._seek);
  }

  get duration() {
    return this._duration > 0 ? this._duration : NaN;
  }

  /* Rasm nisbati YouTube ichida hal qilinadi; ramka to'liq to'ldiriladi */
  get videoWidth() {
    return 0;
  }

  get videoHeight() {
    return 0;
  }

  get loop() {
    return this._loop;
  }

  set loop(value) {
    this._loop = Boolean(value);
  }

  get volume() {
    return this._volume;
  }

  set volume(value) {

    const number = Number(value);

    this._volume = Number.isFinite(number)
      ? Math.max(0, Math.min(1, number))
      : 1;

    this._applyVolume();

  }

  get playbackRate() {
    return this._rate;
  }

  set playbackRate(value) {

    const number = Number(value);

    if (Number.isFinite(number) && number > 0) {

      this._rate = number;

      this._applyRate();

    }

  }

  get title() {

    if (!this._ready) {
      return "";
    }

    try {

      const data = this._player.getVideoData();

      // Eski videoning sarlavhasi yangisiga o'tib ketmasin
      if (!data || (data.video_id && data.video_id !== this._videoId)) {
        return "";
      }

      return data.title || "";

    } catch (_) {

      return "";

    }

  }

  /*
    YouTube vaqtni sekin (taxminan 4-10 marta/sek) yangilaydi. A-B takror va gap chegaralari
    aniq ishlashi uchun ijro paytida oraliq vaqt hisoblab beriladi (maks. 0.35 s oldinga).
  */
  get currentTime() {

    // Seek jarayonida — maqsad vaqt ko'rsatiladi
    if (this._seek) {
      return this._seek.target;
    }

    if (!this._ready || !this._videoId || this._fresh) {
      return this._lastT;
    }

    const now = performance.now();

    const raw = this._readRaw();

    if (raw !== this._rawTime) {

      this._rawTime = raw;

      this._rawStamp = now;

    }

    let time = raw;

    if (this._state === YT_STATE.PLAYING && !this._paused) {

      time = raw + Math.min(0.35, ((now - this._rawStamp) / 1000) * this._rate);

    }

    if (this._duration > 0) {
      time = Math.min(time, this._duration);
    }

    // YouTube hisoboti kechikishi sababli vaqt orqaga "sakramasin" (pauza va buferlashda ham):
    // aks holda pauzadan keyin davom ettirganda "gapdan keyin to'xta" va A-B chegarasi qayta ishlab ketardi.
    // Haqiqiy orqaga o'tish (seek) _lastT ni o'zi yangilaydi.
    if (time < this._lastT && this._lastT - time < 0.5) {
      time = this._lastT;
    }

    this._lastT = time;

    return time;

  }

  set currentTime(value) {

    const number = Number(value);

    const target = this._clampTime(Number.isFinite(number) ? number : 0);

    const now = performance.now();

    this._seek = { target: target, at: now };

    this._lastT = target;

    this._rawTime = target;

    this._rawStamp = now;

    this._ended = false;

    this._emit("seeking");

    this._whenReady().then(() => {

      this._player.seekTo(target, true);

      // YouTube: seekTo "cued" yoki "ended" holatdan ijroni boshlab yuboradi — pauza niyatini saqlaymiz
      if (this._paused) {
        this._player.pauseVideo();
      }

    }).catch(() => {
      this._seek = null;
    });

  }

  /* ---------------- metodlar ---------------- */

  async open(videoId, startSeconds = 0) {

    const token = ++this._openToken;

    this._videoId = videoId;

    this._startAt = Math.max(0, Number(startSeconds) || 0);

    this._resetPlaybackState(this._startAt);

    this._fresh = true;

    this._ccCuedDone = false;

    this._ccPlayDone = false;

    this._openedAt = performance.now();

    this._emit("loadstart");

    try {

      await this._ensurePlayer();

    } catch (error) {

      if (token === this._openToken) {
        this._fail("api", error);
      }

      return;

    }

    if (token !== this._openToken) {
      return;
    }

    this._player.cueVideoById({
      videoId: videoId,
      startSeconds: this._startAt
    });

  }

  clear() {

    this._openToken++;

    this._videoId = "";

    this._fresh = false;

    this._resetPlaybackState(0);

    if (this._ready) {

      try {
        this._player.stopVideo();
      } catch (_) {}

    }

    this._emit("emptied");

  }

  play() {

    if (!this._videoId) {
      return Promise.reject(new Error("Video tanlanmagan"));
    }

    const wasPaused = this._paused;

    this._paused = false;

    this._ended = false;

    if (wasPaused) {
      this._emit("play");
    }

    return this._whenReady().then(() => {
      this._player.playVideo();
    });

  }

  pause() {

    const wasPlaying = !this._paused;

    this._paused = true;

    if (this._ready) {

      try {
        this._player.pauseVideo();
      } catch (_) {}

    }

    if (wasPlaying) {
      this._emit("pause");
    }

  }

  destroy() {

    clearInterval(this._pollId);

    this._pollId = 0;

    if (this._player && typeof this._player.destroy === "function") {

      try {
        this._player.destroy();
      } catch (_) {}

    }

    this._player = null;

    this._ready = false;

    this._readyPromise = null;

  }

  /* ---------------- YouTube subtitri (CC) ---------------- */

  /**
   * YouTube'ning o'z subtitrini yoqadi / o'chiradi (har bir yangi videoga ham qo'llanadi).
   * Eslatma: pleyer ichidagi subtitr moduli rasmiy hujjatlarda yo'q; keng ishlatiladigan
   * loadModule/unloadModule/setOption usuli qo'llanadi. cc_load_policy esa pleyer yaratilganda beriladi.
   */
  setCaptions(enabled, language = "") {

    this._ccWanted = Boolean(enabled);

    if (enabled) {
      this._ccLang = String(language || "");
    }

    this._applyCaptions();

  }

  captionTracks() {

    if (!this._ready) {
      return [];
    }

    try {

      const list = this._player.getOption("captions", "tracklist");

      return Array.isArray(list)
        ? list.map((track) => ({
            languageCode: String(track.languageCode || ""),
            languageName: String(track.languageName || track.displayName || track.languageCode || "")
          }))
        : [];

    } catch (_) {

      return [];

    }

  }

  captionLanguage() {

    if (!this._ready) {
      return "";
    }

    try {

      const track = this._player.getOption("captions", "track");

      return (track && track.languageCode) || "";

    } catch (_) {

      return "";

    }

  }

  _applyCaptions() {

    if (!this._ready || this._fresh || !this._videoId) {
      return;
    }

    try {

      if (this._ccWanted) {

        this._player.loadModule("captions");

        if (this._ccLang) {
          this._player.setOption("captions", "track", { languageCode: this._ccLang });
        }

      } else {

        // YouTube o'z-o'zidan ko'rsatayotgan subtitr ham o'chiriladi
        this._player.setOption("captions", "track", {});

        this._player.unloadModule("captions");

      }

    } catch (_) {}

  }

  /* ---------------- ichki yordamchilar ---------------- */

  _emit(type) {
    this.dispatchEvent(new Event(type));
  }

  _clampTime(time) {

    const total = this._duration > 0 ? this._duration : Infinity;

    return Math.max(0, Math.min(total, time));

  }

  _resetPlaybackState(startTime) {

    this._paused = true;
    this._ended = false;
    this._state = YT_STATE.UNSTARTED;
    this._duration = 0;
    this._metaSent = false;
    this._error = null;
    this._seek = null;
    this._rawTime = startTime;
    this._rawStamp = performance.now();
    this._lastT = startTime;

  }

  _readRaw() {

    try {

      const value = Number(this._player.getCurrentTime());

      return Number.isFinite(value) ? value : 0;

    } catch (_) {

      return 0;

    }

  }

  _whenReady() {
    return this._ready ? Promise.resolve() : this._ensurePlayer();
  }

  _ensurePlayer() {

    if (this._readyPromise) {
      return this._readyPromise;
    }

    this._readyPromise = loadYouTubeApi()
      .then((YT) => new Promise((resolve, reject) => {

        const mount = document.createElement("div");

        this._host.appendChild(mount);

        let settled = false;

        const timer = setTimeout(() => {

          if (!settled) {

            settled = true;

            mount.remove();

            reject(new Error("YouTube pleyeri javob bermadi"));

          }

        }, 20000);

        this._player = new YT.Player(mount, {
          host: this._embedHost,
          width: "100%",
          height: "100%",
          playerVars: {
            // Boshqaruv — dasturning o'z pleyer paneli orqali
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            cc_load_policy: this._ccWanted ? 1 : 0,
            enablejsapi: 1,
            autoplay: 0,
            origin: this._origin,
            ...(this._ccWanted && this._ccLang ? { cc_lang_pref: this._ccLang } : {})
          },
          events: {

            onReady: () => {

              if (settled) {
                return;
              }

              settled = true;

              clearTimeout(timer);

              this._ready = true;

              this._applyVolume();

              this._applyRate();

              this._startPolling();

              resolve();

            },

            onStateChange: (event) => this._onState(event.data),

            onError: (event) => this._onError(event.data)

          }
        });

      }))
      .catch((error) => {

        this._readyPromise = null;

        this._player = null;

        throw error;

      });

    return this._readyPromise;

  }

  _startPolling() {

    clearInterval(this._pollId);

    this._pollId = setInterval(() => this._tick(), 100);

  }

  _tick() {

    if (!this._ready || !this._videoId) {
      return;
    }

    // Yangi video tayyor bo'lmasa ham abadiy kutib qolmaymiz
    if (this._fresh && performance.now() - this._openedAt > 3000) {
      this._fresh = false;
    }

    if (this._fresh) {
      return;
    }

    this._checkMetadata();

    const now = performance.now();

    const raw = this._readRaw();

    if (this._seek) {

      if (
        Math.abs(raw - this._seek.target) < 0.6 ||
        now - this._seek.at > 2500
      ) {

        this._seek = null;

        this._rawTime = raw;

        this._rawStamp = now;

        this._emit("seeked");

      }

    }

    if (
      this._state === YT_STATE.PLAYING &&
      !this._paused &&
      now - this._lastTimeupdate >= 240
    ) {

      this._lastTimeupdate = now;

      this._emit("timeupdate");

    }

  }

  _checkMetadata() {

    if (!this._ready || this._fresh) {
      return;
    }

    let duration = 0;

    try {
      duration = Number(this._player.getDuration()) || 0;
    } catch (_) {}

    if (duration > 0 && duration !== this._duration) {

      this._duration = duration;

      this._emit("durationchange");

    }

    if (!this._metaSent && this._duration > 0) {

      this._metaSent = true;

      this._emit("loadedmetadata");

    }

  }

  _applyVolume() {

    if (!this._ready) {
      return;
    }

    try {
      this._player.setVolume(Math.round(this._volume * 100));
    } catch (_) {}

  }

  /* Tanlangan tezlikka eng yaqin, YouTube qo'llab-quvvatlaydigan tezlik */
  _applyRate() {

    if (!this._ready) {
      return;
    }

    let rates = this._availableRates;

    if (!rates) {

      try {

        const list = this._player.getAvailablePlaybackRates();

        if (Array.isArray(list) && list.length > 1) {

          this._availableRates = list;

          rates = list;

        }

      } catch (_) {}

    }

    rates = rates || DEFAULT_RATES;

    const wanted = this._rate;

    const best = rates.reduce(
      (a, b) => (Math.abs(b - wanted) < Math.abs(a - wanted) ? b : a)
    );

    try {
      this._player.setPlaybackRate(best);
    } catch (_) {}

  }

  _onState(state) {

    this._state = state;

    if (state === YT_STATE.CUED || state === YT_STATE.PLAYING) {
      this._fresh = false;
    }

    this._checkMetadata();

    // Subtitr moduli video boshlangach yuklanadi — "cued" va birinchi "ijro"da qo'llaymiz
    if (state === YT_STATE.CUED && !this._ccCuedDone) {
      this._ccCuedDone = true;
      this._applyCaptions();
    }

    if (state === YT_STATE.PLAYING && !this._ccPlayDone) {
      this._ccPlayDone = true;
      this._applyCaptions();
    }

    this._emit("statechange");

    switch (state) {

      case YT_STATE.ENDED:

        // Oddiy "takror" (9 tugmasi): videoni boshidan qayta boshlaymiz
        if (this._loop) {

          this._lastT = 0;

          this._player.seekTo(0, true);

          this._player.playVideo();

          return;

        }

        this._ended = true;

        if (this._duration > 0) {
          this._lastT = this._duration;
        }

        this._emit("timeupdate");

        if (!this._paused) {

          this._paused = true;

          this._emit("pause");

        }

        this._emit("ended");

        break;

      case YT_STATE.PLAYING:

        this._ended = false;

        // Pleyerning o'zida (masalan, avtomatik) boshlangan bo'lsa ham holat to'g'ri bo'ladi
        if (this._paused) {

          this._paused = false;

          this._emit("play");

        }

        this._applyRate();

        this._emit("playing");

        break;

      case YT_STATE.PAUSED:

        if (!this._paused) {

          this._paused = true;

          this._emit("pause");

        }

        break;

      case YT_STATE.BUFFERING:

        this._emit("waiting");

        break;

      case YT_STATE.CUED:

        this._applyRate();

        // "Ijro" so'ralgan bo'lsa (cue'dan keyin darhol play) — yo'qolib ketmasin
        if (!this._paused) {
          this._player.playVideo();
        }

        this._emit("canplay");

        break;

    }

  }

  _onError(code) {

    this._fail(Number(code) || "unknown", null);

  }

  _fail(code, cause) {

    this._fresh = false;

    this._error = {
      code: code,
      message: cause && cause.message ? cause.message : ""
    };

    if (!this._paused) {

      this._paused = true;

      this._emit("pause");

    }

    this._emit("statechange");

    this._emit("error");

  }

}
