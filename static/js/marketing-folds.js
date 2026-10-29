(function () {
  var folds = document.querySelectorAll("[data-fold]");
  folds.forEach(function (fold) {
    var toggle = fold.querySelector("[data-fold-toggle]");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var closed = fold.classList.toggle("is-closed");
      toggle.setAttribute("aria-expanded", closed ? "false" : "true");
    });
  });

  document.addEventListener("click", function (event) {
    document.querySelectorAll("details.mkt-year[open]").forEach(function (picker) {
      if (!picker.contains(event.target)) {
        picker.removeAttribute("open");
      }
    });
  });
})();
