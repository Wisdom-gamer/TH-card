(function () {
  "use strict";

    function readmapsideType(sideType, multiplier, typeMode, includeSelf, cardName, valuechange, sidetype, fight) {
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
    function checksidetype(checkSideType,checkMode,cardName,valuechange,sidetype,fight,side,type,effect) {
    const targetSideType = String(checkSideType ?? "").trim();
    const mode = String(checkMode ?? "").trim().toLowerCase();
    const sideTypes = Array.isArray(sidetype) ? sidetype.map(function (value) { return String(value ?? "").trim(); }).filter(Boolean) : [];
    const hasSideType = targetSideType !== "" && sideTypes.includes(targetSideType);

    if (mode === "in") {
      return hasSideType;
    }

    if (mode === "out") {
      return !hasSideType;
    }

    return false;
  }
  function advvalueread(expression, roundMode, upperLimit, cardName, valuechange, sidetype, fight, side, type, effect) {
  let result;

  if (typeof expression === "number") {
    result = expression;
  } else {
    let text = String(expression ?? "").trim();

    if (text === "") {
      return 0;
    }

    // value_read
    text = text.replace(/<(self|other)\.tags\.([^>]+)>/g, function (match, owner, tagName) {
      const targetSide = owner === "self" ? Number(side) : 1 - Number(side);

      const tagList = targetSide === 1 ? (fight && Array.isArray(fight.playerfighttags) ? fight.playerfighttags : []) : (fight && Array.isArray(fight.enemyfighttags) ? fight.enemyfighttags : []);

      let count = 0;

      for (let index = 0; index < tagList.length; index += 1) {
        const entry = tagList[index];

        if (Array.isArray(entry) && String(entry[0] ?? "") === String(tagName).trim()) {
          count = Number(entry[1] ?? 0);
          break;
        }
      }
      return Number.isFinite(count) ? String(count) : "0";
    });
  }

  result = Number(result);

  if (!Number.isFinite(result)) {
    return 0;
  }

  // 参数2：取整方式
  const mode = String(roundMode ?? "").trim().toLowerCase();

  if (mode === "int") {
    result = Math.floor(result);
  } else if (mode === "inth") {
    result = Math.ceil(result);
  }

  // 参数3：上限；为空时不限制
  const limitText = String(upperLimit ?? "").trim();

  if (limitText !== "") {
    const limit = Number(limitText);

    if (Number.isFinite(limit)) {
      result = Math.min(result, limit);
    }
  }

  return result;
}

  window.advvalueread = advvalueread;
  window.checksidetype = checksidetype;
  window.checkmp = checkmp;
  window.readmapsideType = readmapsideType;
})();