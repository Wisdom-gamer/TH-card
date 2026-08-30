(function () {
  "use strict";

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function toInt(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number) ? Math.floor(number) : fallback;
  }

function parseFightCard(cardEntry) {
    const text = String(cardEntry ?? "");
    const firstSeparatorIndex = text.indexOf(";");
    if (firstSeparatorIndex === -1) {
      return {
        name: text,
        sidetype: [],
        valuechange: {}
      };
    }

    const secondSeparatorIndex = text.indexOf(";",firstSeparatorIndex + 1);
    const name = text.slice(0,firstSeparatorIndex);
    const sidetypeText = secondSeparatorIndex === -1 ? text.slice(firstSeparatorIndex + 1) : text.slice(firstSeparatorIndex + 1,secondSeparatorIndex);
    const valuechangeText = secondSeparatorIndex === -1 ? "" : text.slice(secondSeparatorIndex + 1);
    let valuechange = {};

    if (valuechangeText) {
      try {
        const parsedValuechange = JSON.parse(valuechangeText);
        if (isObject(parsedValuechange)) {
          valuechange = parsedValuechange;
        }
      } catch (error) {
        valuechange = {};
      }
    }

    return {
      name: name,
      sidetype: sidetypeText === "" ? [] : sidetypeText.split("|").map(function (value) { return value.trim(); }).filter(Boolean),
      valuechange: valuechange
    };
  }

  function createFightCardEntry(cardName,sidetype,valuechange) {
    const name = String(cardName ?? "");
    const types = Array.isArray(sidetype) ? sidetype.filter(Boolean) : [];
    const values = isObject(valuechange) ? valuechange : {};
    const valuechangeText = Object.keys(values).length > 0 ? `;${JSON.stringify(values)}` : "";
    return types.length > 0 ? `${name};${types.join("|")}${valuechangeText}` : `${name}${valuechangeText}`;
  }

  function fightCardHasSideType(cardEntry,sidetype) {
    return parseFightCard(cardEntry).sidetype.includes(String(sidetype ?? ""));
  }

  function shuffle(list) {
    for (
      let index = list.length - 1;
      index > 0;
      index -= 1
    ) {
      const swapIndex = Math.floor(
        Math.random() * (index + 1)
      );

      [
        list[index],
        list[swapIndex]
      ] = [
        list[swapIndex],
        list[index]
      ];
    }

    return list;
  }

  function getAdventureCardById(cardId) {
    const database =
      window.adventureCardsDatabase;

    if (!isObject(database)) {
      return null;
    }

    const targetId =
      String(cardId ?? "");

    for (
      const [name, card]
      of Object.entries(database)
    ) {
      if (
        card &&
        String(card.ID ?? "") === targetId
      ) {
        return {
          name: name,
          card: card
        };
      }
    }

    return null;
  }

  function getAdventureStats() {
    const stats =
      isObject(window.adventureStats)
        ? window.adventureStats
        : {};

    const savedText =
      localStorage.getItem(
        "TH_CARD_CHARACTER"
      );

    let saved = null;

    if (savedText) {
      try {
        const data =
          JSON.parse(savedText);

        if (isObject(data)) {
          saved = data;
        }
      } catch (error) {
        console.warn(
          "角色战斗状态读取失败",
          error
        );
      }
    }

    const hpSource = saved ? (saved.adventurehp ?? saved.HP) : (stats.HP ?? window.adventurehp ?? window.HP);

    const mpSource = saved ? (saved.adventuremp ?? saved.MP) : (stats.MP ?? window.adventuremp ?? window.MP);

    const hp = Number.isFinite(Number(hpSource)) ? Math.floor(Number(hpSource)) : 0;

    const maxHPSource = saved ? (saved.maxHP ?? hp) : (stats.maxHP ?? window.maxHP ?? hp);

    const maxMPSource = saved ? (saved.maxMP ?? mpSource) : (stats.maxMP ?? window.maxMP ?? mpSource);

    const maxHP = Number.isFinite(Number(maxHPSource)) &&  Number(maxHPSource) > 0 ? Math.floor(Number(maxHPSource)) : hp;

    const mp = Number.isFinite(Number(mpSource)) ? Math.floor(Number(mpSource)) : 0;

    const maxMP = Number.isFinite(Number(maxMPSource)) && Number(maxMPSource) > 0 ? Math.floor(Number(maxMPSource)) : mp;

    return {HP: hp,MAXHP: maxHP,MP: mp,MAXMP: maxMP};
  }

  function getPlayerCardImage(cardName) {
    const database = window.cardDatabase;

    const card = isObject(database) ? database[cardName] : null;

    return card && card["图片"];
  }

  function getEnemyCardImage(cardName) {
    const database = window.adventureCardsDatabase;

    const card = isObject(database) ? database[cardName] : null;

    return card && `images/adventure/${card.ID}.png`;
  }

  function renderSlots(slotSelector,cards,imageResolver,labelPrefix) {
    const slots = Array.from(document.querySelectorAll(slotSelector));

    slots.forEach(
      function (button, index) {
        const cardEntry = cards[index];
        const cardName = parseFightCard(cardEntry).name;

        const img = button.querySelector("img");

        button.dataset.index = String(index);

        if (cardName) {
          button.classList.remove(
            "is-empty"
          );

          button.disabled = false;

          button.dataset.card = cardName;

          button.setAttribute(
            "aria-label",
            cardName
          );

          if (img) {
            img.src = imageResolver(cardName);

            img.alt = cardName;
          }
        } else {
          button.classList.add("is-empty");

          button.disabled = true;

          button.removeAttribute("data-card");

          button.setAttribute("aria-label",`${labelPrefix}空卡位${index + 1}`);

            img.src = "null.png";
            img.alt = "empty card";
        }
      }
    );
  }

  function updateBattleBars() {
    if (
      typeof window.thCardSyncBattleBars === "function"
    ) {
      window.thCardSyncBattleBars();
    }
  }

  /*
    更新战斗全局变量以及
    牌库/坟场数量。
  */
  function exposeBattleGlobals(fight) {
    window.fight = fight;
    window.fightenemy = fight.enemy;
    window.fightplayer = fight.player;

    window.fightenemycards = fight.enemycards;
    window.fightenemyhand = fight.enemyhand;
    window.fightplayercards = fight.playercards;
    window.fightplayerhand = fight.playerhand;
    window.fightsitecards = fight.fightsitecards;
    window.fightsitecardsow = fight.fightsitecardsow;
    window.fightplayergrave = fight.fightplayergrave;
    window.fightenemygrave = fight.fightenemygrave;
    window.fightplayerequip = fight.fightplayerequip;
    window.fightenemyequip = fight.fightenemyequip;

    window.fightplayerfighttags = fight.playerfighttags;
    window.fightenemyfighttags = fight.enemyfighttags;

    window.enemyhp = fight.enemy.HP;
    window.maxenemyhp = fight.enemy.MAXHP;
    window.enemymp = fight.enemy.MP;
    window.maxenemymp = fight.enemy.MAXMP;

    window.playerhp = fight.player.HP;
    window.maxplayerhp = fight.player.MAXHP;
    window.playermp = fight.player.MP;
    window.maxplayermp = fight.player.MAXMP;
    
window.fightplayerability = fight.playerability;
window.fightenemyability = fight.enemyability;

    updateFightPileCounts(fight);
    renderFightEquip(fight, 1);
    renderFightEquip(fight, 0);
    // render tags UI
    renderFightTags(fight);
    updateBattleBars();
  }

  /*
    更新卡组和坟场数量。
  */
  function updateFightPileCounts(fight) {
    const playerDeck = document.getElementById("fightplayerdecknum");
    const playerGrave = document.getElementById("fightplayergravenum");
    const enemyDeck = document.getElementById("fightenemydecknum");
    const enemyGrave = document.getElementById("fightenemygravenum");

    if (playerDeck) {
      playerDeck.textContent = String(fight.playercards.length);
    }

    if (playerGrave) {
      playerGrave.textContent = String(fight.fightplayergrave.length);
    }

    if (enemyDeck) {
      enemyDeck.textContent = String(fight.enemycards.length);
    }

    if (enemyGrave) {
      enemyGrave.textContent = String(fight.fightenemygrave.length);
    }
  }

  /*
    创建战斗场地上的卡牌。
  */
  function renderFightSite(fight) {
    const site = document.getElementById("fightsite");

    if (!site) {
      return;
    }

    site.innerHTML = "";

    fight.fightsitecards.forEach(
      function (cardEntry, index) {
        const cardName = parseFightCard(cardEntry).name;

        const owner = fight.fightsitecardsow[index];

        const button = document.createElement("button");

        const img = document.createElement("img");

        button.type = "button";
        button.className = "fightsite-card";

        button.tabIndex = -1;

        button.setAttribute(
          "aria-label",
          cardName
        );

        /*
          1 = 玩家
          0 = 敌人
        */
        img.src = owner === 1 ? getPlayerCardImage(cardName) : getEnemyCardImage(cardName);

        img.alt = cardName;

        button.appendChild(img);
        site.appendChild(button);
      }
    );

    updateFightPileCounts(fight);
  }
function renderFightEquip(fight,owner) {
    const box = document.getElementById(owner === 1 ? "fightplayerequip" : "fightenemyequip");

    if (!box) {
      return;
    }

    const cards = owner === 1 ? fight.fightplayerequip : fight.fightenemyequip;

    const imageResolver = owner === 1 ? getPlayerCardImage : getEnemyCardImage;

    box.innerHTML = "";

    cards.forEach(
      function (cardEntry) {
        const cardName = parseFightCard(cardEntry).name;

        const slot = document.createElement("div");

        const img = document.createElement("img");

        slot.className = "bag-slot";

        slot.setAttribute(
          "aria-label",
          cardName
        );

        img.src =
          imageResolver(
            cardName
          );

        img.alt = cardName;

        slot.appendChild(img);
        box.appendChild(slot);
      }
    );
  }

  // ---------- tags 数据缓存与读取 ----------
  let tagsDatabase = null;
  function stripJsonComments(text) {
    let result = "";
    let inString = false;
    let escaped = false;

    for (let index = 0; index < text.length; index += 1) {
      const current = text[index];
      const next = text[index + 1];

      if (inString) {
        result += current;

        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === "\"") {
          inString = false;
        }

        continue;
      }

      if (current === "\"") {
        inString = true;
        result += current;
        continue;
      }

      if (current === "/" && next === "/") {
        while (index < text.length && text[index] !== "\n") index += 1;
        result += "\n";
        continue;
      }

      if (current === "/" && next === "*") {
        index += 2;
        while (
          index < text.length &&
          !(text[index] === "*" && text[index + 1] === "/")
        ) {
          if (text[index] === "\n") result += "\n";
          index += 1;
        }
        index += 1;
        continue;
      }

      result += current;
    }

    return result;
  }

  async function loadTagsDatabase() {
    if (tagsDatabase !== null) return tagsDatabase;
    try {
      const resp = await fetch("tags.json", { cache: "no-store" });
      if (!resp.ok) {
        console.error("tags.json加载失败:", resp.status, resp.statusText, resp.url);
        return {};
      }
      const text = await resp.text();
      tagsDatabase = JSON.parse(stripJsonComments(text));
    } catch (e) {
      console.error("tags.json读取失败:", e);
      return {};
    }
    return tagsDatabase;
  }
  // ---------- end tags loader ----------
    // Global variable to track picked cards during effect execution
  let cardpick = null;

  function parseCardSelection(config) {
    if (!isObject(config)) return null;
    return {
      mode: String(config.mode || 'get').trim(),
      pick: String(config.pick || 'random').trim(),
      value: toInt(config.value, 1),
      side: String(config.side || 'other').trim(),
      sidetypechange: String(config.sidetypechange || '').trim()
    };
  }

  function applySidetypeChange(sidetype, changeStr) {
    if (!changeStr || changeStr === '') return sidetype;
    
    const changes = changeStr.split(';').map(s => s.trim()).filter(Boolean);
    let result = Array.isArray(sidetype) ? [...sidetype] : [];
    
    for (const change of changes) {
      const match = change.match(/^([+\-])\|(.+)$/);
      if (!match) continue;
      
      const operator = match[1];
      const typeToChange = match[2];
      
      if (operator === '+') {
        if (!result.includes(typeToChange)) {
          result.push(typeToChange);
        }
      } else if (operator === '-') {
        const idx = result.indexOf(typeToChange);
        if (idx !== -1) {
          result.splice(idx, 1);
        }
      }
    }
    
    return result;
  }

  function randomSelectCard(fight, side) {
    const hand = side === 1 ? fight.playerhand : fight.enemyhand;
    if (!hand || hand.length === 0) return null;
    
    const randomIdx = Math.floor(Math.random() * hand.length);
    return [side, randomIdx];
  }

  function setupManualCardSelection(fight, side, callback) {
    const isPlayer = side === 1;
    const selector = isPlayer 
      ? ".game-area .player.bottom .slots .card-slot"
      : ".game-area .player.top .slots .card-slot";
    
    const slots = Array.from(document.querySelectorAll(selector));
    
    const originalBorders = [];
    slots.forEach((button, idx) => {
      originalBorders[idx] = button.style.border;
      const cardEntry = (isPlayer ? fight.playerhand : fight.enemyhand)[idx];
      const cardName = parseFightCard(cardEntry).name;
      
      if (cardName && !button.classList.contains('is-empty')) {
        button.style.border = '4px solid orange';
        button.style.cursor = 'pointer';
        
        const handleClick = function(e) {
          e.stopPropagation();
          cleanupSelection();
          callback([side, idx]);
        };
        
        button.addEventListener('click', handleClick, { once: true });
        button.dataset.selectable = 'true';
      }
    });
    
    const cleanupSelection = function() {
      slots.forEach((button, idx) => {
        button.style.border = originalBorders[idx] || '';
        button.style.cursor = '';
        delete button.dataset.selectable;
      });
    };
  }

  /*
    将卡牌移动到场上。

    owner:
      1 = 玩家
      0 = 敌人
  */
  function movetosite(fight,cardName,owner,sidetype,loops,valuechange = {}) {
    if(loops != 1) return false;
    if (!fight || !cardName) {
      return false;
    }
  if (sidetype.includes("ability")) {
    return false;
  }
  if (sidetype.includes("selfdeleteonsite")) {
    return true;
  }
    owner = Number(owner) === 1 ? 1 : 0;

    /* 卡牌加入场上数组末尾。 */
    fight.fightsitecards.push(createFightCardEntry(cardName,sidetype,valuechange));

    /* 相同位置保存所有者。 */
    fight.fightsitecardsow.push(owner);

    renderFightSite(fight);

    return true;
  }

  /*
    将场上所有卡牌移动到
    原持有者的坟场。
  */
    function moveSiteCardsToGrave(fight) {
    const graveRemoveSideTypes = ["other"];
    for (let index = 0;index < fight.fightsitecards.length;index += 1) {
      const cardEntry = fight.fightsitecards[index];

      const owner = fight.fightsitecardsow[index];

      if (fightCardHasSideType(cardEntry,"temp")) {
        continue;
      }
      const moveToOtherGrave = fightCardHasSideType(cardEntry,"other");
      const parsedCard = parseFightCard(cardEntry);
      const graveCardEntry = createFightCardEntry(parsedCard.name,parsedCard.sidetype.filter(function (sidetype) { return !graveRemoveSideTypes.includes(sidetype); }),{});
      // 带有other的卡牌会移动到另一方的坟场
      if (owner === 1) {
        if (moveToOtherGrave){
        fight.fightplayergrave.push(graveCardEntry);
        }else{
        fight.fightenemygrave.push(graveCardEntry);
        }
      } else {
        if (moveToOtherGrave){
        fight.fightenemygrave.push(graveCardEntry);
        }else{
        fight.fightplayergrave.push(graveCardEntry);
        }
      }
    }

    /* 清空场上两组数组。 */
    fight.fightsitecards.length = 0;
    fight.fightsitecardsow.length = 0;

    renderFightSite(fight);
  }

  /*
    回合结束后：
    如果指定牌组数量为 0，
    则把对应坟场全部加入牌组，
    然后清空坟场。
  */
  function recycleGraveIfDeckEmpty(fight,owner) {
    const deck = owner === 1 ? fight.playercards : fight.enemycards;

    const grave = owner === 1 ? fight.fightplayergrave : fight.fightenemygrave;

    if (
      deck.length !== 0 ||
      grave.length === 0
    ) {
      return;
    }

    deck.push(...grave);

    grave.length = 0;
  }

  /*
    玩家牌库 / 敌人牌库
    都在回合结束时检查。
  */
  function recycleGraves(fight) {
    recycleGraveIfDeckEmpty(fight,1);

    recycleGraveIfDeckEmpty(fight,0);

    updateFightPileCounts(fight);
  }

  function buildCardPool(source) {
    const pool = [];

    if (Array.isArray(source)) {
      source.forEach(
        function (cardName) {
          const name =
            String(cardName).trim();

          if (name) {
            pool.push(name);
          }
        }
      );
    } else if (
      isObject(source)
    ) {
      for (const [cardName,count] of Object.entries(source)) {
        if (cardName === "type" || cardName === "maxnumber") {
          continue;
        }

        const amount =Math.max(0,toInt(count, 0));

        for (let index = 0;index < amount;index += 1) {
          pool.push(cardName);
        }
      }
    }

    return shuffle(pool);
  }

  function createBattleState(enemyId) {
    const enemyRecord = getAdventureCardById(enemyId);
    const enemyCard = enemyRecord ? enemyRecord.card : {};
    const adventureStats =  getAdventureStats();

    const enemyHP = Math.max(0,toInt(enemyCard.HP, 0));
    const enemyMP = Math.max(0,toInt(enemyCard.MP, 0));

    const pc = window.playerCharacterData || {};
    const playerDeck = window.playerDeck && typeof window.playerDeck.getCards === "function" ? window.playerDeck.getCards().slice() : [];

    return {
      turn: 1,

        enemy: {
        name:enemyRecord ? enemyRecord.name : String(enemyId || "敌人"),

        ID: String(enemyCard.ID || enemyId || ""),

        HP: enemyHP,
        MAXHP: enemyHP,

        MP: enemyMP,
        MAXMP: enemyMP
      },

      playerability: pc && pc.ability ? [[String(pc.ability.name || ""), toInt(pc.ability.turn, 0), 0]] : [],
      enemyability: enemyCard.ability ? [[String(enemyCard.ability.name || ""), toInt(enemyCard.ability.turn, 0), 0]] : [],

      player: {
        name: String(window.selectedCharacter || "玩家"),

        HP:adventureStats.HP,
        MAXHP:adventureStats.MAXHP,
        MP:adventureStats.MAXMP,
        MAXMP:adventureStats.MAXMP
      },

      /* 玩家牌组 */
      playercards:shuffle(playerDeck),
      /* 敌人牌组 */
      enemycards:buildCardPool(enemyCard.cards),
      /* 手牌 */
      playerhand: [],
      enemyhand: [],
      /*  战斗场地卡牌。两个数组下标一一对应。  */
      fightsitecards: [],
      fightsitecardsow: [],

      /* 玩家坟场 */
      fightplayergrave: [],
      /* 敌人坟场 */    
      fightenemygrave: [],

      /* 玩家装备 */
      fightplayerequip: [],
      /* 敌人装备 */
      fightenemyequip: [],
      /* 新增：玩家与敌人的标签数组，二维格式 [ [name,count], ... ] */
      playerfighttags: [],
      enemyfighttags: [],
      resolve: null,
      ended: false,
      carduseLocked: false,
    };
  }

  function renderEnemyHand(fight) {
    const cards = fight.enemyhand;
    renderSlots(".game-area .player.top .slots .card-slot",cards,getEnemyCardImage,"敌人");
  }

