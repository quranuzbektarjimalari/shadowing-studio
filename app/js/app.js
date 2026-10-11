

    "use strict";


    /* =======================================================
       GLOBAL ERROR PROTECTION
    ======================================================== */

    window.addEventListener(
      "error",
      (event) => {

        console.error(
          "Application error:",
          event.error || event.message
        );

      }
    );


    window.addEventListener(
      "unhandledrejection",
      (event) => {

        console.error(
          "Unhandled promise rejection:",
          event.reason
        );

        event.preventDefault();

      }
    );


    /* =======================================================
       PDF.JS AVAILABILITY
    ======================================================== */

    const pdfJsAvailable =
      typeof window.pdfjsLib !== "undefined";


    if (pdfJsAvailable) {

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        new URL(
          "../vendor/pdfjs/pdf.worker.min.mjs",
          import.meta.url
        ).href;

    }


    /* =======================================================
       PDF ELEMENTS
    ======================================================== */

    const pdfInput =
      document.getElementById("pdfInput");

    const openPdfBtn =
      document.getElementById("openPdfBtn");

    const pdfContainer =
      document.getElementById("pdfContainer");

    const pdfPagesList =
      document.getElementById("pdfPagesList");

    const pdfPlaceholder =
      document.getElementById("pdfPlaceholder");

    const pdfPageWrapper =
      document.getElementById("pdfPageWrapper");

    const prevPageBtn =
      document.getElementById("prevPageBtn");

    const nextPageBtn =
      document.getElementById("nextPageBtn");

    const pageInput =
      document.getElementById("pageInput");

    const pageCount =
      document.getElementById("pageCount");


    /* =======================================================
       PDF STATE
    ======================================================== */

    let pdfDoc = null;

    let pageNum = 1;

    let scale = 1.2;

    const MIN_ZOOM = 0.5;

    const MAX_ZOOM = 3;

    const ZOOM_STEP = 0.1;

    let pdfLoadToken = 0;


    /* =======================================================
       PDF HELPERS
    ======================================================== */

    function isPdfFile(file) {

      if (!file) {
        return false;
      }

      const type =
        String(file.type || "").toLowerCase();

      const name =
        String(file.name || "").toLowerCase();

      return (
        type === "application/pdf" ||
        name.endsWith(".pdf")
      );

    }


    function destroyPdfDoc(doc) {

      if (
        doc &&
        typeof doc.destroy === "function"
      ) {

        try {

          const result =
            doc.destroy();

          if (
            result &&
            typeof result.catch === "function"
          ) {
            result.catch(() => {});
          }

        } catch (_) {}

      }

    }

    function resetPdfViewer() {

      const previousDoc = pdfDoc;

      pdfDoc = null;

      clearPages();

      destroyPdfDoc(previousDoc);

      pageNum = 1;

      pageCount.textContent = "0";

      pageInput.value = "1";

      pageInput.removeAttribute("max");

      prevPageBtn.disabled = true;

      nextPageBtn.disabled = true;

      pdfPlaceholder.classList.remove("hidden");

    }

    function showPdfStatus(text) {

      console.log(
        "PDF:",
        text
      );

    }

