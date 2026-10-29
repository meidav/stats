(function () {
  function winPctClass(value) {
    if (value > 60) return 'win-pct-high';
    if (value >= 40) return 'win-pct-mid';
    return 'win-pct-low';
  }

  function findColumnIndexes(table) {
    var headers = table.querySelectorAll('thead th');
    var indexes = { pct: -1, wins: -1, losses: -1 };
    for (var i = 0; i < headers.length; i++) {
      var th = headers[i];
      var title = (th.getAttribute('title') || '').trim();
      var text = th.textContent.trim();
      if (title === 'Win %' || text === '%') indexes.pct = i;
      if (title === 'Wins' || text === 'W') indexes.wins = i;
      if (title === 'Losses' || text === 'L') indexes.losses = i;
    }
    return indexes;
  }

  function colorizeTable(table) {
    var indexes = findColumnIndexes(table);
    if (indexes.pct < 0 && indexes.wins < 0 && indexes.losses < 0) return;

    table.querySelectorAll('tbody tr').forEach(function (tr) {
      if (indexes.pct >= 0) {
        var pctCell = tr.cells[indexes.pct];
        if (pctCell) {
          var value = parseFloat(pctCell.textContent.replace(/[^0-9.-]/g, ''));
          if (!isNaN(value)) {
            pctCell.classList.remove('win-pct-high', 'win-pct-mid', 'win-pct-low');
            pctCell.classList.add(winPctClass(value));
          }
        }
      }
      if (indexes.wins >= 0 && tr.cells[indexes.wins]) {
        tr.cells[indexes.wins].classList.add('stat-cell-wins');
      }
      if (indexes.losses >= 0 && tr.cells[indexes.losses]) {
        tr.cells[indexes.losses].classList.add('stat-cell-losses');
      }
    });

    var headers = table.querySelectorAll('thead th');
    if (indexes.wins >= 0 && headers[indexes.wins]) {
      headers[indexes.wins].classList.add('stat-header-wins');
    }
    if (indexes.losses >= 0 && headers[indexes.losses]) {
      headers[indexes.losses].classList.add('stat-header-losses');
    }
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
