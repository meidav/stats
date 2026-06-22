(function () {
  function winPctClass(value) {
    if (value > 60) return 'win-pct-high';
    if (value >= 40) return 'win-pct-mid';
    return 'win-pct-low';
  }

  function findPctColumnIndex(table) {
    var headers = table.querySelectorAll('thead th');
    for (var i = 0; i < headers.length; i++) {
      var th = headers[i];
      if (th.getAttribute('title') === 'Win %' || th.textContent.trim() === '%') {
        return i;
      }
    }
    return -1;
  }

  function colorizeTable(table) {
    var pctIndex = findPctColumnIndex(table);
    if (pctIndex < 0) return;

    table.querySelectorAll('tbody tr').forEach(function (tr) {
      var cell = tr.cells[pctIndex];
      if (!cell) return;

      var value = parseFloat(cell.textContent.replace(/[^0-9.-]/g, ''));
      if (isNaN(value)) return;

      cell.classList.remove('win-pct-high', 'win-pct-mid', 'win-pct-low');
      cell.classList.add(winPctClass(value));
    });
  }

  function colorizeWinPctTables() {
    document.querySelectorAll('.stats-table').forEach(colorizeTable);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', colorizeWinPctTables);
  } else {
    colorizeWinPctTables();
  }
})();