function drawPlayerCards(DCnumber) {
  const drawCount = DCnumber;
  for (let index = 0;index < drawCount;index += 1) {
    const cardEntry = fight.playercards.pop();
    if (!cardEntry) {
      break;
    }
    const cardName = String(cardEntry).trim();
    const card = getFightCardData(cardName);
    const sidetypeStr = card && String(card.sidetype || '').trim();
    const sidetype = sidetypeStr && sidetypeStr !== '' ? sidetypeStr.split(';').map(s => s.trim()).filter(Boolean) : [];
    const valuechange = {};
    const mpValue = card ? Number(card["MP"] ?? 0) : 0;
    if (Number.isFinite(mpValue)) {
      valuechange.MP = mpValue;
    }
    fight.playerhand.push(createFightCardEntry(cardName,sidetype,valuechange));
  }

  window.fightplayerhand = fight.playerhand;
  updateFightPileCounts(fight);
}
function drawEnemyCards(DCnumber) {
  const drawCount = DCnumber;
  for (let index = 0;index < drawCount;index += 1) {
    const cardEntry = fight.enemycards.pop();
    if (!cardEntry) {
      break;
    }
    const cardName = String(cardEntry).trim();
    const card = getFightCardData(cardName);
    const sidetypeStr = card && String(card.sidetype || '').trim();
    const sidetype = sidetypeStr && sidetypeStr !== '' ? sidetypeStr.split(';').map(s => s.trim()).filter(Boolean) : [];
    const valuechange = {};
    const mpValue = card ? Number(card["MP"] ?? 0) : 0;
    if (Number.isFinite(mpValue)) {
      valuechange.MP = mpValue;
    }
    fight.enemyhand.push(createFightCardEntry(cardName,sidetype,valuechange));
  }

  window.fightenemyhand = fight.enemyhand;
  updateFightPileCounts(fight);
}
  function renderPlayerHand(fight) {
    renderSlots(".game-area .player.bottom .slots .card-slot",fight.playerhand,getPlayerCardImage,"玩家");
  }
  function renderAbilityButton(fight, owner) {
  const abilities = owner === 1 ? fight.playerability : fight.enemyability;
  const containerId = owner === 1 ? "fightplayerability" : "fightenemyability";
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(abilities) || abilities.length === 0) return;

  abilities.forEach(function (entry, idx) {
    const cardName = String(entry[0] ?? "").trim();
    const total = Number(entry[1] ?? 0);
    const remaining = Number(entry[2] ?? 0);
    if (!cardName) return;
    const card = getFightCardData(cardName);
    if (!card) return;

    const imageResolver = owner === 1 ? getPlayerCardImage : getEnemyCardImage;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.ability = "true";
    btn.dataset.owner = String(owner);
    btn.dataset.abilityIndex = String(idx);
    btn.setAttribute("aria-label", cardName + (remaining > 0 ? `（冷却${remaining}回合）` : ""));

    const img = document.createElement("img");
    img.src = imageResolver(cardName);
    img.alt = cardName;
    btn.appendChild(img);

    if (remaining > 0) {
      const badge = document.createElement("div");
      badge.className = "ability-cooldown";
      badge.textContent = String(remaining);
      btn.appendChild(badge);
    }

    container.appendChild(btn);

    if (owner !== 1) {
      btn.disabled = true;
      return;
    }

    const effect = card["效果"];
    const mpCost = card ? Number(card["MP"] ?? 0) : 0;

    btn.disabled = fight.carduseLocked || remaining > 0 || !effect || (Number.isFinite(mpCost) && mpCost > 0 && fight.player.MP < mpCost);
    btn.onclick = async function () {
      // re-read entry by index in case abilities array mutated
      const abilityEntry = (Array.isArray(fight.playerability) && fight.playerability[idx]) ? fight.playerability[idx] : entry;
      const abilityRemaining = Number(abilityEntry[2] ?? 0);
      if (!window.fight || window.fight !== fight || fight.ended || fight.carduseLocked || abilityRemaining > 0) return;
      if (Number.isFinite(mpCost) && mpCost > 0 && fight.player.MP < mpCost) return;

      fight.carduseLocked = true;

      if (Number.isFinite(mpCost) && mpCost > 0) {
        fight.player.MP -= mpCost;
      }

      try {
        const type = card["类型"] ?? "技能卡";
        const tagValue = String(card["tag"] ?? "").trim();

        await carduse(1,type,effect,tagValue,cardName,fight,["ability"]);

        // set remaining cooldown to total
        const totalVal = toInt(abilityEntry[1], 0);
        abilityEntry[2] = Math.max(0, totalVal);

        const outcome = getFightOutcome(fight);
        if (outcome === "win" || outcome === "lost") {
          finishFight(fight,outcome);
          return;
        }
      } finally {
        fight.carduseLocked = false;
        exposeBattleGlobals(fight);
        renderAbilityButton(fight,1);
        renderAbilityButton(fight,0);
        setPlayerHandDisabled(fight,false);
        bindPlayerHandActions(fight);
      }
    };
  });
}
    function getFightCardData(cardName) {
    const database = window.cardDatabase;

    if (!isObject(database)) {
      return null;
    }
    return database[cardName] || null;
  }