function updatePdfButtons() {

  /*
    ↑ va ↓ endi PDF sahifasini almashtirmaydi.
    Ular faqat scroll qiladi.

    Shuning uchun PDF ochilgan bo'lsa,
    ikkala tugma ham faol.
  */

  const hasPdf = Boolean(pdfDoc);

  prevPageBtn.disabled = !hasPdf;
  nextPageBtn.disabled = !hasPdf;

}


    /* =======================================================
       PDF OPEN
    ======================================================== */

    openPdfBtn.addEventListener(
      "click",
      () => {

        if (!pdfJsAvailable) {

          alert(
            "PDF ko'rish moduli yuklanmadi. Dasturni qayta ishga tushiring."
          );

          return;

        }

        pdfInput.click();

      }
    );


    pdfInput.addEventListener(
      "change",
      async (e) => {

        const file =
          e.target.files &&
          e.target.files[0];

        if (!file) {
          return;
        }


        if (!isPdfFile(file)) {

          alert(
            "Iltimos, PDF fayl tanlang."
          );

          pdfInput.value = "";

          return;

        }


        if (!pdfJsAvailable) {

          alert(
            "PDF viewer kutubxonasi yuklanmadi. Internet ulanishini tekshiring."
          );

          pdfInput.value = "";

          return;

        }


        const currentToken =
          ++pdfLoadToken;


        /*
          Eski PDF'ni darhol bekor qilamiz.
        */

        const previousDoc = pdfDoc;

        pdfDoc = null;

        clearPages();

        destroyPdfDoc(previousDoc);

        pageNum = 1;

        pdfPlaceholder.classList.remove(
          "hidden"
        );

        pageCount.textContent =
          "...";

        pageInput.value =
          "1";

        pageInput.removeAttribute(
          "max"
        );

        updatePdfButtons();


        try {

          const arrayBuffer =
            await file.arrayBuffer();

          // Xuddi shu faylni qayta tanlash mumkin bo'lishi uchun
          pdfInput.value = "";


          /*
            Foydalanuvchi bu orada boshqa PDF tanlagan bo'lsa,
            eski request natijasi qo'llanilmaydi.
          */

          if (currentToken !== pdfLoadToken) {
            return;
          }


          const loadingTask =
            pdfjsLib.getDocument({
              data: arrayBuffer,
              cMapUrl: new URL("../vendor/pdfjs/cmaps/", import.meta.url).href,
              cMapPacked: true,
              standardFontDataUrl: new URL("../vendor/pdfjs/standard_fonts/", import.meta.url).href,
              wasmUrl: new URL("../vendor/pdfjs/wasm/", import.meta.url).href,
              iccUrl: new URL("../vendor/pdfjs/iccs/", import.meta.url).href
            });


          const loadedPdf =
            await loadingTask.promise;


          if (currentToken !== pdfLoadToken) {

            try {
              await loadedPdf.destroy();
            } catch (_) {}

            return;

          }


          pdfDoc =
            loadedPdf;

          pageNum = 1;

          pageCount.textContent =
            String(pdfDoc.numPages);

          pageInput.max =
            String(pdfDoc.numPages);

          pageInput.value =
            "1";

          pdfPlaceholder.classList.add(
            "hidden"
          );

          /*
            Barcha sahifalar uchun joy (placeholder) yaratiladi,
            ko'rinib turganlari esa lazy tarzda chiziladi.
          */

          await buildPages(
            currentToken
          );


          if (currentToken !== pdfLoadToken) {
            return;
          }


          updatePdfButtons();


          showPdfStatus(
            `${pdfDoc.numPages} sahifa`
          );

        } catch (error) {

          if (currentToken !== pdfLoadToken) {
            return;
          }


          console.error(
            "PDF error:",
            error
          );


          resetPdfViewer();


          alert(
            "PDF faylni ochishda xatolik yuz berdi. Fayl buzilgan yoki PDF formatida bo'lmasligi mumkin."
          );

        }

      }
    );


    /* =======================================================
       CONTINUOUS VERTICAL SCROLL — BARCHA SAHIFALAR KETMA-KET
    ======================================================== */

    /*
      Har bir sahifa uchun { num, el, baseW, baseH, canvas, ... } obyekti.
      Sahifalar bir marta DOM'ga joylanadi (to'g'ri o'lchamda),
      canvas faqat ekranga yaqin sahifalar uchun chiziladi (lazy render),
      uzoqlashganda esa xotirani tejash uchun bo'shatiladi.
    */

    const pageViews = [];

    let pageTops = [];

    let pageHeights = [];

    let pageObserver = null;

    /*
      navLock — tugma / input / klaviatura orqali sahifaga o'tilganda
      pleyerdagi raqam aynan tanlangan sahifada qoladi.
      Foydalanuvchi o'zi scroll qila boshlagach (g'ildirak, touch,
      sichqoncha, ↑ ↓) lock yechiladi va avto-singkron davom etadi.
    */

    let navLock = false;

    let scrollTicking = false;

    function sizePageView(view) {

      view.el.style.width =
        Math.floor(view.baseW * scale) + "px";

      view.el.style.height =
        Math.floor(view.baseH * scale) + "px";

    }

    function releasePageView(view) {

      view.visible = false;

      if (view.renderTask) {

        try {
          view.renderTask.cancel();
        } catch (_) {}

      }

      if (view.canvas) {

        view.canvas.width = 0;
        view.canvas.height = 0;

        view.canvas.remove();

        view.canvas = null;

      }

      view.renderedScale = 0;

      // Xato holati faqat shu oyna ichida saqlanadi: sahifa ekrandan chiqib
      // qaytganda yoki zoom o'zgarganda yana bir bor urinib ko'riladi.
      view.failedScale = 0;

      if (view.label) {

        view.label.textContent = String(view.num);

      }

    }

    function clearPages() {

      if (pageObserver) {

        pageObserver.disconnect();

        pageObserver = null;

      }

      pageViews.forEach(releasePageView);

      pageViews.length = 0;

      pageTops = [];

      pageHeights = [];

      pdfPagesList.replaceChildren();

      pdfPagesList.classList.add("hidden");

      navLock = false;

    }

    function recalcLayout() {

      const containerTop =
        pdfContainer.getBoundingClientRect().top;

      const st =
        pdfContainer.scrollTop;

      pageTops = new Array(pageViews.length);

      pageHeights = new Array(pageViews.length);

      for (let i = 0; i < pageViews.length; i++) {

        const rect =
          pageViews[i].el.getBoundingClientRect();

        pageTops[i] =
          rect.top - containerTop + st;

        pageHeights[i] =
          rect.height;

      }

    }

    async function buildPages(loadToken) {

      const doc = pdfDoc;

      if (!doc) {
        return;
      }

      const total = doc.numPages;

      const sizes = new Array(total);

      const BATCH = 40;

      for (let start = 1; start <= total; start += BATCH) {

        const end =
          Math.min(total, start + BATCH - 1);

        const jobs = [];

        for (let n = start; n <= end; n++) {

          jobs.push(
            doc.getPage(n).then(
              (page) => {

                const vp =
                  page.getViewport({ scale: 1 });

                sizes[n - 1] = {
                  w: vp.width,
                  h: vp.height
                };

              }
            ).catch(
              () => {

                sizes[n - 1] =
                  sizes[0] || { w: 595, h: 842 };

              }
            )
          );

        }

        await Promise.all(jobs);

        if (
          loadToken !== pdfLoadToken ||
          doc !== pdfDoc
        ) {
          return;
        }

      }

      clearPages();

      const frag =
        document.createDocumentFragment();

      for (let i = 0; i < total; i++) {

        const size =
          sizes[i] || { w: 595, h: 842 };

        const holder =
          document.createElement("div");

        holder.className = "pdf-page";

        holder.dataset.page = String(i + 1);

        const label =
          document.createElement("span");

        label.className = "pdf-page-label";

        label.textContent = String(i + 1);

        holder.appendChild(label);

        const view = {
          num: i + 1,
          el: holder,
          label: label,
          failedScale: 0,
          baseW: size.w,
          baseH: size.h,
          canvas: null,
          renderedScale: 0,
          rendering: false,
          renderTask: null,
          visible: false
        };

        holder.__view = view;

        sizePageView(view);

        pageViews.push(view);

        frag.appendChild(holder);

      }

      pdfPagesList.appendChild(frag);

      pdfPagesList.classList.remove("hidden");

      pdfContainer.scrollTop = 0;

      pdfContainer.scrollLeft = 0;

      recalcLayout();

      pageObserver = new IntersectionObserver(
        (entries) => {

          for (const entry of entries) {

            const view =
              entry.target.__view;

            if (!view) {
              continue;
            }

            if (entry.isIntersecting) {

              view.visible = true;

              renderPageView(view);

            } else {

              releasePageView(view);

            }

          }

        },
        {
          root: pdfContainer,
          rootMargin: "150% 0px 150% 0px",
          threshold: 0
        }
      );

      pageViews.forEach(
        (view) => pageObserver.observe(view.el)
      );

      pageNum = 1;

      pageInput.value = "1";

    }

    /* =======================================================
       RENDER SINGLE PAGE VIEW
    ======================================================== */

    async function renderPageView(view) {

      const doc = pdfDoc;

      const loadToken = pdfLoadToken;

      const renderScale = scale;

      if (!doc || !view.visible) {
        return;
      }

      if (view.rendering) {
        return;
      }

      if (view.canvas && view.renderedScale === renderScale) {
        return;
      }

      // Shu o'lchamda chizish allaqachon xato bergan — cheksiz qayta urinmaymiz
      if (view.failedScale === renderScale) {
        return;
      }

      view.rendering = true;

      try {

        const page =
          await doc.getPage(view.num);

        if (
          loadToken !== pdfLoadToken ||
          doc !== pdfDoc ||
          !view.visible ||
          renderScale !== scale
        ) {
          return;
        }

        const viewport =
          page.getViewport({ scale: renderScale });

        // Retina / yuqori zichlikdagi ekranlar uchun (xotira limiti bilan)
        const MAX_PIXELS = 16777216;

        const outputScale =
          Math.min(
            window.devicePixelRatio || 1,
            Math.sqrt(
              MAX_PIXELS /
              (viewport.width * viewport.height)
            )
          );

        // Yangi canvas ekrandan tashqarida chiziladi, keyin almashtiriladi
        // (shunda zoom paytida miltillash bo'lmaydi)

        const off =
          document.createElement("canvas");

        off.width =
          Math.floor(viewport.width * outputScale);

        off.height =
          Math.floor(viewport.height * outputScale);

        const context =
          off.getContext("2d");

        if (!context) {
          throw new Error("Canvas 2D context topilmadi.");
        }

        const task =
          page.render({
            canvasContext: context,
            viewport: viewport,
            transform:
              outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : null
          });

        view.renderTask = task;

        await task.promise;

        if (
          loadToken !== pdfLoadToken ||
          doc !== pdfDoc ||
          !view.visible
        ) {
          off.width = 0;
          off.height = 0;
          return;
        }

        if (view.canvas) {
          view.canvas.remove();
        }

        view.el.appendChild(off);

        view.canvas = off;

        view.renderedScale = renderScale;

      } catch (error) {

        const cancelled =
          error &&
          error.name === "RenderingCancelledException";

        if (
          !cancelled &&
          loadToken === pdfLoadToken &&
          doc === pdfDoc
        ) {

          console.error("PDF render error:", error);

          view.failedScale = renderScale;

          if (view.label) {

            view.label.textContent =
              view.num + " · sahifani ko'rsatib bo'lmadi";

          }

          showPdfStatus("Sahifani ko'rsatishda xatolik");

        }

      } finally {

        view.rendering = false;

        view.renderTask = null;

        // Render paytida zoom o'zgargan bo'lsa — yangi o'lchamda qayta chizamiz
        if (
          loadToken === pdfLoadToken &&
          doc === pdfDoc &&
          view.visible &&
          view.renderedScale !== scale
        ) {

          renderPageView(view);

        }

      }

    }

    /* =======================================================
       AUTO-SYNC: JORIY SAHIFANI SCROLL BO'YICHA ANIQLASH
    ======================================================== */

    function computeCurrentPage() {

      const n = pageViews.length;

      if (!n) {
        return 1;
      }

      const st = pdfContainer.scrollTop;

      const vh = pdfContainer.clientHeight;

      const vb = st + vh;

      // Eng tepada — 1-sahifa, eng pastda — oxirgi sahifa
      if (st <= 1) {
        return 1;
      }

      if (vb >= pdfContainer.scrollHeight - 2) {
        return n;
      }

      // Ekranda eng ko'p maydonni egallagan sahifa
      let lo = 0;

      let hi = n - 1;

      while (lo < hi) {

        const mid = (lo + hi) >> 1;

        if (pageTops[mid] + pageHeights[mid] > st) {
          hi = mid;
        } else {
          lo = mid + 1;
        }

      }

      let best = lo + 1;

      let bestOverlap = -1;

      for (let i = lo; i < n; i++) {

        const top = pageTops[i];

        if (top >= vb) {
          break;
        }

        const bottom = top + pageHeights[i];

        const overlap =
          Math.min(bottom, vb) - Math.max(top, st);

        if (overlap > bestOverlap) {

          bestOverlap = overlap;

          best = i + 1;

        }

      }

      return best;

    }

    function setCurrentPage(num) {

      if (num === pageNum) {
        return;
      }

      pageNum = num;

      // Foydalanuvchi input'ga yozayotgan bo'lsa, uni buzmaymiz
      if (document.activeElement !== pageInput) {

        pageInput.value = String(pageNum);

      }

    }

    function syncCurrentPage() {

      if (!pdfDoc || navLock) {
        return;
      }

      setCurrentPage(computeCurrentPage());

    }

    function scheduleSync() {

      if (scrollTicking) {
        return;
      }

      scrollTicking = true;

      requestAnimationFrame(
        () => {

          scrollTicking = false;

          syncCurrentPage();

        }
      );

    }

    pdfContainer.addEventListener(
      "scroll",
      () => {

        if (!pdfDoc) {
          return;
        }

        scheduleSync();

      },
      { passive: true }
    );

    // Foydalanuvchi o'zi scroll qilsa — navigatsiya lock'i yechiladi
    ["wheel", "touchstart", "mousedown"].forEach(
      (type) => {

        pdfContainer.addEventListener(
          type,
          () => {

            navLock = false;

          },
          { passive: true }
        );

      }
    );

    if (typeof ResizeObserver !== "undefined") {

      new ResizeObserver(
        () => {

          if (!pageViews.length) {
            return;
          }

          recalcLayout();

          scheduleSync();

        }
      ).observe(pdfPageWrapper);

      new ResizeObserver(
        () => {

          if (pageViews.length) {
            scheduleSync();
          }

        }
      ).observe(pdfContainer);

    }

    /* =======================================================
       PAGE NAVIGATION (tugmalar / input / klaviatura)
    ======================================================== */

    function goToPage(num) {

      if (!pdfDoc || !pageViews.length) {
        return;
      }

      const numericValue =
        Number(num);

      if (!Number.isFinite(numericValue)) {
        return;
      }

      const safeNum =
        Math.max(
          1,
          Math.min(
            pdfDoc.numPages,
            Math.floor(numericValue)
          )
        );

      const distance =
        Math.abs(safeNum - pageNum);

      pageNum =
        safeNum;

      pageInput.value =
        String(pageNum);

      updatePdfButtons();

      navLock = true;

      pdfContainer.scrollTo({
        top: Math.max(0, pageTops[safeNum - 1] - 8),
        left: pdfContainer.scrollLeft,
        behavior: distance <= 1 ? "smooth" : "auto"
      });

    }

    /* =======================================================
       APPLY ZOOM (barcha sahifalar o'lchamini yangilaydi)
    ======================================================== */

    function applyZoom() {

      if (!pageViews.length) {
        return;
      }

      // Zoomdan oldin joriy sahifa va undagi nisbiy joyni eslab qolamiz
      const idx =
        (navLock ? pageNum : computeCurrentPage()) - 1;

      const fraction =
        pageHeights[idx]
          ? (pdfContainer.scrollTop - pageTops[idx]) / pageHeights[idx]
          : 0;

      pageViews.forEach(
        (view) => {

          sizePageView(view);

          if (view.renderTask) {

            try {
              view.renderTask.cancel();
            } catch (_) {}

          }

        }
      );

      recalcLayout();

      pdfContainer.scrollTop =
        pageTops[idx] + fraction * pageHeights[idx];

      pageViews.forEach(
        (view) => {

          if (view.visible) {
            renderPageView(view);
          }

        }
      );

      scheduleSync();

    }

    /* =======================================================
   PDF VERTICAL SCROLL BUTTONS
======================================================= */

