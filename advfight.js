(function () {
  "use strict";

    function readmapsideType(sideType, multiplier, typeMode, includeSelf, sidetype, fight) {
    if (!fight || !Array.isArray(fight.fightsitecards)) {
      return 0;
    }

    const targetSideType = String(sideType || "").trim();
    if (!targetSideType) return 0;

    let count = 0;
    for (let i = 0; i < fight.fightsitecards.length; i += 1) {
      const cardEntry = fight.fightsitecards[i];
      const parsed = window.parseFightCard(cardEntry);
      if (parsed && parsed.sidetype && parsed.sidetype.includes(targetSideType)) {
        count += 1;
      }
    }

    const includeSelfVal = Number(includeSelf);
    if (includeSelfVal === 1 && Array.isArray(sidetype)) {
      if (sidetype.includes(targetSideType)) {
        count += 1;
      }
    }

    const mult = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
    let result = count * mult;

    const mode = String(typeMode || "").trim().toLowerCase();
    if (mode === "int") {
      result = Math.floor(result);
    } else if (mode === "inth") {
      result = Math.ceil(result);
    }

    return result;
  }
    function checkmp(compareValue,compareMode,checkContent,cardName,valuechange,sidetype,fight) {
    const mode = String(compareMode ?? "").trim();
    const content = String(checkContent ?? "").trim().toLowerCase();
    const compare = Number(compareValue);
    let targetValue = NaN;

    if (!Number.isFinite(compare)) {
      return false;
    }

    if (content === "use") {
      const values = valuechange && typeof valuechange === "object" ? valuechange : {};
      targetValue = Number(values.MP ?? values.mp);
    } else if (content === "base") {
      const card = window.getFightCardData && typeof window.getFightCardData === "function" ? window.getFightCardData(cardName) : null;
      targetValue = card ? Number(card["MP"] ?? 0) : NaN;
    } else {
      return false;
    }

    if (!Number.isFinite(targetValue)) {
      return false;
    }

    if (mode === ">") {
      return targetValue > compare;
    }

    if (mode === "=") {
      return targetValue === compare;
    }

    if (mode === "<") {
      return targetValue < compare;
    }
    return false;
  }

  window.checkmp = checkmp;
  window.readmapsideType = readmapsideType;
})();