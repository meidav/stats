/**
 * Filter shared player datalists so already-selected players are not suggested.
 */
(function () {
  function initPlayerDatalists() {
    document.querySelectorAll('datalist[id]').forEach(function (datalist) {
      var listId = datalist.id;
      var inputs = document.querySelectorAll('input[list="' + listId + '"]');
      if (!inputs.length) return;

      var allPlayers = Array.prototype.map.call(
        datalist.querySelectorAll('option'),
        function (opt) { return opt.value; }
      );

      function selectedExcept(activeInput) {
        var used = new Set();
        inputs.forEach(function (input) {
          if (input === activeInput) return;
          var value = (input.value || '').trim();
          if (value) used.add(value.toLowerCase());
        });
        return used;
      }

      function refreshDatalist(activeInput) {
        var used = selectedExcept(activeInput);
        datalist.innerHTML = '';
        allPlayers.forEach(function (name) {
          if (!used.has(name.toLowerCase())) {
            var option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
          }
        });
      }

      inputs.forEach(function (input) {
        input.addEventListener('focus', function () { refreshDatalist(input); });
        input.addEventListener('input', function () { refreshDatalist(input); });
      });

      refreshDatalist(null);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerDatalists);
  } else {
    initPlayerDatalists();
  }
})();
