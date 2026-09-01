(function () {
  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/i.test(ua);

  function openAppStore(url, itmsUrl) {
    if (isIOS && itmsUrl) {
      window.location.href = itmsUrl;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  document.querySelectorAll(".mkt-store-link").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var itmsUrl = link.getAttribute("data-itms-url");
      if (!isIOS || !itmsUrl) {
        return;
      }
      event.preventDefault();
      openAppStore(link.href, itmsUrl);
    });
  });

  document.querySelectorAll(".mkt-smart-open").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var appUrl = link.getAttribute("data-app-url");
      var storeUrl = link.getAttribute("data-store-url") || link.href;
      if (!appUrl || !isIOS) {
        if (isIOS && storeUrl) {
          event.preventDefault();
          openAppStore(link.href, storeUrl);
        }
        return;
      }

      event.preventDefault();
      var hidden = false;
      var timer = window.setTimeout(function () {
        if (!hidden) {
          openAppStore(link.href, storeUrl);
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
