(function () {
  "use strict";

     function readmapsideType(sideType, multiplier, typeMode, includeSelf, cardName, valuechange, sidetype, fight) {
    if (!fight || !Array.isArray(fight.fightsitecards)) {
      return 0;
    }

    const targetSideType = String(sideType || "").trim();
    if (!targetSideType) return 0;

    /* 定位传入卡（自身）：使用时它已被移入场中，同名卡里最后入场的那张就是自身；
       统计时先排除自身，改由 includeSelf 单独决定是否计入，避免重复计数 */
    const selfName = String(cardName ?? "").trim();
    let selfIndex = -1;
    if (selfName !== "") {
      for (let i = fight.fightsitecards.length - 1; i >= 0; i -= 1) {
        const parsed = window.parseFightCard(fight.fightsitecards[i]);
        if (parsed && parsed.name === selfName) {
          selfIndex = i;
          break;
        }
      }
    }
    let count = 0;
    for (let i = 0; i < fight.fightsitecards.length; i += 1) {
      if (i === selfIndex) continue;
      const cardEntry = fight.fightsitecards[i];
      const parsed = window.parseFightCard(cardEntry);
      if (parsed && parsed.sidetype && parsed.sidetype.includes(targetSideType)) {
        count += 1;
      }
    }
    /* 传入卡不匹配目标 sidetype 时，无论 includeSelf 为何都不计入传入卡 */
    const includeSelfVal = Number(includeSelf);
    if (selfIndex !== -1 && includeSelfVal === 1 && Array.isArray(sidetype)) {
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
  function checktag(compareValue,compareMode,tagRef,cardName,valuechange,sidetype,fight,side,type,effect) {
    const mode = String(compareMode ?? "").trim();
    const compare = Number(compareValue);
    if (!Number.isFinite(compare)) {
      return false;
    }
    const refMatch = String(tagRef ?? "").trim().match(/^<\s*(self|other)\s*\.\s*(.+?)\s*>$/);
    if (!refMatch) {
      return false;
    }
    const selfSide = Number(side) === 1 ? 1 : 0;
    const checkSide = refMatch[1] === "self" ? selfSide : 1 - selfSide;
    const count = typeof window.getTagCount === "function" ? Number(window.getTagCount(fight,checkSide,refMatch[2])) : NaN;
    if (!Number.isFinite(count)) {
      return false;
    }
    if (mode === ">") {
      return count > compare;
    }
    if (mode === "=") {
      return count === compare;
    }
    if (mode === "<") {
      return count < compare;
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
    text = text.replace(/<(self|other)\.(HP|maxHP|MP|maxMP|handcard)>/g,function (match,owner,key) {
      const targetSide = owner === "self" ? Number(side) : 1 - Number(side);
      const player = targetSide === 1 ? fight.player : fight.enemy;
      if (!player) return "0";
      if (key === "HP") return String(Number(player.HP ?? 0));
      if (key === "maxHP") return String(Number(player.MAXHP ?? player.maxHP ?? 0));
      if (key === "MP") return String(Number(player.MP ?? 0));
      if (key === "maxMP") return String(Number(player.MAXMP ?? player.maxMP ?? 0));
      if (key === "handcard") {
        const hand = targetSide === 1 ? fight.playerhand : fight.enemyhand;
        return String(Array.isArray(hand) ? hand.length : 0);
      }
      return "0";
    });
    // 将替换后的算式求值（与 fight.js parseValueRead 一致），例如 "10/10"
    try {
      const calculated = Function('"use strict"; return (' + text + ')')();
      result = Number.isFinite(Number(calculated)) ? Number(calculated) : Number(text);
    } catch (e) {
      result = Number(text);
    }
  }

  result = Number(result);
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
  window.checktag = checktag;
  window.readmapsideType = readmapsideType;
})();