function parseValueRead(expression, fight, side) {
  if (typeof expression !== "string") return Number(expression);
  let result = String(expression).trim();
  const tagPattern = /<(self|other)\.tags\.([^>]+)>/g;
  result = result.replace(tagPattern, function (match, owner, tagName) {
    const targetSide = owner === "self" ? side : (1 - side);
    const count = getTagCount(fight, targetSide, tagName);
    return String(count);
  });
  try {
    const calculated = Function('"use strict"; return (' + result + ')')();
    return Number.isFinite(calculated) ? calculated : Number(expression);
  } catch (e) {
    return Number(expression);
  }
}

    function prepareJudgementEffect(effect) {
    if (effect === null || effect === undefined) {
      return null;
    }

    if (!isObject(effect)) {
      return effect;
    }

    const nextEffect = {...effect};

    if (Object.prototype.hasOwnProperty.call(nextEffect,"伤害")) {
      const damage = nextEffect["伤害"];
      if (!isObject(damage) || (damage.value === null || damage.value === undefined) && !Object.prototype.hasOwnProperty.call(damage,"value_read") || Object.prototype.hasOwnProperty.call(damage,"value") && !Number.isFinite(Number(damage.value)) || Object.prototype.hasOwnProperty.call(damage,"value") && Number(damage.value) === 0) {
        delete nextEffect["伤害"];
      }
    }

    return Object.keys(nextEffect).length > 0 ? nextEffect : null;
  }

    async function runJudgementStep(step,result,fight,register,stepIndex) {
      const effect = prepareJudgementEffect(result.effect);
      if (effect === null) {
        const ret = {side:result.side,type:result.type,effect:effect,tag:result.tag,sidetype:result.sidetype,cardName:result.cardName,valuechange:result.valuechange,register:-1};
        return ret;
      }
      const stepResult = await step(result.side,result.type,effect,result.tag,result.sidetype,fight,typeof register === "number" ? register : -1,typeof stepIndex === "number" ? stepIndex:0,result.cardName,result.valuechange);
      if (stepResult && typeof stepResult === "object") {
        stepResult.cardName = result.cardName;
        stepResult.valuechange = result.valuechange;
        stepResult.register = -1;
      }
      return stepResult;
    }

  function equipRuleMatch(rule,tag) {
    const rules = String(rule ?? "").split(";").map(function (value) { return value.trim(); }).filter(Boolean);
    const tags = String(tag ?? "").split(";").map(function (value) { return value.trim(); }).filter(Boolean);
    return rules.some(function (value) { return tags.includes(value); });
  }
  async function effectruleAPI(side,type,effect,tag,sidetype,fight,register,stepIndex,sourceData,ownerSide,sourceCount,cardName,valuechange) {
    const source = isObject(sourceData) ? sourceData : {};
    let nextEffect = effect;
    let effectIndex = 1;
    const sourceName = String(cardName ?? "");
    const sourceValuechange = isObject(valuechange) ? valuechange : {};
    while (true) {
      const effectKey = effectIndex === 1 ? "效果" : `效果_${effectIndex}`;
      if (!Object.prototype.hasOwnProperty.call(source,effectKey)) {
        break;
      }
      const sourceEffect = source[effectKey];
      if (isObject(sourceEffect)) {
        if (!equipRuleMatch(sourceEffect["rule"],tag)) {
          effectIndex += 1;
          continue;
        }
        if (!sideruleMatches(sourceEffect["siderule"],side,ownerSide)) {
          effectIndex += 1;
          continue;
        }
        let rulePassed = true;
        if (Object.prototype.hasOwnProperty.call(sourceEffect,"rule_js")) {
          const funcName = String(sourceEffect.rule_js ?? "").trim();
          const inputText = String(sourceEffect.input ?? "").trim();
          const params = inputText === "" ? [] : inputText.split(";").map(function (value) { return value.trim(); });
          if (funcName && typeof window[funcName] === "function") {
            try {
              rulePassed = !!(await window[funcName](...params,sourceName,sourceValuechange,sidetype,fight,side,type,effect));
            } catch (error) {
              console.error(`Error calling ${funcName}:`,error);
              rulePassed = false;
            }
          }
        }
        if (rulePassed) {
          const result = await effectAPI(side,type,effect,tag,sidetype,fight,register,stepIndex,sourceEffect,ownerSide,sourceCount,sourceName,sourceValuechange);
          if (result && Object.prototype.hasOwnProperty.call(result,"effect")) {
            nextEffect = result.effect;
          }
        }
      }
      effectIndex += 1;
    }
    return {side:side,type:type,effect:nextEffect,tag:tag,sidetype:sidetype,register:-1};
  }
  function sideruleMatches(siderule,incomingSide,equipOwnerSide) {
    const rule = String(siderule ?? "").trim();
    if (!rule || rule === "" || rule === "all") return true;
    if (rule === "self") {
      return Number(incomingSide) === Number(equipOwnerSide);
    }
    if (rule === "other") {
      return Number(incomingSide) !== Number(equipOwnerSide);
    }
    // default: no restriction
    return true;
  }

  // ---------- 新增：标签数组操作 & 渲染工具 ----------
  function getTagListForSide(fight, side) {
    return side === 1 ? fight.playerfighttags : fight.enemyfighttags;
  }

  function findTagIndex(list, name) {
    for (let i = 0; i < list.length; i += 1) {
      if (String(list[i][0]) === String(name)) return i;
    }
    return -1;
  }

  function modifyTagCount(fight, side, name, delta) {
    if (!fight) return;
    const list = getTagListForSide(fight, side);
    const idx = findTagIndex(list, name);
    if (idx === -1) {
      if (delta > 0) {
        list.push([String(name), Math.floor(delta)]);
      }
    } else {
      list[idx][1] = Number(list[idx][1]) + Number(delta);
      if (!Number.isFinite(Number(list[idx][1])) || list[idx][1] <= 0) {
        list.splice(idx, 1);
      } else {
        list[idx][1] = Math.floor(list[idx][1]);
      }
    }
    renderFightTags(fight);
  }

  function getTagCount(fight, side, name) {
    const list = getTagListForSide(fight, side);
    const idx = findTagIndex(list, name);
    return idx === -1 ? 0 : Number(list[idx][1]);
  }

  // 渲染标签到 DOM：player bottom 显示 playerfighttags，player top 显示 enemyfighttags
  function renderFightTags(fight) {
  if (!fight) return;
  const playBox = document.getElementById("playertags");
  const enemyBox = document.getElementById("enemytags");
  if (playBox) {
    playBox.innerHTML = "";
    (fight.playerfighttags || []).forEach(function (entry) {
      const name = String(entry[0] ?? "");
      const count = Number(entry[1] ?? 0);
      if (!name) return;
      const tagDef = tagsDatabase && isObject(tagsDatabase[name]) ? tagsDatabase[name] : null;
      const hidden = tagDef && (tagDef.hide === true || String(tagDef.hide ?? "").trim().toLowerCase() === "true");
      if (hidden) return;
      // 每种标记只渲染一个图标，并在右下角显示数值徽章
      const wrapper = document.createElement("span");
      wrapper.className = "tag-wrapper";
      wrapper.setAttribute("role", "img");
      wrapper.setAttribute("aria-label", `${name} ×${count}`);
      const img = document.createElement("img");
      img.src = `images/tags/${name}.png`;
      img.alt = name;
      wrapper.appendChild(img);
      const badge = document.createElement("span");
      badge.className = "tag-badge";
      badge.textContent = String(Math.max(0, count));
      wrapper.appendChild(badge);
      playBox.appendChild(wrapper);
    });
  }
  if (enemyBox) {
    enemyBox.innerHTML = "";
    (fight.enemyfighttags || []).forEach(function (entry) {
      const name = String(entry[0] ?? "");
      const count = Number(entry[1] ?? 0);
      if (!name) return;
      const tagDef = tagsDatabase && isObject(tagsDatabase[name]) ? tagsDatabase[name] : null;
      const hidden = tagDef && (tagDef.hide === true || String(tagDef.hide ?? "").trim().toLowerCase() === "true");
      if (hidden) return;
      const wrapper = document.createElement("span");
      wrapper.className = "tag-wrapper";
      wrapper.setAttribute("role", "img");
      wrapper.setAttribute("aria-label", `${name} ×${count}`);
      const img = document.createElement("img");
      img.src = `images/tags/${name}.png`;
      img.alt = name;
      wrapper.appendChild(img);
      const badge = document.createElement("span");
      badge.className = "tag-badge";
      badge.textContent = String(Math.max(0, count));
      wrapper.appendChild(badge);
      enemyBox.appendChild(wrapper);
    });
  }
}
   function findMorereturnTag(fight, side) {
     const list = getTagListForSide(fight, side);
     if (!Array.isArray(list)) return -1;
     for (let i = 0; i < list.length; i += 1) {
       const entry = list[i];
       const tagName = String(entry[0] ?? "");
       if (tagName) {
         const tagDef = tagsDatabase && isObject(tagsDatabase[tagName]) ? tagsDatabase[tagName] : null;
         if (tagName === "额外回合" || (tagDef && String(tagDef.ID ?? "") === "moreturn")) return i;
       }
     }
     return -1;
   }
  // ---------- end 标签工具 ----------
  
 // 渲染战斗界面背包与装备（简单渲染，复用 .bag-slot 结构）
