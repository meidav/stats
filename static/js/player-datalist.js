/**
 * Per-field player datalists.
 * - Keeps the full player list in memory
 * - Filters by what the user types (all players, not just recent)
 * - Caps visible suggestions so iOS keeps the compact keyboard bar
 * - Advances to the next field after an exact name is selected
 *
 * Score datalists:
 * - Advance only when a suggestion is picked, not when typing on the keyboard
 */
(function () {
  var PLAYER_LIST_IDS = { players: true, players_list: true };
  var MAX_SUGGESTIONS = 12;
  var SCORE_LIST_IDS = {
    w_scores: true,
    l_scores: true,
    winning_scores: true,
    losing_scores: true,
    winning_scores_list: true,
    losing_scores_list: true
  };

  function normalize(value) {
    return (value || '').trim().toLowerCase();
  }

  function focusNext(currentInput) {
    var form = currentInput.form;
    if (!form) return;

    var focusable = Array.prototype.filter.call(
      form.querySelectorAll('input, select, textarea, button'),
      function (el) {
        return !el.disabled && el.type !== 'hidden' && el.offsetParent !== null;
      }
    );
    var index = focusable.indexOf(currentInput);
    if (index >= 0 && index < focusable.length - 1) {
      var next = focusable[index + 1];
      next.focus();
      if (typeof next.select === 'function' && next.type !== 'date' && next.type !== 'time') {
        try { next.select(); } catch (e) { /* ignore */ }
      }
    }
  }

  function isKeyboardInputType(inputType) {
    if (!inputType) return false;
    return (
      inputType.indexOf('insertText') === 0 ||
      inputType.indexOf('insertCompositionText') === 0 ||
      inputType.indexOf('insertFromYank') === 0 ||
      inputType.indexOf('delete') === 0 ||
      inputType === 'historyUndo' ||
      inputType === 'historyRedo'
    );
  }

  function initPlayerDatalists() {
    Object.keys(PLAYER_LIST_IDS).forEach(function (masterId) {
      var master = document.getElementById(masterId);
      if (!master) return;

      var allPlayers = Array.prototype.map.call(
        master.querySelectorAll('option'),
        function (opt) { return opt.value; }
      ).filter(Boolean);
      if (!allPlayers.length) return;

      var nameSet = {};
      allPlayers.forEach(function (name) {
        nameSet[normalize(name)] = name;
      });

      var inputs = Array.prototype.filter.call(
        document.querySelectorAll('input[list="' + masterId + '"]'),
        function (input) {
          return input.type === 'text' || input.type === '' || !input.type;
        }
      );
      if (!inputs.length) return;

      var fields = inputs.map(function (input, index) {
        var datalist = document.createElement('datalist');
        datalist.id = masterId + '__field_' + (input.id || input.name || index);
        document.body.appendChild(datalist);
        input.setAttribute('list', datalist.id);
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocapitalize', 'words');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('spellcheck', 'false');
        return { input: input, datalist: datalist };
      });

      master.remove();

      function usedNames(excludeInput) {
        var used = {};
        fields.forEach(function (field) {
          if (field.input === excludeInput) return;
          var value = normalize(field.input.value);
          if (value) used[value] = true;
        });
        return used;
      }

      function matchingPlayers(query, excludeInput) {
        var used = usedNames(excludeInput);
        var q = normalize(query);
        var prefix = [];
        var contains = [];

        for (var i = 0; i < allPlayers.length; i++) {
          var name = allPlayers[i];
          var lower = normalize(name);
          if (used[lower]) continue;

          if (!q) {
            prefix.push(name);
          } else if (lower.indexOf(q) === 0) {
            prefix.push(name);
          } else if (lower.indexOf(q) !== -1) {
            contains.push(name);
          }

          if (prefix.length >= MAX_SUGGESTIONS) break;
        }

        var results = prefix.concat(contains);
        return results.slice(0, MAX_SUGGESTIONS);
      }

      function renderField(field, query) {
        var matches = matchingPlayers(
          query === undefined ? field.input.value : query,
          field.input
        );
        var fragment = document.createDocumentFragment();
        matches.forEach(function (name) {
          var option = document.createElement('option');
          option.value = name;
          fragment.appendChild(option);
        });
        field.datalist.replaceChildren(fragment);
      }

      function clearSuggestions(field) {
        field.datalist.replaceChildren();
      }

      function exactCanonicalName(value) {
        return nameSet[normalize(value)] || null;
      }

      function maybeAdvance(field) {
        var canonical = exactCanonicalName(field.input.value);
        if (!canonical) return false;

        if (field.input.value !== canonical) {
          field.input.value = canonical;
        }
        clearSuggestions(field);
        setTimeout(function () {
          focusNext(field.input);
        }, 10);
        return true;
      }

      fields.forEach(function (field) {
        field.input.addEventListener('input', function () {
          if (maybeAdvance(field)) return;
          renderField(field);
        });

        field.input.addEventListener('change', function () {
          if (maybeAdvance(field)) return;
          renderField(field);
        });

        field.input.addEventListener('focus', function () {
          if (!exactCanonicalName(field.input.value)) {
            renderField(field);
          }
        });

        field.input.addEventListener('blur', function () {
          var canonical = exactCanonicalName(field.input.value);
          if (canonical && field.input.value !== canonical) {
            field.input.value = canonical;
          }
          fields.forEach(function (other) {
            if (other === field) return;
            if (!exactCanonicalName(other.input.value)) {
              renderField(other);
            }
          });
        });

        renderField(field, '');
      });
    });
  }

  function initScoreDatalistAdvance() {
    Object.keys(SCORE_LIST_IDS).forEach(function (listId) {
      var list = document.getElementById(listId);
      if (!list) return;

      var optionValues = {};
      Array.prototype.forEach.call(list.querySelectorAll('option'), function (opt) {
        var value = String(opt.value || '').trim();
        if (value) optionValues[value] = true;
      });
      if (!Object.keys(optionValues).length) return;

      var inputs = document.querySelectorAll('input[list="' + listId + '"]');
      Array.prototype.forEach.call(inputs, function (input) {
        var typedWithKeyboard = false;

        input.addEventListener('keydown', function (event) {
          if (
            event.key === 'Tab' ||
            event.key === 'Shift' ||
            event.key === 'Alt' ||
            event.key === 'Control' ||
            event.key === 'Meta' ||
            event.key === 'Escape'
          ) {
            return;
          }
          typedWithKeyboard = true;
        });

        input.addEventListener('input', function (event) {
          var value = String(input.value || '').trim();
          var fromKeyboard =
            typedWithKeyboard || isKeyboardInputType(event.inputType);

          // Reset after this input so a later suggestion tap can still advance
          typedWithKeyboard = false;

          if (!value || !optionValues[value]) return;
          if (fromKeyboard) return;

          setTimeout(function () {
            if (document.activeElement !== input) return;
            if (String(input.value || '').trim() !== value) return;
            focusNext(input);
          }, 10);
        });
      });
    });
  }

  function init() {
    initPlayerDatalists();
    initScoreDatalistAdvance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