const PDF_SCROLL_STEP = 300;


prevPageBtn.addEventListener(
  "click",
  () => {

    if (!pdfDoc) {
      return;
    }

    goToPage(
      pageNum - 1
    );

  }
);


nextPageBtn.addEventListener(
  "click",
  () => {

    if (!pdfDoc) {
      return;
    }

    goToPage(
      pageNum + 1
    );

  }
);


    pageInput.addEventListener(
      "change",
      () => {

        const value =
          parseInt(
            pageInput.value,
            10
          );


        if (
          pdfDoc &&
          Number.isInteger(value) &&
          value >= 1 &&
          value <= pdfDoc.numPages
        ) {

          goToPage(value);

        } else {

          pageInput.value =
            String(pageNum);

        }

      }
    );


    pageInput.addEventListener(
      "keydown",
      (e) => {

        if (e.key === "Enter") {

          e.preventDefault();

          pageInput.blur();

        }

      }
    );


    pageInput.addEventListener(
      "blur",
      () => {

        if (!pdfDoc) {

          pageInput.value = "1";

          return;

        }


        const value =
          parseInt(
            pageInput.value,
            10
          );


        if (
          !Number.isInteger(value) ||
          value < 1 ||
          value > pdfDoc.numPages
        ) {

          pageInput.value =
            String(pageNum);

        }

      }
    );


    /* =======================================================
       ZOOM
    ======================================================== */

    function changeZoom(delta) {

      if (!pdfDoc) {
        return;
      }


      const numericDelta =
        Number(delta);


      if (!Number.isFinite(numericDelta)) {
        return;
      }


      const newScale =
        Math.max(
          MIN_ZOOM,
          Math.min(
            MAX_ZOOM,
            Number(
              (
                scale +
                numericDelta
              ).toFixed(2)
            )
          )
        );


      if (
        !Number.isFinite(newScale) ||
        newScale === scale
      ) {

        return;

      }


      scale =
        newScale;

      applyZoom();

    }


    /* =======================================================
       CTRL + MOUSE WHEEL ZOOM
    ======================================================== */

    pdfContainer.addEventListener(
      "wheel",
      (e) => {

        if (!e.ctrlKey) {
          return;
        }


        if (!pdfDoc) {
          return;
        }


        e.preventDefault();


        const delta =
          e.deltaY < 0
            ? ZOOM_STEP
            : -ZOOM_STEP;


        changeZoom(
          delta
        );

      },
      {
        passive: false
      }
    );


    /* =======================================================
       PDF DRAG / PAN
    ======================================================== */

    let isDragging = false;

    let dragStartX = 0;

    let dragStartY = 0;

    let scrollStartLeft = 0;

    let scrollStartTop = 0;


    function stopPdfDragging() {

      isDragging = false;

      pdfContainer.classList.remove(
        "dragging"
      );

    }


    pdfContainer.addEventListener(
      "mousedown",
      (e) => {

        if (e.button !== 0) {
          return;
        }


        const target =
          e.target;


        if (
          target instanceof Element &&
          (
            target.closest("button") ||
            target.closest("input") ||
            target.closest("a")
          )
        ) {

          return;

        }


        // Scrollbarni bosganda sudrash (pan) ishga tushmasin
        const containerRect =
          pdfContainer.getBoundingClientRect();

        if (
          e.clientX > containerRect.left + pdfContainer.clientWidth ||
          e.clientY > containerRect.top + pdfContainer.clientHeight
        ) {
          return;
        }

        // preventDefault() fokusni olib tashlamaydi — o'zimiz olib tashlaymiz
        // (aks holda sahifa raqami inputida fokus qolib, shortcutlar ishlamaydi)
        if (
          document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body
        ) {
          document.activeElement.blur();
        }

        isDragging = true;


        pdfContainer.classList.add(
          "dragging"
        );


        dragStartX =
          e.clientX;

        dragStartY =
          e.clientY;


        scrollStartLeft =
          pdfContainer.scrollLeft;

        scrollStartTop =
          pdfContainer.scrollTop;


        e.preventDefault();

      }
    );


    document.addEventListener(
      "mousemove",
      (e) => {

        if (!isDragging) {
          return;
        }


        const dx =
          e.clientX -
          dragStartX;


        const dy =
          e.clientY -
          dragStartY;


        pdfContainer.scrollLeft =
          scrollStartLeft - dx;


        pdfContainer.scrollTop =
          scrollStartTop - dy;

      }
    );


    document.addEventListener(
      "mouseup",
      stopPdfDragging
    );


    window.addEventListener(
      "blur",
      stopPdfDragging
    );


    /* =======================================================
       AUDIO ELEMENTS
    ======================================================== */

    const audio =
      document.getElementById("audio");

    const audioInput =
      document.getElementById("audioInput");

    const openAudioBtn =
      document.getElementById("openAudioBtn");

    const playBtn =
      document.getElementById("playBtn");

    const prevAudioBtn =
      document.getElementById("prevAudioBtn");

    const nextAudioBtn =
      document.getElementById("nextAudioBtn");

    const progress =
      document.getElementById("progress");

    const currentTime =
      document.getElementById("currentTime");

    const duration =
      document.getElementById("duration");

    const speedBtn =
      document.getElementById("speedBtn");

    const volume =
      document.getElementById("volume");

    const muteBtn =
      document.getElementById("muteBtn");

    const loopBtn =
      document.getElementById("loopBtn");

    const btnA =
      document.getElementById("btnA");

    const btnB =
      document.getElementById("btnB");

    const clearLoopBtn =
      document.getElementById("clearLoopBtn");

    const audioStatus =
      document.getElementById("audioStatus");


    /* =======================================================
       AUDIO STATE
    ======================================================== */

    let audioFileURL = null;

    let pointA = null;

    let pointB = null;

    let loopEnabled = false;

    let previousVolume = 1;

    let speedIndex = 2;


    const speeds = [
      0.5,
      0.75,
      1,
      1.25,
      1.5,
      2
    ];


    /* =======================================================
       AUDIO HELPERS
    ======================================================== */

    function isAudioFile(file) {

      if (!file) {
        return false;
      }


      const type =
        String(file.type || "").toLowerCase();


      const name =
        String(file.name || "").toLowerCase();


      const audioExtensions = [
        ".mp3",
        ".wav",
        ".m4a",
        ".aac",
        ".ogg",
        ".oga",
        ".flac",
        ".webm",
        ".opus",
        ".weba"
      ];


      return (
        type.startsWith("audio/") ||
        audioExtensions.some(
          (extension) =>
            name.endsWith(extension)
        )
      );

    }


    function hasAudioSource() {

      return (
        typeof audio.src === "string" &&
        audio.src.trim() !== ""
      );

    }


    function getFiniteDuration() {

      const value =
        Number(audio.duration);


      if (
        Number.isFinite(value) &&
        value >= 0
      ) {

        return value;

      }


      return 0;

    }


    function clampTime(value) {

      const durationValue =
        getFiniteDuration();


      const numericValue =
        Number(value);


      if (
        !Number.isFinite(numericValue)
      ) {

        return 0;

      }


      if (durationValue <= 0) {

        return Math.max(
          0,
          numericValue
        );

      }


      return Math.max(
        0,
        Math.min(
          durationValue,
          numericValue
        )
      );

    }


    /* =======================================================
       PLAYLIST — BIR NECHTA AUDIO
    ======================================================== */

    const playlistBtn =
      document.getElementById("playlistBtn");

    const playlistBadge =
      document.getElementById("playlistBadge");

    const playlistPanel =
      document.getElementById("playlistPanel");

    const playlistList =
      document.getElementById("playlistList");

    const playlistTitle =
      document.getElementById("playlistTitle");

    const playlistAddBtn =
      document.getElementById("playlistAddBtn");

    const playlistAutoBtn =
      document.getElementById("playlistAutoBtn");

    const playlistClearBtn =
      document.getElementById("playlistClearBtn");

    const playlistCloseBtn =
      document.getElementById("playlistCloseBtn");

    // Har bir element: { file, name, key }
    let playlist = [];

    let playlistIndex = -1;

    // Audio tugagach keyingisiga avtomatik o'tish
    let autoNext = true;

    // true bo'lsa — tanlangan fayllar mavjud ro'yxatga qo'shiladi
    let appendMode = false;

    function revokeCurrentAudioURL() {

      if (audioFileURL) {

        URL.revokeObjectURL(
          audioFileURL
        );

        audioFileURL = null;

      }

    }

    function naturalCompare(a, b) {

      // "Unit 2" "Unit 10" dan oldin keladi
      return a.name.localeCompare(
        b.name,
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      );

    }

    function setPlaylistOpen(open) {

      playlistPanel.classList.toggle(
        "hidden",
        !open
      );

      playlistBtn.classList.toggle(
        "active",
        open
      );

      if (open) {
        renderPlaylist();
      }

    }

    function renderPlaylist() {

      playlistList.replaceChildren();

      if (!playlist.length) {

        const empty =
          document.createElement("li");

        empty.className = "playlist-empty";

        empty.textContent =
          "Ro'yxat bo'sh. «Qo'shish» orqali audio tanlang.";

        playlistList.appendChild(empty);

      }

      playlist.forEach(
        (track, i) => {

          const li =
            document.createElement("li");

          li.className =
            "playlist-item" +
            (i === playlistIndex ? " current" : "");

          li.dataset.index = String(i);

          li.title = track.name;

          const num =
            document.createElement("span");

          num.className = "playlist-num";

          if (i === playlistIndex) {

            num.innerHTML =
              '<i class="fa-solid fa-volume-high"></i>';

          } else {

            num.textContent = String(i + 1);

          }

          const name =
            document.createElement("span");

          name.className = "playlist-name";

          name.textContent = track.name;

          const remove =
            document.createElement("button");

          remove.type = "button";

          remove.className = "playlist-remove";

          remove.title = "Ro'yxatdan olib tashlash";

          remove.dataset.remove = String(i);

          remove.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';

          li.append(num, name, remove);

          playlistList.appendChild(li);

        }
      );

      playlistTitle.textContent =
        playlist.length
          ? `Playlist · ${playlist.length} ta audio`
          : "Playlist";

      playlistBadge.textContent =
        String(playlist.length);

      playlistBadge.style.display =
        playlist.length > 1
          ? "block"
          : "none";

      playlistClearBtn.disabled =
        !playlist.length;

      if (!playlistPanel.classList.contains("hidden")) {

        const current =
          playlistList.querySelector(".current");

        if (current) {

          current.scrollIntoView({
            block: "nearest"
          });

        }

      }

    }

    function loadTrack(index, options = {}) {

      if (
        index < 0 ||
        index >= playlist.length
      ) {
        return;
      }

      const autoplay =
        Boolean(options.autoplay);

      const track =
        playlist[index];

      audio.pause();

      revokeCurrentAudioURL();

      clearABLoop(
        false
      );

      playlistIndex = index;

      audioFileURL =
        URL.createObjectURL(track.file);

      audio.src =
        audioFileURL;

      audio.loop = false;

      audio.load();

      // load() tezlikni 1x ga qaytaradi — tanlangan tezlikni tiklaymiz
      updateSpeed();

      progress.value = "0";

      progress.max = "0";

      currentTime.textContent =
        "0:00";

      duration.textContent =
        "0:00";

      updateLoopButton();

      updatePlayIcon();

      renderPlaylist();

      showStatus(
        playlist.length > 1
          ? `${index + 1}/${playlist.length} · ${track.name}`
          : track.name,
        2500
      );

      if (autoplay) {

        const playPromise =
          audio.play();

        if (
          playPromise &&
          typeof playPromise.catch === "function"
        ) {

          playPromise.catch(
            (error) => {

              console.error(
                "Audio play error:",
                error
              );

              updatePlayIcon();

            }
          );

        }

      }

    }

    function addAudioFiles(fileList, append) {

      const all =
        Array.from(fileList || []);

      const valid =
        all.filter(isAudioFile);

      if (!valid.length) {

        alert(
          "Iltimos, audio fayl tanlang."
        );

        return;

      }

      const incoming =
        valid.map(
          (file) => ({
            file: file,
            name: file.name,
            key: [
              file.name,
              file.size,
              file.lastModified
            ].join("|")
          })
        ).sort(naturalCompare);

      if (append && playlist.length) {

        const known =
          new Set(
            playlist.map(
              (track) => track.key
            )
          );

        const fresh =
          incoming.filter(
            (track) => !known.has(track.key)
          );

        if (!fresh.length) {

          showStatus(
            "Bu audiolar ro'yxatda bor",
            2000
          );

          return;

        }

        playlist =
          playlist.concat(fresh);

        renderPlaylist();

        showStatus(
          `${fresh.length} ta audio qo'shildi`,
          2000
        );

        return;

      }

      playlist =
        incoming;

      loadTrack(
        0,
        { autoplay: false }
      );

      // Bir nechta audio tanlansa — ro'yxatni ko'rsatamiz
      if (playlist.length > 1) {

        setPlaylistOpen(true);

      }

    }

    function removeTrack(index) {

      if (
        index < 0 ||
        index >= playlist.length
      ) {
        return;
      }

      if (index === playlistIndex) {

        const wasPlaying =
          !audio.paused;

        playlist.splice(index, 1);

        if (!playlist.length) {

          clearPlaylist(false);

          return;

        }

        loadTrack(
          Math.min(index, playlist.length - 1),
          { autoplay: wasPlaying }
        );

      } else {

        playlist.splice(index, 1);

        if (index < playlistIndex) {
          playlistIndex--;
        }

        renderPlaylist();

      }

    }

    function clearPlaylist(showMessage = true) {

      audio.pause();

      playlist = [];

      playlistIndex = -1;

      revokeCurrentAudioURL();

      audio.removeAttribute("src");

      audio.load();

      clearABLoop(
        false
      );

      progress.value = "0";

      progress.max = "0";

      currentTime.textContent =
        "0:00";

      duration.textContent =
        "0:00";

      updateLoopButton();

      updatePlayIcon();

      renderPlaylist();

      if (showMessage) {

        showStatus(
          "Playlist tozalandi"
        );

      }

    }

    /* =======================================================
       OPEN AUDIO
    ======================================================== */

    openAudioBtn.addEventListener(
      "click",
      () => {

        appendMode = false;

        audioInput.click();

      }
    );

    audioInput.addEventListener(
      "change",
      (e) => {

        const files =
          e.target.files;

        const append =
          appendMode;

        appendMode = false;

        if (
          !files ||
          !files.length
        ) {
          return;
        }

        addAudioFiles(
          files,
          append
        );

        audioInput.value = "";

      }
    );

    /* =======================================================
       PLAYLIST UI EVENTS
    ======================================================== */

    playlistBtn.addEventListener(
      "click",
      () => {

        setPlaylistOpen(
          playlistPanel.classList.contains("hidden")
        );

      }
    );

    playlistCloseBtn.addEventListener(
      "click",
      () => setPlaylistOpen(false)
    );

    playlistAddBtn.addEventListener(
      "click",
      () => {

        appendMode = true;

        audioInput.click();

      }
    );

    playlistAutoBtn.addEventListener(
      "click",
      () => {

        autoNext = !autoNext;

        playlistAutoBtn.classList.toggle(
          "on",
          autoNext
        );

        showStatus(
          autoNext
            ? "Avto-o'tish yoqildi"
            : "Avto-o'tish o'chirildi"
        );

      }
    );

    playlistClearBtn.addEventListener(
      "click",
      () => clearPlaylist(true)
    );

    playlistList.addEventListener(
      "click",
      (e) => {

        const target =
          e.target instanceof Element
            ? e.target
            : null;

        if (!target) {
          return;
        }

        const removeBtn =
          target.closest(".playlist-remove");

        if (removeBtn) {

          removeTrack(
            Number(removeBtn.dataset.remove)
          );

          return;

        }

        const item =
          target.closest(".playlist-item");

        if (!item) {
          return;
        }

        const index =
          Number(item.dataset.index);

        if (index === playlistIndex) {

          togglePlay();

        } else {

          loadTrack(
            index,
            { autoplay: true }
          );

        }

      }
    );

    // Panel tashqarisiga bosilsa — yopiladi
    document.addEventListener(
      "pointerdown",
      (e) => {

        if (
          playlistPanel.classList.contains("hidden")
        ) {
          return;
        }

        const target =
          e.target instanceof Element
            ? e.target
            : null;

        if (
          target &&
          (
            target.closest("#playlistPanel") ||
            target.closest("#audioPlayerBar")
          )
        ) {
          return;
        }

        setPlaylistOpen(false);

      }
    );

    // Audio tugagach — keyingisiga avtomatik o'tish
    audio.addEventListener(
      "ended",
      () => {

        if (
          !autoNext ||
          playlistIndex < 0 ||
          playlistIndex >= playlist.length - 1
        ) {
          return;
        }

        // A-B loop faol bo'lsa, undan chiqib ketmaymiz
        if (
          loopEnabled &&
          pointA !== null &&
          pointB !== null
        ) {
          return;
        }

        loadTrack(
          playlistIndex + 1,
          { autoplay: true }
        );

      }
    );

    renderPlaylist();

    /* =======================================================
       PLAY / PAUSE
    ======================================================== */

    function updatePlayIcon() {

      if (audio.paused) {

        playBtn.innerHTML =
          '<i class="fa-solid fa-play"></i>';

      } else {

        playBtn.innerHTML =
          '<i class="fa-solid fa-pause"></i>';

      }

    }


    async function togglePlay() {

      if (!hasAudioSource()) {

        showStatus(
          "Avval audio oching"
        );

        return;

      }


      if (audio.paused) {

        try {

          await audio.play();

        } catch (error) {

          console.error(
            "Audio play error:",
            error
          );

          showStatus(
            "Audio ijro etilmadi"
          );

        }

      } else {

        audio.pause();

      }


      updatePlayIcon();

    }


    playBtn.addEventListener(
      "click",
      togglePlay
    );


    /* =======================================================
       PREVIOUS / NEXT
    ======================================================== */

