(function () {
  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);

  function openStore(webUrl, nativeUrl) {
    if (nativeUrl && (isIOS || isAndroid)) {
      window.location.href = nativeUrl;
      return;
    }
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }

  function storeFallback(link) {
    if (isAndroid) {
      return {
        web: link.getAttribute("data-play-url") || link.href,
        native: link.getAttribute("data-market-url") || link.getAttribute("data-play-url"),
      };
    }
    return {
      web: link.href,
      native: link.getAttribute("data-store-url") || link.getAttribute("data-itms-url"),
    };
  }

  document.querySelectorAll(".mkt-store-link").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var itmsUrl = link.getAttribute("data-itms-url");
      var marketUrl = link.getAttribute("data-market-url");
      if (isIOS && itmsUrl) {
        event.preventDefault();
        openStore(link.href, itmsUrl);
        return;
      }
      if (isAndroid && marketUrl) {
        event.preventDefault();
        openStore(link.href, marketUrl);
      }
    });
  });

  document.querySelectorAll(".mkt-smart-open").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var appUrl = link.getAttribute("data-app-url");
      var fallback = storeFallback(link);

      if (!appUrl || (!isIOS && !isAndroid)) {
        if ((isIOS || isAndroid) && fallback.native) {
          event.preventDefault();
          openStore(fallback.web, fallback.native);
        }
        return;
      }

      event.preventDefault();
      var hidden = false;
      var timer = window.setTimeout(function () {
        if (!hidden) {
          openStore(fallback.web, fallback.native);
        }
      }, 1200);

      function clear() {
        hidden = true;
        window.clearTimeout(timer);
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", onHide);
      }

      function onHide() {
        if (document.hidden) {
          clear();
        }
      }

      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", onHide);
      window.location.href = appUrl;
    });
  });
})();
