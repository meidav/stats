(function () {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatStamp(value) {
    var text = String(value || "").trim().replace("T", " ");
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})/);
    if (!match) return text;
    var date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5])
    );
    if (isNaN(date.getTime())) return text;
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var hour = date.getHours() % 12 || 12;
    var ampm = date.getHours() >= 12 ? "PM" : "AM";
    return (
      days[date.getDay()] +
      ", " +
      months[date.getMonth()] +
      " " +
      date.getDate() +
      " · " +
      hour +
      ":" +
      pad(date.getMinutes()) +
      " " +
      ampm
    );
  }

  function formatSets(metadata) {
    if (!metadata || !Array.isArray(metadata.sets) || !metadata.sets.length) return "";
    return metadata.sets
      .filter(function (item) {
        return Array.isArray(item) && item.length >= 2;
      })
      .map(function (item) {
        return item[0] + "-" + item[1];
      })
      .join(", ");
  }

  function namesHtml(names) {
    return (names || [])
      .map(function (name) {
        return "<span>" + String(name).replace(/</g, "&lt;") + "</span>";
      })
      .join("");
  }

  function gameCard(game, winLoss) {
    var setLine = formatSets(game.metadata);
    var winnerScore = winLoss ? "W" : setLine ? "" : game.winner_score;
    var loserScore = winLoss ? "L" : setLine ? "" : game.loser_score;
    var html =
      '<article class="mkt-glass mkt-game">' +
      '<p class="mkt-game-when">' +
      formatStamp(game.game_date) +
      "</p>" +
      '<div class="mkt-team mkt-team-win"><div class="mkt-team-players">' +
      namesHtml(game.winners) +
      "</div>";
    if (winnerScore !== "" && winnerScore != null) {
      html += '<span class="mkt-team-score">' + winnerScore + "</span>";
    }
    html +=
      '</div><div class="mkt-team mkt-team-loss"><div class="mkt-team-players">' +
      namesHtml(game.losers) +
      "</div>";
    if (loserScore !== "" && loserScore != null) {
      html += '<span class="mkt-team-score">' + loserScore + "</span>";
    }
    html += "</div>";
    if (setLine) {
      html += '<p class="mkt-game-sets">' + setLine + "</p>";
    }
    html += "</article>";
    return html;
  }

  var button = document.querySelector("[data-load-more]");
  if (!button) return;
  button.addEventListener("click", function () {
    if (button.disabled) return;
    var sportId = button.getAttribute("data-sport");
    var year = button.getAttribute("data-year") || "";
    var offset = Number(button.getAttribute("data-offset") || 0);
    var limit = Number(button.getAttribute("data-limit") || 50);
    var total = Number(button.getAttribute("data-total") || 0);
    var winLoss = button.getAttribute("data-win-loss") === "1";
    var params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (year) params.set("year", year);
    button.disabled = true;
    button.textContent = "Loading...";
    fetch("/api/v1/sports/" + sportId + "/games?" + params.toString())
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load games");
        return res.json();
      })
      .then(function (data) {
        var list = button.parentElement.querySelector(".mkt-game-list");
        if (!list) {
          list = document.createElement("div");
          list.className = "mkt-game-list";
          button.parentElement.insertBefore(list, button);
        }
        (data.games || []).forEach(function (game) {
          list.insertAdjacentHTML("beforeend", gameCard(game, winLoss));
        });
        var nextOffset = offset + (data.games || []).length;
        button.setAttribute("data-offset", String(nextOffset));
        var hasMore = data.has_more === true || nextOffset < (data.total || total);
        if (!hasMore || !(data.games || []).length) {
          button.remove();
          return;
        }
        button.disabled = false;
        button.textContent = "Load more (" + nextOffset + " of " + (data.total || total) + ")";
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = "Load more";
      });
  });
})();
