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
    index = wrap(next);
    render();
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reduceMotion) return;
    timer = window.setInterval(function () {
      go(index + 1);
    }, delay);
  }

  slides.forEach(function (slide, i) {
    slide.addEventListener("click", function () {
      if (i === index) return;
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

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  render();
  start();
})();
