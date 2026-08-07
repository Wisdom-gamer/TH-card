(function () {
  "use strict";

  function refreshBattleBars() {
    if (typeof window.thCardSyncBattleBars === "function") {
      window.thCardSyncBattleBars();
    }
  }

  window.fightstart = function (...args) {
    console.log(...args);
    refreshBattleBars();
    return "win";
  };

  document.addEventListener("DOMContentLoaded", refreshBattleBars);
  document.addEventListener("th-card:stats-changed", refreshBattleBars);
})();