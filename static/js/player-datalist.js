/**
 * Per-field player datalists: update only on blur/change (never on focus).
 * Caps suggestions so iOS keeps the compact keyboard bar instead of a full picker.
 */
(function () {
  var PLAYER_LIST_IDS = { players: true, players_list: true };
  var MAX_SUGGESTIONS = 12;

  function initPlayerDatalists() {
    Object.keys(PLAYER_LIST_IDS).forEach(function (masterId) {
      var master = document.getElementById(masterId);
      if (!master) return;

      var allPlayers = Array.prototype.map.call(
        master.querySelectorAll('option'),
        function (opt) { return opt.value; }
      );
      if (!allPlayers.length) return;

      var inputs = Array.prototype.filter.call(
        document.querySelectorAll('input[list="' + masterId + '"]'),
        function (input) { return input.type === 'text' || input.type === '' || !input.type; }
      );
      if (!inputs.length) return;

      var fields = inputs.map(function (input, index) {
        var datalist = document.createElement('datalist');
        datalist.id = masterId + '__field_' + (input.id || input.name || index);
        document.body.appendChild(datalist);
        input.setAttribute('list', datalist.id);
        return { input: input, datalist: datalist };
      });

      master.remove();

      var lastKey = null;

      function usedNames(excludeInput) {
        var used = [];
        fields.forEach(function (field) {
          if (field.input === excludeInput) return;
          var value = (field.input.value || '').trim();
          if (value) used.push(value.toLowerCase());
        });
        used.sort();
        return used.join('\n');
      }

      function renderField(field) {
        var usedKey = usedNames(field.input);
        var used = new Set(usedKey ? usedKey.split('\n') : []);
        var fragment = document.createDocumentFragment();
        var count = 0;

        for (var i = 0; i < allPlayers.length && count < MAX_SUGGESTIONS; i++) {
          var name = allPlayers[i];
          if (!used.has(name.toLowerCase())) {
            var option = document.createElement('option');
            option.value = name;
            fragment.appendChild(option);
            count++;
          }
        }

        field.datalist.replaceChildren(fragment);
      }

      function refreshAll() {
        var key = fields.map(function (field) {
          return (field.input.value || '').trim().toLowerCase();
        }).join('|');

        if (key === lastKey) return;
        lastKey = key;

        fields.forEach(renderField);
      }

      fields.forEach(function (field) {
        field.input.addEventListener('change', refreshAll);
        field.input.addEventListener('blur', refreshAll);
      });

      refreshAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerDatalists);
  } else {
    initPlayerDatalists();
  }
})();
