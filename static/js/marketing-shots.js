(function () {
  var root = document.querySelector("[data-shots]");
  if (!root) return;

  var track = root.querySelector("[data-shots-track]");
  var dotsWrap = root.querySelector("[data-shots-dots]");
  var prevBtn = root.querySelector("[data-shots-prev]");
  var nextBtn = root.querySelector("[data-shots-next]");
  var slides = Array.prototype.slice.call(root.querySelectorAll(".mkt-shot"));
  if (!track || slides.length < 2) return;

  var index = 0;
  var timer = null;
  var delay = 4500;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lightbox = null;
  var lightboxStage = null;
  var lightboxImg = null;
  var lightboxOpen = false;
  var lightboxBusy = false;
  var lastFocus = null;

  function wrap(value) {
    var len = slides.length;
    return ((value % len) + len) % len;
  }

  function shortestOffset(from, to) {
    var len = slides.length;
    var raw = to - from;
    if (raw > len / 2) return raw - len;
    if (raw < -len / 2) return raw + len;
    return raw;
  }

  function slideSrc(slide) {
    return slide.getAttribute("data-full") || (slide.querySelector("img") || {}).src || "";
  }

  function slideAlt(slide) {
    var img = slide.querySelector("img");
    return img ? img.getAttribute("alt") || "" : "";
  }

  function render() {
    slides.forEach(function (slide, i) {
      var offset = shortestOffset(index, i);
      slide.style.setProperty("--offset", String(offset));
      slide.classList.toggle("is-active", offset === 0);
      slide.classList.toggle("is-away", Math.abs(offset) > 2);
      slide.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
    });
    if (dotsWrap) {
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        var on = i === index;
        dot.classList.toggle("is-active", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }
  }

  function go(next) {
    var wrapped = wrap(next);
    if (wrapped === index) return;
    if (lightboxOpen && lightboxBusy) return;
    var dir = shortestOffset(index, wrapped) > 0 ? 1 : -1;
    index = wrapped;
    render();
    if (lightboxOpen) slideLightbox(dir);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reduceMotion || lightboxOpen) return;
    timer = window.setInterval(function () {
      go(index + 1);
    }, delay);
  }

  function makeSlide(i, extraClass) {
    var img = document.createElement("img");
    img.className = "mkt-lightbox-slide" + (extraClass ? " " + extraClass : "");
    img.src = slideSrc(slides[i]);
    img.alt = slideAlt(slides[i]);
    return img;
  }

  function preloadNeighbors() {
    [index - 1, index + 1].forEach(function (i) {
      var preload = new Image();
      preload.src = slideSrc(slides[wrap(i)]);
    });
  }

  function showLightboxImage() {
    if (!lightboxStage) return;
    lightboxStage.innerHTML = "";
    lightboxImg = makeSlide(index, "is-current");
    lightboxStage.appendChild(lightboxImg);
    lightboxBusy = false;
    preloadNeighbors();
  }

  function slideLightbox(dir) {
    if (!lightboxStage) return;
    if (reduceMotion || !lightboxImg) {
      showLightboxImage();
      return;
    }

    var incoming = makeSlide(index, dir > 0 ? "is-enter-next" : "is-enter-prev");
    var outgoing = lightboxImg;
    lightboxStage.appendChild(incoming);
    lightboxBusy = true;

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      incoming.removeEventListener("transitionend", onEnd);
      if (outgoing.parentNode) outgoing.remove();
      incoming.className = "mkt-lightbox-slide is-current";
      lightboxImg = incoming;
      lightboxBusy = false;
      preloadNeighbors();
    }

    function onEnd(event) {
      if (event.propertyName && event.propertyName !== "transform") return;
      finish();
    }

    var started = false;
    function play() {
      if (started) return;
      started = true;
      incoming.addEventListener("transitionend", onEnd);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          outgoing.classList.remove("is-current");
          outgoing.classList.add(dir > 0 ? "is-leave-next" : "is-leave-prev");
          incoming.classList.remove("is-enter-next", "is-enter-prev");
          incoming.classList.add("is-current");
        });
      });
      window.setTimeout(function () {
        if (lightboxBusy && incoming.parentNode) finish();
      }, 700);
    }

    if (incoming.complete) play();
    else {
      incoming.addEventListener("load", play);
      incoming.addEventListener("error", play);
    }
  }

  function ensureLightbox() {
    if (lightbox) return;
    lightbox = document.createElement("div");
    lightbox.className = "mkt-lightbox";
    lightbox.setAttribute("hidden", "");
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Screenshot preview");
    lightbox.innerHTML =
      '<button type="button" class="mkt-lightbox-close" data-lightbox-close aria-label="Close preview">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path></svg>' +
      "</button>" +
      '<button type="button" class="mkt-lightbox-arrow is-prev" data-lightbox-prev aria-label="Previous screenshot">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>' +
      "</button>" +
      '<div class="mkt-lightbox-stage"></div>' +
      '<button type="button" class="mkt-lightbox-arrow is-next" data-lightbox-next aria-label="Next screenshot">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>' +
      "</button>";
    document.body.appendChild(lightbox);
    lightboxStage = lightbox.querySelector(".mkt-lightbox-stage");

    lightbox.addEventListener("click", function (event) {
      if (event.target.closest("[data-lightbox-close]")) {
        closeLightbox();
        return;
      }
      if (event.target.closest("[data-lightbox-prev]")) {
        go(index - 1);
        return;
      }
      if (event.target.closest("[data-lightbox-next]")) {
        go(index + 1);
        return;
      }
      closeLightbox();
    });
  }

  function openLightbox() {
    ensureLightbox();
    lastFocus = document.activeElement;
    lightboxOpen = true;
    stop();
    showLightboxImage();
    lightbox.removeAttribute("hidden");
    document.body.classList.add("mkt-lightbox-open");
    var closeBtn = lightbox.querySelector("[data-lightbox-close]");
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    if (!lightboxOpen) return;
    lightboxOpen = false;
    if (lightbox) lightbox.setAttribute("hidden", "");
    document.body.classList.remove("mkt-lightbox-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    start();
  }

  slides.forEach(function (slide, i) {
    slide.addEventListener("click", function () {
      if (i === index) {
        openLightbox();
        return;
      }
      go(i);
      start();
    });
  });

  if (dotsWrap) {
    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "mkt-shots-dot";
      dot.setAttribute("aria-label", "Show screenshot " + (i + 1));
      dot.addEventListener("click", function () {
        go(i);
        start();
      });
      dotsWrap.appendChild(dot);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      go(index - 1);
      start();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      go(index + 1);
      start();
    });
  }

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", function (event) {
    if (!root.contains(event.relatedTarget)) start();
  });

  var touchStartX = null;
  root.addEventListener("touchstart", function (event) {
    if (!event.changedTouches || !event.changedTouches[0]) return;
    touchStartX = event.changedTouches[0].clientX;
    stop();
  }, { passive: true });
  root.addEventListener("touchend", function (event) {
    if (touchStartX == null || !event.changedTouches || !event.changedTouches[0]) {
      start();
      return;
    }
    var delta = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) > 40) {
      go(index + (delta < 0 ? 1 : -1));
    }
    start();
  }, { passive: true });

  document.addEventListener("keydown", function (event) {
    if (!lightboxOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  render();
  start();
})();
