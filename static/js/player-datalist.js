/**
 * Filter shared player datalists so already-selected players are not suggested.
 * Refreshes on focus/blur only (not every keystroke) with debounce and caching.
 */
(function () {
  var DEBOUNCE_MS = 120;

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var self = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(self, args);
      }, ms);
    };
  }

  function initPlayerDatalists() {
    document.querySelectorAll('datalist[id]').forEach(function (datalist) {
      var listId = datalist.id;
      var inputs = document.querySelectorAll('input[list="' + listId + '"]');
      if (!inputs.length) return;

      var allPlayers = Array.prototype.map.call(
        datalist.querySelectorAll('option'),
        function (opt) { return opt.value; }
      );
      if (!allPlayers.length) return;

      var lastKey = null;
      var pendingFrame = null;

      function usedKey(activeInput) {
        var used = [];
        inputs.forEach(function (input) {
          if (input === activeInput) return;
          var value = (input.value || '').trim();
          if (value) used.push(value.toLowerCase());
        });
        used.sort();
        return used.join('\n');
      }

      function render(activeInput) {
        var key = usedKey(activeInput);
        if (key === lastKey) return;
        lastKey = key;

        var used = new Set(key ? key.split('\n') : []);
        var fragment = document.createDocumentFragment();
        allPlayers.forEach(function (name) {
          if (!used.has(name.toLowerCase())) {
            var option = document.createElement('option');
            option.value = name;
            fragment.appendChild(option);
          }
        });
        datalist.replaceChildren(fragment);
      }

      function scheduleRender(activeInput) {
        if (pendingFrame) cancelAnimationFrame(pendingFrame);
        pendingFrame = requestAnimationFrame(function () {
          pendingFrame = null;
          render(activeInput);
        });
      }

      var debouncedRender = debounce(scheduleRender, DEBOUNCE_MS);

      inputs.forEach(function (input) {
        input.addEventListener('focus', function () {
          scheduleRender(input);
        });
        input.addEventListener('blur', function () {
          debouncedRender(null);
        });
      });

      render(null);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerDatalists);
  } else {
    initPlayerDatalists();
  }
})();