function renderFightBags() {
  // 玩家背包（道具）
  const playerBagEl = document.getElementById("fightplayerbag");
  if (playerBagEl) {
    playerBagEl.innerHTML = "";
    (window.fightplayerbag || []).forEach(function (cardName) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bag-slot";
      btn.dataset.card = cardName;
      btn.setAttribute("aria-label", cardName);
      const img = document.createElement("img");
      img.src = window.cardDatabase[cardName]["图片"];
      img.alt = cardName;
      btn.appendChild(img);
      btn.addEventListener("mouseenter", function () {
        if (typeof window.showCardInfo === "function") window.showCardInfo(cardName);
      });
      playerBagEl.appendChild(btn);
    });
  }

  // 玩家装备（战斗专用 equip 区）
  const playerEquipEl = document.getElementById("fightplayerequip");
  if (playerEquipEl) {
    playerEquipEl.innerHTML = "";
    (window.fightplayerequip || []).forEach(function (cardName) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bag-slot";
      btn.dataset.card = cardName;
      btn.setAttribute("aria-label", cardName);
      const img = document.createElement("img");
      img.src = window.cardDatabase[cardName]["图片"];
      img.alt = cardName;
      btn.appendChild(img);
      btn.addEventListener("mouseenter", function () {
        if (typeof window.showCardInfo === "function") window.showCardInfo(cardName);
      });
      playerEquipEl.appendChild(btn);
    });
  }

  // 敌人背包（展示占位，暂不从存档读取）
  const enemyBagEl = document.getElementById("fightenemybag");
  if (enemyBagEl) {
    enemyBagEl.innerHTML = "";
    (window.fightenemybag || []).forEach(function (cardName) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bag-slot";
      btn.dataset.card = cardName;
      btn.setAttribute("aria-label", cardName);
      const img = document.createElement("img");
      img.src = window.cardDatabase[cardName]["图片"];
      img.alt = cardName;
      btn.appendChild(img);
      enemyBagEl.appendChild(btn);
    });
  }

  // 敌人装备（战斗专用 equip 区），保持为空或按数组渲染
  const enemyEquipEl = document.getElementById("fightenemyequip");
  if (enemyEquipEl) {
    enemyEquipEl.innerHTML = "";
    (window.fightenemyequip || []).forEach(function (cardName) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bag-slot";
      btn.dataset.card = cardName;
      btn.setAttribute("aria-label", cardName);
      const img = document.createElement("img");
      img.src = window.cardDatabase[cardName]["图片"];
      img.alt = cardName;
      btn.appendChild(img);
      enemyEquipEl.appendChild(btn);
    });
  }
}
  async function startsidecounter(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    const counterSide = side === 1 ? 1 : 0;
    const hand = counterSide === 1 ? fight.playerhand : fight.enemyhand;
    const startIndex = (typeof register === "number" && register >= 0) ? register + 1 : 0;
    for (let index = startIndex;index < hand.length;index += 1) {
      const cardEntry = hand[index];
      const parsedCard = parseFightCard(cardEntry);
      const sourceCardName = parsedCard.name;
      const sourceCard = getFightCardData(sourceCardName);
      const sourceTag = sourceCard ? String(sourceCard["tag"] ?? "").trim() : "";
      const sourceType = sourceCard ? String(sourceCard["类型"] ?? "").trim() : "";
      if (!sourceCardName || sourceType !== "反制卡" || !isObject(sourceCard)) continue;
      const result = await effectruleAPI(side,type,effect,tag,sidetype,fight,index,stepIndex,sourceCard,counterSide,1,cardName,valuechange);
      effect = result.effect;
    }
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function startsideequip(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    const equips = side === 1 ? fight.fightplayerequip : fight.fightenemyequip;
    const ownerSide = side === 1 ? 1 : 0;
    const startIndex = (typeof register === "number" && register >= 0) ? (register + 1) : 0;
    for (let index = startIndex;index < equips.length;index += 1) {
      const sourceCardName = parseFightCard(equips[index]).name;
      const sourceCard = getFightCardData(sourceCardName);
      if (!isObject(sourceCard)) continue;
      const result = await effectruleAPI(side,type,effect,tag,sidetype,fight,index,stepIndex,sourceCard,ownerSide,1,cardName,valuechange);
      effect = result.effect;
    }
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function startsidetrait(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function startsidetag(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    const ownerSide = side === 1 ? 1 : 0;
    const tagList = getTagListForSide(fight,ownerSide);
    if (!tagList || tagList.length === 0) return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
    const tagDefs = await loadTagsDatabase();
    const startIndex = (typeof register === "number" && register >= 0) ? register + 1 : 0;
    for (let index = startIndex;index < tagList.length;index += 1) {
      const entry = tagList[index];
      const tagName = String(entry[0] ?? "");
      const tagCount = Number(entry[1] ?? 0);
      if (!tagName || tagCount <= 0) continue;
      const sourceData = tagDefs[tagName];
      if (!isObject(sourceData)) continue;
      const result = await effectruleAPI(side,type,effect,tag,sidetype,fight,index,stepIndex,sourceData,ownerSide,tagCount,cardName,valuechange);
      effect = result.effect;
    }
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function nsidetag(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    const ownerSide = side === 1 ? 0 : 1;
    const tagList = getTagListForSide(fight,ownerSide);
    if (!tagList || tagList.length === 0) return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
    const tagDefs = await loadTagsDatabase();
    const startIndex = (typeof register === "number" && register >= 0) ? register + 1 : 0;
    for (let index = startIndex;index < tagList.length;index += 1) {
      const entry = tagList[index];
      const tagName = String(entry[0] ?? "");
      const tagCount = Number(entry[1] ?? 0);
      if (!tagName || tagCount <= 0) continue;
      const sourceData = tagDefs[tagName];
      if (!isObject(sourceData)) continue;
      const result = await effectruleAPI(side,type,effect,tag,sidetype,fight,index,stepIndex,sourceData,ownerSide,tagCount,cardName,valuechange);
      effect = result.effect;
    }
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function nsidetrait(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function nsideequip(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    const equips = side === 1 ? fight.fightenemyequip : fight.fightplayerequip;
    const ownerSide = side === 1 ? 0 : 1;
    const startIndex = (typeof register === "number" && register >= 0) ? (register + 1) : 0;
    for (let index = startIndex;index < equips.length;index += 1) {
      const sourceCardName = parseFightCard(equips[index]).name;
      const sourceCard = getFightCardData(sourceCardName);
      if (!isObject(sourceCard)) continue;
      const result = await effectruleAPI(side,type,effect,tag,sidetype,fight,index,stepIndex,sourceCard,ownerSide,1,cardName,valuechange);
      effect = result.effect;
    }
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function nsidecounter(side,type,effect,tag,sidetype,fight,register,stepIndex,cardName,valuechange) {
    const counterSide = side === 1 ? 0 : 1;
    const hand = counterSide === 1 ? fight.playerhand : fight.enemyhand;
    const startIndex = (typeof register === "number" && register >= 0) ? register + 1 : 0;
    for (let index = startIndex;index < hand.length;index += 1) {
      const cardEntry = hand[index];
      const parsedCard = parseFightCard(cardEntry);
      const sourceCardName = parsedCard.name;
      const sourceCard = getFightCardData(sourceCardName);
      const sourceType = sourceCard ? String(sourceCard["类型"] ?? "").trim() : "";
      if (!sourceCardName || sourceType !== "反制卡" || !isObject(sourceCard)) continue;
      const result = await effectruleAPI(side,type,effect,tag,sidetype,fight,index,stepIndex,sourceCard,counterSide,1,cardName,valuechange);
      effect = result.effect;
    }
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

    function setPlayerHandDisabled(fight,disabled) {
    const slots = Array.from(document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));

    slots.forEach(
      function (button,index) {
        if (disabled) {
          button.disabled = true;
          return;
        }

        const cardEntry = fight.playerhand[index];
        const cardName = parseFightCard(cardEntry).name;

        if (!cardName || button.classList.contains("is-empty")) {
          button.disabled = true;
          return;
        }

        const card = getFightCardData(cardName);
        const effect = card ? card["效果"] : null;
        const mpCost = card ? Number(card["MP"] ?? 0) : 0;

        button.disabled =
          Number.isFinite(mpCost) &&
          mpCost > 0 &&
          fight.player.MP < mpCost;
      }
    );
  }
  function updatePlayerHandMPDisabled(fight) {
    const slots = Array.from(document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));

    slots.forEach(
      function (button,index) {
        const cardEntry = fight.playerhand[index];
        const cardName = parseFightCard(cardEntry).name;
        const card = getFightCardData(cardName);
        const effect = card ? card["效果"] : null;
        const mpCost = Number(effect["MP"] ?? 0);

        if (!cardName) {
          button.disabled = true;
          return;
        }

        button.disabled = fight.carduseLocked || (Number.isFinite(mpCost) && mpCost > 0 && fight.player.MP < mpCost);
      }
    );
  }
  function getFightOutcome(fight) {
  if (fight.player.HP > 0 && fight.enemy.HP <= 0) {
    return "win";
  }

  if (fight.player.HP <= 0) {
    return "lost";
  }

  return null;
}

function finishFight(fight, outcome) {
  if (!fight || fight.ended) {
    return outcome;
  }

  fight.ended = true;

  const endTurnButton = document.querySelector(
    ".game-area .end-turn"
  );

  if (endTurnButton) {
    endTurnButton.disabled = true;
    endTurnButton.onclick = null;
  }

  const resolve = fight.resolve;
  fight.resolve = null;

  if (typeof resolve === "function") {
    resolve(outcome);
  }

  return outcome;
}
  function getEffectReadValue(path,side,fight) {
    const currentSide = Number(side) === 1 ? 1 : 0;
    const otherSide = 1 - currentSide;
    const selfState = currentSide === 1 ? fight.player : fight.enemy;
    const otherState = otherSide === 1 ? fight.player : fight.enemy;
    const selfTags = currentSide === 1 ? fight.playerfighttags : fight.enemyfighttags;
    const otherTags = otherSide === 1 ? fight.playerfighttags : fight.enemyfighttags;
    const text = String(path ?? "").trim();
    const match = text.match(/^(self|other)\.([^.]+)(?:\.(.+))?$/);
    if (!match) return NaN;
    const target = match[1] === "self" ? selfState : otherState;
    const tags = match[1] === "self" ? selfTags : otherTags;
    const key = match[2];
    const rest = match[3] ?? "";
    if (key === "tags") {
      if (!rest) return NaN;
      const tagName = rest;
      return getTagCount(fight,match[1] === "self" ? currentSide : otherSide,tagName);
    }
    if (!Object.prototype.hasOwnProperty.call(target,key)) return NaN;
    let value = target[key];
    if (rest) {
      for (const part of rest.split(".")) {
        if (value === null || value === undefined) return NaN;
        value = value[part];
      }
    }
    return Number(value);
  }

  function evaluateEffectValueRead(expression,side,fight) {
    const text = String(expression ?? "").trim();
    const replaced = text.replace(/<([^<>]+)>/g,function (_,path) {
      const value = getEffectReadValue(path,side,fight);
      return Number.isFinite(value) ? String(value) : "NaN";
    });
    if (!/^[0-9+\-*/().\sNaN]+$/.test(replaced)) return NaN;
    try {
      const value = Function(`"use strict";return (${replaced});`)();
      return Number.isFinite(Number(value)) ? Number(value) : NaN;
    } catch (error) {
      return NaN;
    }
  }
async function advvalue(config,side,fight,cardName,valuechange,sidetype,type,effect) {
  if (!isObject(config)) return 0;
  if (Object.prototype.hasOwnProperty.call(config,"value_read")) {
    const value = parseValueRead(config.value_read,fight,side);
    return Number.isFinite(value) ? value : 0;
  }
  if (Object.prototype.hasOwnProperty.call(config,"value_js")) {
    const funcName = String(config.value_js ?? "").trim();
    const inputText = String(config.input ?? "").trim();
    const params = inputText === "" ? [] : inputText.split(";").map(function (value) { return value.trim(); });
    if (!funcName || typeof window[funcName] !== "function") return 0;
    try {
      const value = await window[funcName](...params,cardName ?? fight.currentCardName ?? "",isObject(valuechange) ? valuechange : (isObject(fight.currentCardValuechange) ? fight.currentCardValuechange : {}),sidetype,fight,side,type,effect);
      return Number.isFinite(Number(value)) ? Number(value) : 0;
    } catch (error) {
      console.error(`Error calling ${funcName}:`,error);
      return 0;
    }
  }
  const value = Number(config.value);
  return Number.isFinite(value) ? value : 0;
}
async function effectAPI(side,type,effect,tag,sidetype,fight,register,stepIndex,sourceEffect,ownerSide,sourceCount,cardName,valuechange) {
//  console.log(side,type,effect,tag,sidetype,fight,register,stepIndex,sourceEffect,ownerSide,sourceCount);
  const source = isObject(sourceEffect) ? sourceEffect : {};

  let nextEffect = effect;
    if (!isObject(nextEffect) && isObject(sourceEffect)) {
    nextEffect = {...sourceEffect};
  }
  const effectSide = Number(ownerSide) === 1 ? 1 : 0;
    if (isObject(nextEffect) && isObject(nextEffect["数值修改"])) {
    nextEffect = {...nextEffect};

    const valueModify = {};

    for (const [path,config] of Object.entries(nextEffect["数值修改"])) {
      let newPath = String(path ?? "");

      newPath = newPath.replace("<selfside>",side === 1 ? "player" : "enemy");
      newPath = newPath.replace("<otherside>",side === 1 ? "enemy" : "player");

      const newConfig = isObject(config) ? {...config} : {value:config};
      if (Object.prototype.hasOwnProperty.call(newConfig,"value_read") || Object.prototype.hasOwnProperty.call(newConfig,"value_js")) {
        const value = await advvalue(newConfig,side,fight,cardName,valuechange,sidetype,type,effect);
        newConfig.value = Number.isFinite(value) ? value : 0;
        delete newConfig.value_read;
        delete newConfig.value_js;
      }
      valueModify[newPath] = newConfig;
    }
    nextEffect["数值修改"] = valueModify;
  }
  if (isObject(nextEffect) && isObject(nextEffect["伤害"])) {
    const damage = nextEffect["伤害"];
    if (Object.prototype.hasOwnProperty.call(damage,"value_read") || Object.prototype.hasOwnProperty.call(damage,"value_js")) {
      const value = await advvalue(damage,side,fight,cardName,valuechange,sidetype,type,effect);
      nextEffect = {...nextEffect};
      nextEffect["伤害"] = {...damage,value:Number.isFinite(value) ? value : 0};
      delete nextEffect["伤害"].value_read;
      delete nextEffect["伤害"].value_js;
    }
  }
  const damageModifier = source["伤害修改"];
  if (isObject(damageModifier) && isObject(nextEffect) && isObject(nextEffect["伤害"])) {
    const random = Number(damageModifier.random);
    if (Number.isFinite(random) && random > 0 && Math.random() < random) {
      // 不执行此效果
    } else {
      const damage = nextEffect["伤害"];
      const damageType = String(damage.type ?? "").trim();
      const requiredType = String(damageModifier.type ?? "").trim();
      if (!requiredType || !requiredType.split(";").map(function (value) { return value.trim(); }).filter(Boolean).includes(damageType)) {
      } else {
        nextEffect = {...nextEffect};
        if (Object.prototype.hasOwnProperty.call(damageModifier,"value_new")) {
          const newValue = Number(damageModifier.value_new);
          if (Number.isFinite(newValue)) {
            nextEffect["伤害"] = {...damage,value:Math.max(0,Math.floor(newValue))};
          }
        } else {
          let modifierValue;
          if (Object.prototype.hasOwnProperty.call(damageModifier,"value_read") || Object.prototype.hasOwnProperty.call(damageModifier,"value_js")) {
            modifierValue = await advvalue(damageModifier,side,fight,cardName,valuechange,sidetype,type,effect);
          } else {
            modifierValue = Number(damageModifier.value);
          }
          const damageValue = Number(damage.value);
          if (Number.isFinite(modifierValue) && Number.isFinite(damageValue)) {
            nextEffect["伤害"] = {...damage,value:Math.max(0,Math.floor(damageValue - modifierValue))};
          }
        }
      }
    }
  }
  if (isObject(nextEffect) && isObject(nextEffect["标记"])) {
    nextEffect = {...nextEffect,"标记":{...nextEffect["标记"]}};
    for (const [tagName,tagConfig] of Object.entries(nextEffect["标记"])) {
      if (!isObject(tagConfig)) continue;
      const nextTagConfig = {...tagConfig};
      for (const sideName of ["self","other","all"]) {
        if (!isObject(nextTagConfig[sideName])) continue;
        const nextSideConfig = {...nextTagConfig[sideName]};
        if (Object.prototype.hasOwnProperty.call(nextSideConfig,"value_read") || Object.prototype.hasOwnProperty.call(nextSideConfig,"value_js")) {
          const value = await advvalue(nextSideConfig,side,fight,cardName,valuechange,sidetype,type,effect);
          nextSideConfig.value = Number.isFinite(value) ? value : 0;
          delete nextSideConfig.value_read;
          delete nextSideConfig.value_js;
        }
        nextTagConfig[sideName] = nextSideConfig;
      }
      nextEffect["标记"][tagName] = nextTagConfig;
    }
  }
  if (isObject(nextEffect) && isObject(nextEffect["抽卡"])) {
    const drawCard = nextEffect["抽卡"];
    if (Object.prototype.hasOwnProperty.call(drawCard,"value_read") || Object.prototype.hasOwnProperty.call(drawCard,"value_js")) {
      const value = await advvalue(drawCard,side,fight,cardName,valuechange,sidetype,type,effect);
      nextEffect = {...nextEffect};
      nextEffect["抽卡"] = {...drawCard,value:Number.isFinite(value) ? value : 0};
      delete nextEffect["抽卡"].value_read;
      delete nextEffect["抽卡"].value_js;
    }
  }
  if (isObject(nextEffect) && isObject(nextEffect["获取卡"])) {
    nextEffect = {...nextEffect,"获取卡":{...nextEffect["获取卡"]}};
    for (const [getCardName,getCardConfig] of Object.entries(nextEffect["获取卡"])) {
      if (!isObject(getCardConfig)) continue;
      const nextGetCardConfig = {...getCardConfig};
      if (Object.prototype.hasOwnProperty.call(nextGetCardConfig,"value_read") || Object.prototype.hasOwnProperty.call(nextGetCardConfig,"value_js")) {
        const value = await advvalue(nextGetCardConfig,side,fight,cardName,valuechange,sidetype,type,effect);
        nextGetCardConfig.value = Number.isFinite(value) ? value : 0;
        delete nextGetCardConfig.value_read;
        delete nextGetCardConfig.value_js;
      }
      nextEffect["获取卡"][getCardName] = nextGetCardConfig;
    }
  }
  if (isObject(source["被动伤害"])) {
    const passive = source["被动伤害"];
    let value;
    if (Object.prototype.hasOwnProperty.call(passive,"value_read") || Object.prototype.hasOwnProperty.call(passive,"value_js")) {
      value = await advvalue(passive,side,fight,cardName,valuechange,sidetype,type,effect);
    } else {
      value = Number(passive.value);
    }
    if (Number.isFinite(value) && value !== 0) {
      const nestedEffect = {"伤害":{value:value,type:passive.type}};
      await carduse(effectSide,type,nestedEffect,tag,sidetype,fight,register,stepIndex);
    }
  }
    // Handle card selection
  // Handle card selection from main effect
  const cardSelection = isObject(nextEffect) ? nextEffect["卡牌选择"] : null;
  if (isObject(cardSelection)) {
    const selectConfig = parseCardSelection(cardSelection);
    
    if (selectConfig.pick === 'random') {
      // Random selection - do it now
      const selectSide = selectConfig.side === 'self' ? Number(side) : (1 - Number(side));
      const selectedCard = randomSelectCard(fight, selectSide);
      if (selectedCard) {
        cardpick = selectedCard;
      }
      // Set pick to null to prevent re-selection
      nextEffect = {...nextEffect};
      nextEffect["卡牌选择"] = {...selectConfig};
      nextEffect["卡牌选择"].pick = null;
    }
  }
  return {side:side,type:type,effect:nextEffect,tag:tag,sidetype:sidetype,register:register};
}
async function cardeffect(side,type,effect,fight) {
//  console.log(side,type,effect,fight);
  /* 数值修改 */
  const valueModify = isObject(effect) ? effect["数值修改"] : null;

  if (isObject(valueModify)) {
    for (const [path,config] of Object.entries(valueModify)) {
      if (!isObject(config)) {
        continue;
      }

      const value = Number(config.value);
      const valueNew = Number(config.value_new);

      const match = String(path).match(/^fight\.(player|enemy)\.(.+)$/);

      if (!match) {
        continue;
      }

      const target = match[1] === "player" ? fight.player : fight.enemy;

      const key = match[2];

      if (!Object.prototype.hasOwnProperty.call(target,key)) {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(config,"value_new")) {
        if (Number.isFinite(valueNew)) {
          target[key] = valueNew;
        }
      } else if (Object.prototype.hasOwnProperty.call(config,"value")) {
        if (Number.isFinite(value)) {
          target[key] = Number(target[key]) + value;
        }
      }
    }
  }
  /* 攻击伤害 */
  const damage = isObject(effect) ? effect["伤害"] : null;
  const value = isObject(damage) ? Number(damage.value) : 0;
  if (Number.isFinite(value) && value !== 0) {
    if (side === 1) {
      fight.enemy.HP = fight.enemy.HP - value;
    } else {
      fight.player.HP = fight.player.HP - value;
    }
  }
  /* 抽卡 */
  const drawCard = isObject(effect) ? effect["抽卡"] : null;
  const drawValue = isObject(drawCard) ? Number(drawCard.value) : 0;
  if (Number.isFinite(drawValue) && drawValue > 0) {
    if (side === 1) {
      drawPlayerCards(drawValue);
      renderPlayerHand(fight);
    } else {
      drawEnemyCards(drawValue);
      renderEnemyHand(fight);
    }
  }
  exposeBattleGlobals(fight);
  /* 将指定卡添加到卡组 */
  const getCards = isObject(effect) ? effect["获取卡"] : null;
  if (isObject(getCards) && side === 1) {
    for (const [cardName,cardConfig] of Object.entries(getCards)) {
      const count = isObject(cardConfig) ? Number(cardConfig.value) : Number(cardConfig);
      const sidetypeText = isObject(cardConfig) ? String(cardConfig.sidetype ?? "").trim() : "";
      const sidetype = sidetypeText === "" ? [] : sidetypeText.split("|").map(function (value) { return value.trim(); }).filter(Boolean);
      if (!Number.isFinite(count) || count <= 0) {
        continue;
      }
      for (let index = 0;index < Math.floor(count);index += 1) {
        fight.playerhand.push(createFightCardEntry(cardName,sidetype));
      }
    }
    window.fightplayerhand = fight.playerhand;
    renderPlayerHand(fight);
    exposeBattleGlobals(fight);
  }
  /* 标记处理 */
  const tagsEffect = isObject(effect) ? effect["标记"] : null;
  if (isObject(tagsEffect)) {
    for (const [tagName,tagConfig] of Object.entries(tagsEffect)) {
      if (!isObject(tagConfig)) continue;
      for (const sideName of ["self","other","all"]) {
        const config = isObject(tagConfig[sideName]) ? tagConfig[sideName] : null;
        if (!config) continue;
        const valueNew = Number(config.value_new);
        const value = Number(config.value);
        if (sideName === "self") {
          if (Object.prototype.hasOwnProperty.call(config,"value_new") && Number.isFinite(valueNew)) {
            const list = getTagListForSide(fight,side);
            const index = findTagIndex(list,tagName);
            if (index === -1) {
              if (valueNew > 0) list.push([String(tagName),Math.floor(valueNew)]);
            } else if (valueNew <= 0) {
              list.splice(index,1);
            } else {
              list[index][1] = Math.floor(valueNew);
            }
            renderFightTags(fight);
          } else if (Number.isFinite(value) && value !== 0) {
            modifyTagCount(fight,side,tagName,value);
          }
        } else if (sideName === "other") {
          if (Object.prototype.hasOwnProperty.call(config,"value_new") && Number.isFinite(valueNew)) {
            const targetSide = 1 - side;
            const list = getTagListForSide(fight,targetSide);
            const index = findTagIndex(list,tagName);
            if (index === -1) {
              if (valueNew > 0) list.push([String(tagName),Math.floor(valueNew)]);
            } else if (valueNew <= 0) {
              list.splice(index,1);
            } else {
              list[index][1] = Math.floor(valueNew);
            }
            renderFightTags(fight);
          } else if (Number.isFinite(value) && value !== 0) {
            modifyTagCount(fight,1 - side,tagName,value);
          }
        } else {
          if (Object.prototype.hasOwnProperty.call(config,"value_new") && Number.isFinite(valueNew)) {
            for (const targetSide of [side,1 - side]) {
              const list = getTagListForSide(fight,targetSide);
              const index = findTagIndex(list,tagName);
              if (index === -1) {
                if (valueNew > 0) list.push([String(tagName),Math.floor(valueNew)]);
              } else if (valueNew <= 0) {
                list.splice(index,1);
              } else {
                list[index][1] = Math.floor(valueNew);
              }
            }
            renderFightTags(fight);
          } else if (Number.isFinite(value) && value !== 0) {
            modifyTagCount(fight,side,tagName,value);
            modifyTagCount(fight,1 - side,tagName,value);
          }
        }
      }
    }
  }

    /* 卡牌选择处理 */
  const cardSelection = isObject(effect) ? effect["卡牌选择"] : null;
  if (isObject(cardSelection)) {
    const selectConfig = parseCardSelection(cardSelection);
    
    if (cardSelection.pick !== null && cardSelection.pick !== undefined) {
      // Need to perform selection
      const selectSide = selectConfig.side === 'self' ? side : (1 - side);
      
      if (selectConfig.pick === 'random') {
        // Random selection
        cardpick = randomSelectCard(fight, selectSide);
      } else if (selectConfig.pick === 'pick') {
        // Manual selection only for player
        if (side === 1) {
          // Wait for manual selection
          await new Promise(function(resolve) {
            setupManualCardSelection(fight, selectSide, function(picked) {
              cardpick = picked;
              resolve();
            });
          });
        } else {
          // Enemy uses random
          cardpick = randomSelectCard(fight, selectSide);
        }
      }
    }
    
    // Process cardpick based on mode
    if (cardpick && Array.isArray(cardpick) && cardpick.length === 2) {
      const pickedSide = Number(cardpick[0]);
      const pickedIndex = Number(cardpick[1]);
      const hand = pickedSide === 1 ? fight.playerhand : fight.enemyhand;
      
      if (hand && hand[pickedIndex]) {
        const pickedCardEntry = hand[pickedIndex];
        const pickedCard = parseFightCard(pickedCardEntry);
        const pickedCardName = pickedCard.name;
        const pickedSidetype = pickedCard.sidetype;
        const pickedValuechange = pickedCard.valuechange;
        const mode = selectConfig.mode;
        const newcardside = String(selectConfig.newcardside || 'self').trim();
        
        // Determine target hand for new cards (for 'get' and 'copy' modes)
        const targetSide = newcardside === 'other' ? (1 - Number(side)) : Number(side);
        const targetHand = targetSide === 1 ? fight.playerhand : fight.enemyhand;
        
        if (mode === 'get') {
          // Remove selected card, add new card to target side
          hand.splice(pickedIndex, 1);
          for (let i = 0; i < selectConfig.value; i += 1) {
            const newCardName = String(selectConfig.newcard || pickedCardName).trim();
            const newSidetype = applySidetypeChange(pickedSidetype, selectConfig.sidetypechange);
            targetHand.push(createFightCardEntry(newCardName,newSidetype,pickedValuechange));
          }
        } else if (mode === 'remove') {
          // Move to battlefield without triggering effects
          const cardName = pickedCardName;
          const newSidetype = applySidetypeChange(pickedSidetype, selectConfig.sidetypechange);
          hand.splice(pickedIndex, 1);
          movetosite(fight,cardName,pickedSide,newSidetype,1,pickedValuechange);
        } else if (mode === 'delete') {
          // Delete card without effects
          hand.splice(pickedIndex, 1);
        } else if (mode === 'copy') {
          // Copy to target side
          for (let i = 0; i < selectConfig.value; i += 1) {
            const newSidetype = applySidetypeChange(pickedSidetype, selectConfig.sidetypechange);
            targetHand.push(createFightCardEntry(pickedCardName,newSidetype,pickedValuechange));
          }
        }
        
        // Render both hands if they changed
        if (pickedSide === 1) {
          renderPlayerHand(fight);
        } else {
          renderEnemyHand(fight);
        }
        if (targetSide !== pickedSide) {
          if (targetSide === 1) {
            renderPlayerHand(fight);
          } else {
            renderEnemyHand(fight);
          }
        }
        
        cardpick = null;
      }
    }
  }
  await new Promise(function (resolve) { setTimeout(resolve,1000); });
  fight.carduseLocked = false;
  setPlayerHandDisabled(fight,false);
  renderAbilityButton(fight,1);
  renderAbilityButton(fight,0);
  bindPlayerHandActions(fight);
  return {side: side,type: type,effect: effect};
}

  async function carduse(side,type,effect,tag,cardName,fight,sidetype = [],register = -1,startStep = 0,valuechange = {}) {
  let ignore = "";
  fight = fight || window.fight;

  if (!fight || fight.ended) {
    return null;
  }

  let ignoreValue = ignore;
  if ((ignoreValue === null || ignoreValue === undefined || String(ignoreValue).trim() === "") && cardName) {
    const card = getFightCardData(cardName);
    ignoreValue = card ? card["ignore"] : "";
  }
  const ignoreSteps = new Set(String(ignoreValue ?? "").split(";").map(function (value) { return value.trim(); }).filter(Boolean));

  let effectList = [];
  if (cardName) {
    const cardData = getFightCardData(cardName);
    if (isObject(cardData)) {
      if (Object.prototype.hasOwnProperty.call(cardData,"效果")) {
        effectList.push(cardData["效果"]);
      }
      let effectIndex = 2;
      while (Object.prototype.hasOwnProperty.call(cardData,`效果_${effectIndex}`)) {
        effectList.push(cardData[`效果_${effectIndex}`]);
        effectIndex += 1;
      }
    }
  }
  if (effectList.length === 0) {
    effectList.push(effect);
  }

  fight.carduseLocked = true;
  setPlayerHandDisabled(fight, true);

  let lastCardEffectResult = null;
  let cardMoved = false;

  const judgementSteps = [startsidecounter,startsideequip,startsidetrait,startsidetag,nsidetag,nsidetrait,nsideequip,nsidecounter];
  let initialRegister = typeof register === "number" ? register : -1;

  for (let effectIndex = 0;effectIndex < effectList.length;effectIndex += 1) {
    const currentEffect = effectList[effectIndex];
    let loopCount = 1;

    if (isObject(currentEffect) && isObject(currentEffect.loop)) {
      const loopConfig = currentEffect.loop;
      if (Object.prototype.hasOwnProperty.call(loopConfig,"value_js")) {
        const funcName = String(loopConfig.value_js || "");
        const inputStr = String(loopConfig.input || "");
        const params = inputStr === "" ? [] : inputStr.split(";").map(function (value) { return value.trim(); });
        if (typeof window[funcName] === "function") {
          try {
            const result = await window[funcName](...params,sidetype,fight);
            loopCount = Math.max(1,toInt(result,1));
          } catch (err) {
            console.error(`Error calling ${funcName}:`,err);
            loopCount = 1;
          }
        }
      } else if (Number.isFinite(Number(loopConfig.value))) {
        loopCount = Math.max(1,toInt(loopConfig.value,1));
      }
    }

    for (let iter = 0;iter < loopCount;iter += 1) {
      if (!fight || fight.ended) break;

      let currentRegister = initialRegister;
      let result = {
        side:Number(side) === 1 ? 1 : 0,
        type:type,
        effect:currentEffect,
        tag:tag,
        sidetype:sidetype,
        cardName:cardName,
        valuechange:valuechange
      };

      for (let i = startStep;i < judgementSteps.length;i += 1) {
        const step = judgementSteps[i];
        result = await runJudgementStep(step,result,fight,currentRegister,i);

        if (!result) {
          break;
        }

        result.effect = prepareJudgementEffect(result.effect);

        if (result.effect === null) {
          break;
        }

        result.register = -1;
      }

      if (!result || result.effect === null) {
        continue;
      }

      const isLastLoop = iter === loopCount - 1;
      if (result && cardName && isLastLoop && !cardMoved) {
        if (result.type === "装备卡") {
          const equip = result.side === 1 ? fight.fightplayerequip : fight.fightenemyequip;
          equip.push(createFightCardEntry(cardName,result.sidetype,valuechange));
          renderFightEquip(fight,result.side);
        } else {
          movetosite(fight,cardName,result.side,result.sidetype,1,valuechange);
        }
        cardMoved = true;
      }

      exposeBattleGlobals(fight);

      const cardeffectResult = await cardeffect(result.side,result.type,result.effect,fight);
      lastCardEffectResult = cardeffectResult;
    }
  }

  fight.carduseLocked = false;
  setPlayerHandDisabled(fight,false);
  renderAbilityButton(fight,1);
  renderAbilityButton(fight,0);
  bindPlayerHandActions(fight);

  return lastCardEffectResult;
}

  /*
    fightmain 中负责绑定
    玩家手牌点击行为。

    鼠标点击 = 使用卡牌。
  */
  function bindPlayerHandActions(fight) {
  const slots = Array.from(document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));
  slots.forEach(function (button) {
    if (fight.carduseLocked) {
      button.disabled = true;
      button.onclick = null;
      return;
    }
    const index = Number(button.dataset.index);
    const cardEntry = fight.playerhand[index];
    const parsedCard = parseFightCard(cardEntry);
    const cardName = parsedCard.name;
    const card = getFightCardData(cardName);
    const effect = card ? card["效果"] : null;
    const mpCost = card ? Number(card["MP"] ?? 0) : 0;
    const mpDisabled = Number.isFinite(mpCost) && mpCost > 0 && fight.player.MP < mpCost;
    button.disabled = button.classList.contains("is-empty") || mpDisabled;
    button.onclick = async function () {
      if (!window.fight || window.fight !== fight || fight.ended || fight.carduseLocked) {
        return;
      }
      const index = Number(button.dataset.index);
      const cardEntry = fight.playerhand[index];
      const parsedCard = parseFightCard(cardEntry);
      const cardName = parsedCard.name;
      const sidetype = parsedCard.sidetype;
      const valuechange = parsedCard.valuechange;
      if (!cardName) {
        return;
      }
      const card = getFightCardData(cardName);
      const type = card ? card["类型"] : null;
      const effect = card ? card["效果"] : null;
      const tagValue = card ? String(card["tag"] ?? "").trim() : "";
      const tag = tagValue;
      const mpCost = card ? Number(card["MP"] ?? 0) : 0;
      if (Number.isFinite(mpCost) && mpCost > 0 && fight.player.MP < mpCost) {
        setPlayerHandDisabled(fight,false);
        return;
      }
      fight.playerhand.splice(index,1);
      renderPlayerHand(fight);
      bindPlayerHandActions(fight);
      exposeBattleGlobals(fight);
      if (Number.isFinite(mpCost) && mpCost > 0) {
        fight.player.MP -= mpCost;
      }
      const res = await carduse(1,type,effect,tag,cardName,fight,sidetype,-1,0,valuechange);
      const outcome = getFightOutcome(fight);
      if (outcome === "win" || outcome === "lost") {
        finishFight(fight,outcome);
      }
    };
  });
}
async function fightenemyactioncard(fight) {
  for (let index = 0; index < fight.enemyhand.length; index += 1) {
    const cardEntry = fight.enemyhand[index];
    const parsedCard = parseFightCard(cardEntry);
    const cardName = parsedCard.name;
    const sidetype = parsedCard.sidetype;
    if (!cardName) continue;
    const card = getFightCardData(cardName);
    if (!card) continue;
    const type = card["类型"];
    const effect = card["效果"];
    const tagValue = card ? String(card["tag"] ?? "").trim() : "";
    const tag = tagValue === "" ? "item" : tagValue;
    let shouldUse = false;
    if (type === "基本卡") {
      shouldUse = true;
    } else if (type === "道具卡") {
      shouldUse = true;
    } else if (type === "装备卡") {
      shouldUse = true;
    }
    if (!shouldUse) continue;
    fight.enemyhand.splice(index, 1);
    index -= 1;
    renderEnemyHand(fight);
    exposeBattleGlobals(fight);
    await carduse(0, type, effect, tag, cardName, fight, sidetype);
    await new Promise(function (resolve) { setTimeout(resolve, 1000); });
  }
}
  async function fightenemyaction() {
     const fight = window.fight;
     const turnStartResult = await carduse(0,"event","event","turnstart",null,fight);
     if (turnStartResult === "win" || turnStartResult === "lost") {
       return turnStartResult;
     }
     // 敌方能力：查找第一个可用（remaining === 0）的能力并使用
     if (Array.isArray(fight.enemyability) && fight.enemyability.length > 0) {
       for (let i = 0; i < fight.enemyability.length; i += 1) {
         const entry = fight.enemyability[i];
         const name = String(entry[0] ?? "").trim();
         const total = toInt(entry[1], 0);
         const remaining = Number(entry[2] ?? 0);
         if (name && remaining === 0) {
           const abilityCard = getFightCardData(name);
           if (abilityCard) {
             const mpCost = Number(abilityCard["MP"] ?? 0);
             if (!Number.isFinite(mpCost) || mpCost <= 0 || fight.enemy.MP >= mpCost) {
               if (Number.isFinite(mpCost) && mpCost > 0) {
                 fight.enemy.MP -= mpCost;
               }
               const effect = abilityCard ? abilityCard["效果"] : null;
               const type = abilityCard ? abilityCard["类型"] : null;
               const tagValue = abilityCard ? String(abilityCard["tag"] ?? "").trim() : "";
               await carduse(0,type,effect,tagValue,name,fight,["ability"]);
               // set remaining cooldown to total
               entry[2] = Math.max(0, total);
               await new Promise(function (resolve) { setTimeout(resolve, 1000); });
               break; // 使用一次后退出循环（按原逻辑只用一次）
             }
           }
         }
       }
     }
     await fightenemyactioncard(fight);
     if (fight.enemy.MP < fight.enemy.MAXMP) {
     fight.enemy.MP = fight.enemy.MAXMP;
     }
     const turnEndResult = await carduse(0,"event","event","turnend",null,fight);
     moveSiteCardsToGrave(fight);
     // 敌方：所有能力剩余冷却减 1（如果有）
     if (Array.isArray(fight.enemyability) && fight.enemyability.length > 0) {
       for (let i = 0; i < fight.enemyability.length; i += 1) {
         const entry = fight.enemyability[i];
         if (Number.isFinite(entry[2]) && entry[2] > 0) {
           entry[2] = Math.max(0, entry[2] - 1);
         }
       }
     }

     if (turnEndResult === "win" || turnEndResult === "lost") {
       return turnEndResult;
     }
      drawEnemyCards(2);
      renderEnemyHand(fight);
      const moreturnIdx = findMorereturnTag(fight, 1);
      if (moreturnIdx !== -1) {
        modifyTagCount(fight, 1, "额外回合", -1);
        fight.turn += 1;
        const turnStartResult = await carduse(1,"event","event","turnstart",null,fight);
        if (turnStartResult === "win" || turnStartResult === "lost") {
          return turnStartResult;
        }
        exposeBattleGlobals(fight);
        return "moreturn";
      }

      return "end";
   }

  async function fightmain() {
    const fight = window.fight;

    if (!fight || fight.ended) {
      return;
    }
    const turnStartResult = await carduse(1,"event","event","turnstart",null,fight);

    // 在玩家回合开始的 turnstart 事件完成后进行胜负判定（按你的要求）
    const outcomeAfterTurnstart = getFightOutcome(fight);
    if (outcomeAfterTurnstart === "win" || outcomeAfterTurnstart === "lost") {
      return finishFight(fight,outcomeAfterTurnstart);
    }

    if (turnStartResult === "win" || turnStartResult === "lost") {
      return turnStartResult;
    }
    /* 发卡
      第1回合：3张
      之后：2张
    */
    if(fight.turn === 1){
    drawPlayerCards(3);
    renderPlayerHand(fight);
    }

    /* 绑定玩家手牌点击。鼠标点击即视为使用。 */
    bindPlayerHandActions(fight);

    /* 敌人牌  */
    if(fight.turn === 1){
    drawEnemyCards(3);
    renderEnemyHand(fight);
    }
    /*
      显示场上卡牌 */
    renderFightSite(fight);

    /* 更新双方 HP / MP 以及牌库 / 坟场数量。*/
    exposeBattleGlobals(fight);

    /* 玩家结束回合 */
    const endTurnButton = document.querySelector(".game-area .end-turn");

    if (endTurnButton) {
      endTurnButton.disabled = false;

      
          endTurnButton.onclick = async function () {
  if (!window.fight || window.fight !== fight || fight.ended) {
    return;
  }
  endTurnButton.disabled = true;
  const turnEndResult = await carduse(1,"event","event","turnend",null,fight);
  moveSiteCardsToGrave(fight);
  renderAbilityButton(fight,1);
  renderAbilityButton(fight,0);
  // 玩家能力：所有能力的剩余冷却减 1
  if (Array.isArray(fight.playerability) && fight.playerability.length > 0) {
    for (let i = 0; i < fight.playerability.length; i += 1) {
      const entry = fight.playerability[i];
      if (Number.isFinite(entry[2]) && entry[2] > 0) {
        entry[2] = Math.max(0, entry[2] - 1);
      }
    }
  }
  if (fight.player.MP < fight.player.MAXMP) {
    fight.player.MP = fight.player.MAXMP;
  }
  drawPlayerCards(2);
  renderPlayerHand(fight);
  if (turnEndResult === "win" || turnEndResult === "lost") {
    return;
  }
   const moreturnIdx = findMorereturnTag(fight, 1);
   if (moreturnIdx !== -1) {
     modifyTagCount(fight, 1, "额外回合", -1);
     fight.turn += 1;
     const outcome = await fightmain();
     if (outcome === "win" || outcome === "lost") {
       finishFight(fight, outcome);
     }
     return;
   }
   const result = await fightenemyaction();
   if (result !== "end" && result !== "moreturn") {
     return;
   }
   if (result === "moreturn") {
     recycleGraves(fight);
     bindPlayerHandActions(fight);
     return;
   }
  
  recycleGraves(fight);
  fight.turn += 1;
  const outcome = await fightmain();
  if (outcome === "win" || outcome === "lost") {
    finishFight(fight,outcome);
  }
};
    }

    /*
      战斗结束判断。

      玩家 HP > 0
      且敌人 HP <= 0：
      胜利
    */
    if (fight.player.HP > 0 && fight.enemy.HP <= 0) {
      return "win";
    }

    /*
      玩家 HP <= 0：
      失败
    */
    if (fight.player.HP <= 0) {
      return "lost";
    }

    /*
      其他情况故意不 return。
    */
  }

  function fightAPI(enemyId) {
    cardpick = null;
    const fight = createBattleState(enemyId);
    
    /* 处理背包和装备 */
       window.fightplayerbag = adventurebagitem;
       fight.fightplayerbag = window.fightplayerbag;
       window.fightplayerequip = window.adventureequip;
       fight.fightplayerequip = window.fightplayerequip;

 // 敌人背包与装备置空（战斗开始前清理）
 window.fightenemybag = [];
 window.fightenemyequip = [];

 // 渲染战斗界面相关 UI（标签与背包）
 renderFightTags(window.currentFight);
 renderFightBags();
    window.fight = fight;

    fight.turn = 1;
    fight.ended = false;

    exposeBattleGlobals(fight);
    renderAbilityButton(fight, 1);
    renderAbilityButton(fight, 0);
    return new Promise(
      function (resolve) {
        fight.resolve = resolve;

        fightmain().then(function (outcome) {
          if (outcome === "win" || outcome === "lost") {
            finishFight(fight,outcome);
          }
        });
      }
    );
  }

  /*
    对外暴露。
  */
window.fightAPI = fightAPI;
window.fightmain = fightmain;
window.fightenemyaction = fightenemyaction;
window.fightenemyactioncard = fightenemyactioncard;
window.movetosite = movetosite;
window.carduse = carduse;
window.cardeffect = cardeffect;
window.modifyTagCount = modifyTagCount;
window.getTagCount = getTagCount;
window.parseFightCard = parseFightCard;
window.createFightCardEntry = createFightCardEntry;
window.getFightCardData = getFightCardData;
window.effectruleAPI = effectruleAPI;
})();