function previousAudio() {

      if (!hasAudioSource()) {

        showStatus(
          "Avval audio oching"
        );

        return;

      }

      // Audio boshlanganiga 3 soniyadan kam bo'lsa — oldingi audioga o'tamiz
      if (
        playlistIndex > 0 &&
        audio.currentTime <= 3
      ) {

        loadTrack(
          playlistIndex - 1,
          { autoplay: !audio.paused }
        );

        return;

      }

      audio.pause();

      audio.currentTime = 0;

      clearABLoop(
        false
      );

      updateLoopButton();

      updatePlayIcon();

      showStatus(
        "Boshiga"
      );

    }

    function nextAudio() {

      if (!hasAudioSource()) {

        showStatus(
          "Avval audio oching"
        );

        return;

      }

      if (
        playlistIndex >= 0 &&
        playlistIndex < playlist.length - 1
      ) {

        loadTrack(
          playlistIndex + 1,
          { autoplay: !audio.paused }
        );

        return;

      }

      if (playlist.length > 1) {

        showStatus(
          "Bu oxirgi audio"
        );

        return;

      }

      audio.pause();

      audio.currentTime = 0;

      clearABLoop(
        false
      );

      updateLoopButton();

      updatePlayIcon();

      showStatus(
        "Keyingi audio uchun yangi fayl oching"
      );

    }

    prevAudioBtn.addEventListener(
      "click",
      previousAudio
    );


    nextAudioBtn.addEventListener(
      "click",
      nextAudio
    );


    /* =======================================================
       AUDIO METADATA
    ======================================================== */

    audio.addEventListener(
      "loadedmetadata",
      () => {

        const total =
          getFiniteDuration();


        progress.max =
          String(total);


        progress.value =
          "0";


        duration.textContent =
          formatTime(total);


        currentTime.textContent =
          "0:00";

      }
    );


    /* =======================================================
       TIME UPDATE
    ======================================================== */

    audio.addEventListener(
      "timeupdate",
      () => {

        const total =
          getFiniteDuration();


        const current =
          Number(audio.currentTime);


        if (total > 0) {

          progress.max =
            String(total);


          progress.value =
            String(
              Math.min(
                total,
                Math.max(
                  0,
                  Number.isFinite(current)
                    ? current
                    : 0
                )
              )
            );

        }


        currentTime.textContent =
          formatTime(
            current
          );


        duration.textContent =
          formatTime(
            total
          );


        checkABLoop();

      }
    );


    /* =======================================================
       PROGRESS SEEK
    ======================================================== */

    progress.addEventListener(
      "input",
      () => {

        if (!hasAudioSource()) {
          return;
        }


        const value =
          Number(progress.value);


        if (!Number.isFinite(value)) {
          return;
        }


        const safeValue =
          clampTime(value);


        try {

          audio.currentTime =
            safeValue;

        } catch (error) {

          console.error(
            "Audio seek error:",
            error
          );

        }

      }
    );


    /* =======================================================
       AUDIO EVENTS
    ======================================================== */

    audio.addEventListener(
      "canplay",
      () => {

        updatePlayIcon();

      }
    );


    audio.addEventListener(
      "play",
      () => {

        updatePlayIcon();

      }
    );


    audio.addEventListener(
      "pause",
      () => {

        updatePlayIcon();

      }
    );


    audio.addEventListener(
      "ended",
      () => {

        updatePlayIcon();

      }
    );


    audio.addEventListener(
      "error",
      () => {

        console.error(
          "Audio element error:",
          audio.error
        );


        updatePlayIcon();


        showStatus(
          "Audio faylni o'qib bo'lmadi"
        );

      }
    );


    /* =======================================================
       A-B LOOP
    ======================================================== */

    function setPointA() {

      if (!hasAudioSource()) {

        showStatus(
          "Avval audio oching"
        );

        return;

      }


      const current =
        Number(audio.currentTime);


      const safeCurrent =
        Number.isFinite(current)
          ? Math.max(
              0,
              current
            )
          : 0;


      /*
        Avvalgi behavior saqlanadi:
        A nuqta currentTime'dan 0.2 sekund oldin olinadi.
      */

      pointA =
        Math.max(
          0,
          safeCurrent - 0.2
        );


      pointB = null;

      loopEnabled = false;

      audio.loop = false;


      btnA.classList.add(
        "active"
      );

      btnB.classList.remove(
        "active"
      );


      updateLoopButton();


      showStatus(
        "A: " +
        formatTime(pointA)
      );

    }


    function setPointB() {

      if (!hasAudioSource()) {

        showStatus(
          "Avval audio oching"
        );

        return;

      }


      if (pointA === null) {

        showStatus(
          "Avval A ni bosing"
        );

        return;

      }


      const calculatedB =
        Number(audio.currentTime);


      if (!Number.isFinite(calculatedB)) {

        showStatus(
          "B nuqtani aniqlab bo'lmadi"
        );

        return;

      }


      if (calculatedB <= pointA) {

        showStatus(
          "B A dan keyin bo'lishi kerak"
        );

        return;

      }


      pointB =
        calculatedB;


      loopEnabled = true;

      audio.loop = false;


      btnB.classList.add(
        "active"
      );


      loopBtn.classList.add(
        "active"
      );


      try {

        audio.currentTime =
          pointA;

      } catch (error) {

        console.error(
          "A-B seek error:",
          error
        );

      }


      if (audio.paused) {

        audio.play()
          .then(() => {

            updatePlayIcon();

          })
          .catch(
            (error) => {

              console.error(
                "A-B autoplay error:",
                error
              );

              updatePlayIcon();

              showStatus(
                "A-B tayyor. Play tugmasini bosing."
              );

            }
          );

      } else {

        updatePlayIcon();

      }


      showStatus(
        "A-B faol"
      );

    }


    function checkABLoop() {

      if (
        !loopEnabled ||
        pointA === null ||
        pointB === null ||
        !hasAudioSource()
      ) {

        return;

      }


      const current =
        Number(audio.currentTime);


      if (!Number.isFinite(current)) {
        return;
      }


      if (
        current >= pointB
      ) {

        try {

          audio.currentTime =
            pointA;

        } catch (error) {

          console.error(
            "A-B loop seek error:",
            error
          );

        }

      }

    }


    function clearABLoop(
      showMessage = true
    ) {

      pointA = null;

      pointB = null;

      loopEnabled = false;


      btnA.classList.remove(
        "active"
      );


      btnB.classList.remove(
        "active"
      );


      updateLoopButton();


      if (showMessage) {

        showStatus(
          "A-B loop o'chirildi"
        );

      }

    }


    btnA.addEventListener(
      "click",
      setPointA
    );


    btnB.addEventListener(
      "click",
      setPointB
    );


    clearLoopBtn.addEventListener(
      "click",
      () => {

        clearABLoop(
          true
        );

      }
    );


    /* =======================================================
       A-B LOOP — ANIQ TEKSHIRUV
       (timeupdate ~250 ms da bir marta keladi, shu sababli B nuqtadan
        sezilarli o'tib ketardi; ijro paytida har kadrda tekshiramiz)
    ======================================================== */

    let abFrameId = 0;

    function abFrameLoop() {

      abFrameId = 0;

      if (
        audio.paused ||
        audio.ended
      ) {
        return;
      }

      checkABLoop();

      abFrameId =
        requestAnimationFrame(
          abFrameLoop
        );

    }

    function startABFrameLoop() {

      if (
        !abFrameId &&
        !audio.paused
      ) {

        abFrameId =
          requestAnimationFrame(
            abFrameLoop
          );

      }

    }

    audio.addEventListener(
      "play",
      startABFrameLoop
    );

    audio.addEventListener(
      "playing",
      startABFrameLoop
    );

    /* =======================================================
       NORMAL LOOP
    ======================================================== */

    function updateLoopButton() {

      loopBtn.classList.toggle(
        "active",
        Boolean(
          loopEnabled ||
          audio.loop
        )
      );

    }


    loopBtn.addEventListener(
      "click",
      () => {

        if (!hasAudioSource()) {

          showStatus(
            "Avval audio oching"
          );

          return;

        }


        if (
          pointA !== null &&
          pointB !== null
        ) {

          loopEnabled =
            !loopEnabled;


          audio.loop = false;

        } else {

          audio.loop =
            !audio.loop;


          loopEnabled = false;

        }


        updateLoopButton();

      }
    );


    /* =======================================================
       SPEED
    ======================================================== */

    function updateSpeed() {

      const speed =
        speeds[speedIndex];


      if (
        !Number.isFinite(speed) ||
        speed <= 0
      ) {

        speedIndex =
          speeds.indexOf(1);

      }


      const safeSpeed =
        speeds[speedIndex];


      audio.playbackRate =
        safeSpeed;


      speedBtn.textContent =
        safeSpeed + "x";

    }


    speedBtn.addEventListener(
      "click",
      () => {

        speedIndex =
          (
            speedIndex + 1
          ) %
          speeds.length;


        updateSpeed();

      }
    );


    updateSpeed();


    /* =======================================================
       VOLUME
    ======================================================== */

    function updateMuteIcon(vol) {

      const safeVolume =
        Number.isFinite(
          Number(vol)
        )
          ? Number(vol)
          : 0;


      if (safeVolume <= 0) {

        muteBtn.innerHTML =
          '<i class="fa-solid fa-volume-xmark"></i>';

      } else if (safeVolume < 0.5) {

        muteBtn.innerHTML =
          '<i class="fa-solid fa-volume-low"></i>';

      } else {

        muteBtn.innerHTML =
          '<i class="fa-solid fa-volume-high"></i>';

      }

    }


    volume.addEventListener(
      "input",
      () => {

        let value =
          Number(volume.value);


        if (!Number.isFinite(value)) {
          value = 1;
        }


        value =
          Math.max(
            0,
            Math.min(
              1,
              value
            )
          );


        audio.volume =
          value;


        volume.value =
          String(value);


        if (value > 0) {

          previousVolume =
            value;

        }


        updateMuteIcon(
          value
        );

      }
    );


    muteBtn.addEventListener(
      "click",
      () => {

        if (audio.volume > 0) {

          previousVolume =
            audio.volume;


          audio.volume = 0;

          volume.value = "0";

        } else {

          const restoredVolume =
            Number.isFinite(
              Number(previousVolume)
            )
              ? Math.max(
                  0.01,
                  Math.min(
                    1,
                    Number(previousVolume)
                  )
                )
              : 1;


          audio.volume =
            restoredVolume;


          volume.value =
            String(restoredVolume);

        }


        updateMuteIcon(
          audio.volume
        );

      }
    );


    /* =======================================================
       STATUS
    ======================================================== */

    let statusTimer = null;


    function showStatus(
      text,
      durationMs = 1500
    ) {

      clearTimeout(
        statusTimer
      );


      audioStatus.textContent =
        String(text || "");


      if (
        Number.isFinite(durationMs) &&
        durationMs > 0
      ) {

        statusTimer =
          setTimeout(
            () => {

              audioStatus.textContent =
                "";

            },
            durationMs
          );

      }

    }


    /* =======================================================
       TIME FORMAT
    ======================================================== */

    function formatTime(seconds) {

      const value =
        Number(seconds);


      if (
        !Number.isFinite(value) ||
        value < 0
      ) {

        return "0:00";

      }


      const minutes =
        Math.floor(
          value / 60
        );


      const secs =
        Math.floor(
          value % 60
        );


      return (
        minutes +
        ":" +
        String(secs).padStart(
          2,
          "0"
        )
      );

    }


    /* =======================================================
       KEYBOARD SHORTCUTS
    ======================================================== */

    document.addEventListener(
      "keydown",
      (e) => {

        const target =
          e.target;


        const tag =
          target &&
          typeof target.tagName === "string"
            ? target.tagName.toUpperCase()
            : "";


        /*
          Input ichida yozayotgan paytda
          shortcutlar ishlamasin.
        */

        if (
          tag === "INPUT" ||
          tag === "SELECT" ||
          tag === "TEXTAREA" ||
          (
            target &&
            target.isContentEditable
          )
        ) {

          return;

        }


        /* ===================================================
           CTRL / CMD + O — PDF
        =================================================== */

        if (
          (e.ctrlKey || e.metaKey) &&
          e.key.toLowerCase() === "o"
        ) {

          e.preventDefault();

          openPdfBtn.click();

          return;

        }


        /* ===================================================
           SPACE — PLAY / PAUSE
        =================================================== */

        if (
          e.code === "Space"
        ) {

          e.preventDefault();

          togglePlay();

          return;

        }


        /* ===================================================
           AUDIO + PDF SHORTCUTS
        =================================================== */

        /*
          Ctrl / Cmd / Alt bilan bosilgan tugmalar brauzerga qoldiriladi
          (masalan Ctrl+0 — zoomni tiklash, Alt+← — orqaga).
        */

        if (
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        ) {
          return;
        }

        switch (e.key) {

          /* A */

          case "1":

            e.preventDefault();

            setPointA();

            break;


          /* B */

          case "3":

            e.preventDefault();

            setPointB();

            break;


          /* CLEAR A-B */

          case "7":

            e.preventDefault();

            clearABLoop(true);

            break;


          /* PLAY */

          case "5":

            e.preventDefault();

            togglePlay();

            break;


          /* -2 seconds */

          case "4":

            e.preventDefault();


            if (hasAudioSource()) {

              const current =
                Number(audio.currentTime);


              const nextTime =
                Number.isFinite(current)
                  ? Math.max(
                      0,
                      current - 2
                    )
                  : 0;


              try {

                audio.currentTime =
                  clampTime(nextTime);

              } catch (error) {

                console.error(
                  "Audio seek error:",
                  error
                );

              }


              showStatus(
                "-2s"
              );

            }

            break;


          /* +2 seconds */

          case "6":

            e.preventDefault();


            if (hasAudioSource()) {

              const current =
                Number(audio.currentTime);


              const safeCurrent =
                Number.isFinite(current)
                  ? current
                  : 0;


              const total =
                getFiniteDuration();


              const requested =
                safeCurrent + 2;


              const nextTime =
                total > 0
                  ? Math.min(
                      total,
                      requested
                    )
                  : Math.max(
                      0,
                      requested
                    );


              try {

                audio.currentTime =
                  clampTime(nextTime);

              } catch (error) {

                console.error(
                  "Audio seek error:",
                  error
                );

              }


              showStatus(
                "+2s"
              );

            }

            break;


          /* START */

          case "0":

            e.preventDefault();


            if (hasAudioSource()) {

              try {

                audio.currentTime = 0;

              } catch (error) {

                console.error(
                  "Audio seek error:",
                  error
                );

              }


              showStatus(
                "Boshiga"
              );

            }

            break;


          /* VOLUME DOWN */

          case "2":

            e.preventDefault();


            audio.volume =
              Math.max(
                0,
                audio.volume - 0.1
              );


            volume.value =
              String(audio.volume);


            if (audio.volume > 0) {

              previousVolume =
                audio.volume;

            }


            updateMuteIcon(
              audio.volume
            );

            break;


          /* VOLUME UP */

          case "8":

            e.preventDefault();


            audio.volume =
              Math.min(
                1,
                audio.volume + 0.1
              );


            volume.value =
              String(audio.volume);


            if (audio.volume > 0) {

              previousVolume =
                audio.volume;

            }


            updateMuteIcon(
              audio.volume
            );

            break;


          /* LOOP */

          case "9":

            e.preventDefault();

            loopBtn.click();

            break;


          /* PLAYLIST: KEYINGI / OLDINGI AUDIO, RO'YXAT */

          case "n":
          case "N":

            if (!e.ctrlKey && !e.metaKey && !e.altKey) {

              e.preventDefault();

              nextAudio();

            }

            break;

          case "p":
          case "P":

            if (!e.ctrlKey && !e.metaKey && !e.altKey) {

              e.preventDefault();

              previousAudio();

            }

            break;

          case "l":
          case "L":

            if (!e.ctrlKey && !e.metaKey && !e.altKey) {

              e.preventDefault();

              setPlaylistOpen(
                playlistPanel.classList.contains("hidden")
              );

            }

            break;

          case "Escape":

            if (!playlistPanel.classList.contains("hidden")) {

              e.preventDefault();

              setPlaylistOpen(false);

            }

            break;

          /* MUTE */

          case "m":
          case "M":

            e.preventDefault();

            muteBtn.click();

            break;


          /* RESET SPEED */

          case "/":

            e.preventDefault();


            speedIndex =
              speeds.indexOf(1);


            updateSpeed();

            break;


          /* NEXT SPEED */

          case "*":

            e.preventDefault();


            speedIndex =
              (
                speedIndex + 1
              ) %
              speeds.length;


            updateSpeed();

            break;


          /* =================================================
             PDF PAGE NAVIGATION
          ================================================= */

          case "ArrowLeft":

            if (pdfDoc) {

              e.preventDefault();

              goToPage(
                pageNum - 1
              );

            }

            break;


          case "ArrowRight":

            if (pdfDoc) {

              e.preventDefault();

              goToPage(
                pageNum + 1
              );

            }

            break;
          
          case "ArrowUp":

  if (pdfDoc) {

    e.preventDefault();

    navLock = false;

    pdfContainer.scrollBy({
      top: -100,
      left: 0,
      behavior: "smooth"
    });

  }

  break;


case "ArrowDown":

  if (pdfDoc) {

    e.preventDefault();

    navLock = false;

    pdfContainer.scrollBy({
      top: 100,
      left: 0,
      behavior: "smooth"
    });

  }

  break;


          case "Home":

            if (pdfDoc) {

              e.preventDefault();

              goToPage(1);

            }

            break;


          case "End":

            if (pdfDoc) {

              e.preventDefault();

              goToPage(
                pdfDoc.numPages
              );

            }

            break;


          /* =================================================
             PDF ZOOM
          ================================================= */

          case "+":

          case "=":

            if (
              !e.ctrlKey &&
              !e.metaKey
            ) {

              e.preventDefault();

              changeZoom(
                ZOOM_STEP
              );

            }

            break;


          case "-":

          case "_":

            if (
              !e.ctrlKey &&
              !e.metaKey
            ) {

              e.preventDefault();

              changeZoom(
                -ZOOM_STEP
              );

            }

            break;

        }

      }
    );


    /* =======================================================
       DRAG & DROP — PDF yoki audio faylni oynaga tashlash
    ======================================================== */

    const dropOverlay =
      document.getElementById("dropOverlay");

    let dragDepth = 0;

    function dragHasFiles(e) {

      return Boolean(
        e.dataTransfer &&
        Array.from(e.dataTransfer.types || []).includes("Files")
      );

    }

    function setDropOverlay(show) {

      dropOverlay.classList.toggle(
        "show",
        show
      );

    }

    window.addEventListener(
      "dragenter",
      (e) => {

        if (!dragHasFiles(e)) {
          return;
        }

        e.preventDefault();

        dragDepth++;

        setDropOverlay(true);

      }
    );

    window.addEventListener(
      "dragover",
      (e) => {

        if (!dragHasFiles(e)) {
          return;
        }

        // Aks holda brauzer / Electron faylni ochishga urinadi
        e.preventDefault();

        e.dataTransfer.dropEffect = "copy";

      }
    );

    window.addEventListener(
      "dragleave",
      (e) => {

        if (!dragHasFiles(e)) {
          return;
        }

        dragDepth = Math.max(0, dragDepth - 1);

        if (dragDepth === 0) {
          setDropOverlay(false);
        }

      }
    );

    window.addEventListener(
      "drop",
      (e) => {

        if (!dragHasFiles(e)) {
          return;
        }

        e.preventDefault();

        dragDepth = 0;

        setDropOverlay(false);

        const files =
          Array.from(e.dataTransfer.files || []);

        const pdfFile =
          files.find(
            (file) =>
              file.type === "application/pdf" ||
              /\.pdf$/i.test(file.name)
          );

        const audioFiles =
          files.filter(isAudioFile);

        if (!pdfFile && !audioFiles.length) {

          showStatus(
            "Faqat PDF va audio fayllar qo'llab-quvvatlanadi",
            3000
          );

          return;

        }

        if (pdfFile) {

          if (!pdfJsAvailable) {

            alert(
              "PDF ko'rish moduli yuklanmadi. Dasturni qayta ishga tushiring."
            );

          } else {

            const transfer =
              new DataTransfer();

            transfer.items.add(pdfFile);

            pdfInput.files =
              transfer.files;

            pdfInput.dispatchEvent(
              new Event(
                "change",
                { bubbles: true }
              )
            );

          }

        }

        if (audioFiles.length) {

          // Ro'yxat bo'lsa — qo'shiladi, bo'lmasa — birinchisi yuklanadi
          addAudioFiles(
            audioFiles,
            true
          );

        }

      }
    );

    /* =======================================================
       SPACE (keyup) — fokusdagi tugma qo'shimcha "click" bermasin
    ======================================================== */

    document.addEventListener(
      "keyup",
      (e) => {

        if (e.code !== "Space") {
          return;
        }

        const target =
          e.target;

        const tag =
          target &&
          typeof target.tagName === "string"
            ? target.tagName.toUpperCase()
            : "";

        if (
          tag === "INPUT" ||
          tag === "SELECT" ||
          tag === "TEXTAREA" ||
          (
            target &&
            target.isContentEditable
          )
        ) {
          return;
        }

        e.preventDefault();

      }
    );

    /* =======================================================
       CLEANUP
    ======================================================== */

    window.addEventListener(
      "beforeunload",
      () => {

        clearTimeout(
          statusTimer
        );


        if (audioFileURL) {

          URL.revokeObjectURL(
            audioFileURL
          );

          audioFileURL = null;

        }


        if (
          pdfDoc &&
          typeof pdfDoc.destroy === "function"
        ) {

          try {

            pdfDoc.destroy();

          } catch (error) {

            console.error(
              "PDF cleanup error:",
              error
            );

          }

        }

      }
    );


    /* =======================================================
       INITIAL STATE
    ======================================================== */

    updatePdfButtons();

    updatePlayIcon();

    updateMuteIcon(
      audio.volume
    );

    updateLoopButton();

    updateSpeed();

  