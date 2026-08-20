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
    const separatorIndex = text.indexOf(";");
    if (separatorIndex === -1) {
      return {
        name: text,
        sidetype: []
      };
    }

    const name = text.slice(0, separatorIndex);
    const sidetypeText = text.slice(separatorIndex + 1);

    return {
      name: name,
      sidetype: sidetypeText === "" ? [] : sidetypeText.split("|").map(function (value) { return value.trim(); }).filter(Boolean)
    };
  }

  function createFightCardEntry(cardName,sidetype) {
    const name = String(cardName ?? "");
    const types = Array.isArray(sidetype) ? sidetype.filter(Boolean) : [];
    return types.length > 0 ? `${name};${types.join("|")}` : name;
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

    const hpSource = saved
      ? (
          saved.adventurehp ??
          saved.HP
        )
      : (
          stats.HP ??
          window.adventurehp ??
          window.HP
        );

    const mpSource = saved
      ? (
          saved.adventuremp ??
          saved.MP
        )
      : (
          stats.MP ??
          window.adventuremp ??
          window.MP
        );

    const hp =
      Number.isFinite(Number(hpSource))
        ? Math.floor(Number(hpSource))
        : 0;

    const maxHPSource = saved
      ? (
          saved.maxHP ??
          hp
        )
      : (
          stats.maxHP ??
          window.maxHP ??
          hp
        );

    const maxMPSource = saved
      ? (
          saved.maxMP ??
          mpSource
        )
      : (
          stats.maxMP ??
          window.maxMP ??
          mpSource
        );

    const maxHP =
      Number.isFinite(Number(maxHPSource)) &&
      Number(maxHPSource) > 0
        ? Math.floor(Number(maxHPSource))
        : hp;

    const mp =
      Number.isFinite(Number(mpSource))
        ? Math.floor(Number(mpSource))
        : 0;

    const maxMP =
      Number.isFinite(Number(maxMPSource)) &&
      Number(maxMPSource) > 0
        ? Math.floor(Number(maxMPSource))
        : mp;

    return {
      HP: hp,
      MAXHP: maxHP,
      MP: mp,
      MAXMP: maxMP
    };
  }

  function getPlayerCardImage(cardName) {
    const database =
      window.cardDatabase;

    const card =
      isObject(database)
        ? database[cardName]
        : null;

    return card && card["图片"];
  }

  function getEnemyCardImage(cardName) {
    const database =
      window.adventureCardsDatabase;

    const card =
      isObject(database)
        ? database[cardName]
        : null;

    return card && `images/adventure/${card.ID}.png`;
  }

  function renderSlots(
    slotSelector,
    cards,
    imageResolver,
    labelPrefix
  ) {
    const slots =
      Array.from(
        document.querySelectorAll(
          slotSelector
        )
      );

    slots.forEach(
      function (button, index) {
        const cardEntry = cards[index];
        const cardName = parseFightCard(cardEntry).name;

        const img =
          button.querySelector("img");

        button.dataset.index = String(index);

        if (cardName) {
          button.classList.remove(
            "is-empty"
          );

          button.disabled = false;

          button.dataset.card =
            cardName;

          button.setAttribute(
            "aria-label",
            cardName
          );

          if (img) {
            img.src =
              imageResolver(cardName);

            img.alt =
              cardName;
          }
        } else {
          button.classList.add(
            "is-empty"
          );

          button.disabled = true;

          button.removeAttribute(
            "data-card"
          );

          button.setAttribute(
            "aria-label",
            `${labelPrefix}空卡位${index + 1}`
          );

            img.src = "null.png";
            img.alt = "empty card";
        }
      }
    );
  }

  function updateBattleBars() {
    if (
      typeof window.thCardSyncBattleBars ===
      "function"
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

    // 新增：在全局也暴露标签数组（用于调试/外部访问）
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
    const playerDeck =
      document.getElementById(
        "fightplayerdecknum"
      );

    const playerGrave =
      document.getElementById(
        "fightplayergravenum"
      );

    const enemyDeck =
      document.getElementById(
        "fightenemydecknum"
      );

    const enemyGrave =
      document.getElementById(
        "fightenemygravenum"
      );

    if (playerDeck) {
      playerDeck.textContent =
        String(fight.playercards.length);
    }

    if (playerGrave) {
      playerGrave.textContent =
        String(fight.fightplayergrave.length);
    }

    if (enemyDeck) {
      enemyDeck.textContent =
        String(fight.enemycards.length);
    }

    if (enemyGrave) {
      enemyGrave.textContent =
        String(fight.fightenemygrave.length);
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
function renderFightEquip(
    fight,
    owner
  ) {
    const box = document.getElementById(owner === 1 ? "fightplayerequip" : "fightenemyequip");

    if (!box) {
      return;
    }

    const cards =
      owner === 1
        ? fight.fightplayerequip
        : fight.fightenemyequip;

    const imageResolver =
      owner === 1
        ? getPlayerCardImage
        : getEnemyCardImage;

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

  // ---------- 新增：tags 数据缓存与读取 ----------
  let tagsDatabase = null;
  async function loadTagsDatabase() {
    if (tagsDatabase !== null) return tagsDatabase;
    try {
      const resp = await fetch("tags.json", { cache: "no-store" });
      if (!resp.ok) {
        tagsDatabase = {};
        return tagsDatabase;
      }
      tagsDatabase = await resp.json();
    } catch (e) {
      tagsDatabase = {};
    }
    return tagsDatabase;
  }
  // ---------- end tags loader ----------

  /*
    将卡牌移动到场上。

    owner:
      1 = 玩家
      0 = 敌人
  */
  function movetosite(fight,cardName,owner,sidetype,loops) {
    if(loops != 1) return false;
    if (!fight || !cardName) {
      return false;
    }
  if (sidetype.includes("ability")) {
    return false;
  }
    owner = Number(owner) === 1 ? 1 : 0;

    /*
      卡牌加入场上数组末尾。
    */
    fight.fightsitecards.push(createFightCardEntry(cardName,sidetype));

    /*
      相同位置保存所有者。
    */
    fight.fightsitecardsow.push(owner);

    renderFightSite(fight);

    return true;
  }

  /*
    将场上所有卡牌移动到
    原持有者的坟场。
  */
  function moveSiteCardsToGrave(fight) {
    for (let index = 0;index < fight.fightsitecards.length;index += 1) {
      const cardEntry = fight.fightsitecards[index];

      const owner = fight.fightsitecardsow[index];

      if (fightCardHasSideType(cardEntry,"temp")) {
        continue;
      }

      if (owner === 1) {
        fight.fightplayergrave.push(cardEntry);
      } else {
        fight.fightenemygrave.push(cardEntry);
      }
    }

    /*
      清空场上两组数组。
    */
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
  function recycleGraveIfDeckEmpty(
    fight,
    owner
  ) {
    const deck =
      owner === 1
        ? fight.playercards
        : fight.enemycards;

    const grave =
      owner === 1
        ? fight.fightplayergrave
        : fight.fightenemygrave;

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
  function recycleGraves(
    fight
  ) {
    recycleGraveIfDeckEmpty(
      fight,
      1
    );

    recycleGraveIfDeckEmpty(
      fight,
      0
    );

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
      for (
        const [
          cardName,
          count
        ]
        of Object.entries(source)
      ) {
        if (
          cardName === "type" ||
          cardName === "trpe" ||
          cardName === "maxnumber"
        ) {
          continue;
        }

        const amount =
          Math.max(
            0,
            toInt(count, 0)
          );

        for (
          let index = 0;
          index < amount;
          index += 1
        ) {
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
      fight.playerhand.push(cardEntry);
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
      fight.enemyhand.push(cardEntry);
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
    const mpCost = isObject(effect) ? Number(effect["MP"] ?? 0) : 0;

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

        await carduse(1,type,effect,tagValue,null,fight,["ability"]);

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
      if (!isObject(damage) || damage.value === null || damage.value === undefined || !Number.isFinite(Number(damage.value)) || Number(damage.value) === 0) {
        delete nextEffect["伤害"];
      }
    }

    return Object.keys(nextEffect).length > 0 ? nextEffect : null;
  }

    async function runJudgementStep(step,result,fight,register,stepIndex) {
    const effect = prepareJudgementEffect(result.effect);
    if (effect === null) {
      // ensure returned register fixed to -1
      const ret = {side:result.side,type:result.type,effect:effect,tag:result.tag,sidetype:result.sidetype,register:-1};
      return ret;
    }

    // pass current register to step; step may be async and may trigger nested calls
    const stepResult = await step(result.side,result.type,effect,result.tag,result.sidetype,fight,typeof register === "number" ? register : -1,typeof stepIndex === "number" ? stepIndex:0);

    // ensure register fixed to -1 on return per requirement
    if (stepResult && typeof stepResult === "object") {
      stepResult.register = -1;
    }

    return stepResult;
  }

  function equipRuleMatch(rule,tag) {
    const rules = String(rule ?? "").split(";").map(function (value) { return value.trim(); }).filter(Boolean);
    const tags = String(tag ?? "").split(";").map(function (value) { return value.trim(); }).filter(Boolean);
    return rules.some(function (value) { return tags.includes(value); });
  }

  function sideruleMatches(siderule,incomingSide,equipOwnerSide) {
    const rule = String(siderule ?? "").trim();
    if (!rule || rule === "") return true;
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
        // ensure integer
        list[idx][1] = Math.floor(list[idx][1]);
      }
    }
    // 更新 UI
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
  async function startsidecounter(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function startsideequip(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    // side: incoming effect side
    // iterate equips that are on the same side as the incoming side (owner side)
    const equips = side === 1 ? fight.fightplayerequip : fight.fightenemyequip;
    const ownerSide = side === 1 ? 1 : 0;

    // If register provided, per你的语义在进入此函数时 register 应该 +1 并从该位置开始检查（跳过触发源）
    const startIndex = (typeof register === "number" && register >= 0) ? (register + 1) : 0;

    for (
      let index = startIndex;
      index < equips.length;
      index += 1
    ) {
      const cardName = equips[index];
      const card = getFightCardData(cardName);
      const cardEffect = card ? card["效果"] : null;
      const cardTagVal = card ? String(card["tag"] ?? "").trim() : "";
      const cardSiderule = card ? String(card["siderule"] ?? "").trim() : "";

      if (
        !isObject(cardEffect) ||
        !equipRuleMatch(cardEffect["rule"],tag)
      ) {
        continue;
      }

      // check siderule against incoming side and equip owner side
      if (!sideruleMatches(cardSiderule, side, ownerSide)) {
        continue;
      }

      // 被动伤害触发（装备中恰好含 "被动伤害" 字段）：
      if (Object.prototype.hasOwnProperty.call(cardEffect,"被动伤害")) {
        const passive = cardEffect["被动伤害"];
        if (isObject(passive) && Number.isFinite(Number(passive.value)) && Number(passive.value) !== 0) {
          // build effect object for nested call: treat like a damage effect
          const nestedEffect = { "伤害": { value: Number(passive.value), type: passive.type } };
          const nestedTag = cardTagVal === "" ? "equip" : cardTagVal;
          // register passed is current equip index (触发源的位置)
          // startStepIndex: use stepIndex to begin nested judgement from this same function position
          await carduse(ownerSide, "装备卡", nestedEffect, nestedTag, null, fight, index, stepIndex);
        }
        continue;
      }

      // 伤害修改类（严格匹配 "伤害修改"）: 修改当前 effect 的伤害值（可以增减）
      if (Object.prototype.hasOwnProperty.call(cardEffect,"伤害修改")) {
        const modifier = cardEffect["伤害修改"];
        if (isObject(modifier) && isObject(effect) && isObject(effect["伤害"])) {
          const modValue = Number(modifier.value);
          const damageValue = Number(effect["伤害"].value);
          if (Number.isFinite(modValue) && Number.isFinite(damageValue)) {
            // 新语义：正数降低伤害，负数增加伤害 => newDamage = damage - modValue
            const newDamage = Math.max(0, Math.floor(damageValue - modValue));
            effect = {...effect};
            effect["伤害"] = {...effect["伤害"], value: newDamage};
            // continue to next equip so multiple modifiers accumulate
            continue;
          }
        }
      }

      // 如果装备不是被动伤害或伤害修改（例如覆盖性效果），保留原逻辑：覆盖 effect 并停止（与原实现保持兼容）
      if (isObject(cardEffect) && !Object.prototype.hasOwnProperty.call(cardEffect,"伤害修改") && !Object.prototype.hasOwnProperty.call(cardEffect,"被动伤害")) {
        effect = cardEffect;
        // match original behavior: stop at first overriding equip
        break;
      }
    }

    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function startsidetrait(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  // ---------- 修改：startsidetag 实现（根据标签触发规则修改 effect） ----------
  async function startsidetag(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    // side: incoming effect side; here we check tags that are on the same side as incoming side (owner side)
    const ownerSide = side === 1 ? 1 : 0;
    const tagList = getTagListForSide(fight, ownerSide);
    if (!tagList || tagList.length === 0) {
      return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
    }

    const tagDefs = await loadTagsDatabase();

    // iterate tag groups
    for (let i = 0; i < tagList.length; i += 1) {
      const entry = tagList[i];
      const tagName = String(entry[0] ?? "");
      const tagCount = Number(entry[1] ?? 0);
      if (!tagName || tagCount <= 0) continue;

      const def = tagDefs[tagName];
      if (!isObject(def)) continue;
      // rule / siderule check
      if (!equipRuleMatch(def.rule, tag)) continue;
      if (!sideruleMatches(def.siderule, side, ownerSide)) continue;

      // apply damage modification if defined
      const defEffect = def["效果"] || {};
      if (isObject(defEffect) && isObject(defEffect["伤害修改"]) && isObject(effect) && isObject(effect["伤害"])) {
        const dmgMod = defEffect["伤害修改"];
        // currently support mode "onefull"
        const mode = String(dmgMod.mode ?? "").trim();
        let finalValue = 0;
        if (mode === "onefull") {
          finalValue = Number(dmgMod.value_mode || 0) * Number(tagCount || 0);
        } else {
          finalValue = Number(dmgMod.value_mode || 0);
        }
        // consider type matching if provided
        const reqType = String(dmgMod.type ?? "").trim();
        const incomingType = String(effect["伤害"].type ?? "").trim();
        if (!reqType || reqType === incomingType) {
          // here we interpret finalValue as additive to damage:
          // positive finalValue -> 增伤; negative finalValue -> 减伤
          const cur = Number(effect["伤害"].value);
          if (Number.isFinite(cur) && Number.isFinite(finalValue)) {
            effect = {...effect};
            effect["伤害"] = {...effect["伤害"], value: Math.max(0, Math.floor(cur + finalValue))};
          }
        }
      }

      // if tag's effect contains 标记 删除规则 -> apply deletion(s)
      if (isObject(defEffect) && isObject(defEffect["标记"])) {
        for (const [tagKey, tagCfg] of Object.entries(defEffect["标记"])) {
          const deleteCount = isObject(tagCfg) ? toInt(tagCfg.delete ?? 0, 0) : toInt(tagCfg ?? 0, 0);
          const sideProp = isObject(tagCfg) ? String(tagCfg.side ?? "") : "";
          // sideProp 'self' -> applies to the ownerSide; otherwise apply to other side
          const targetSide = sideProp === "self" ? ownerSide : (1 - ownerSide);
          if (deleteCount > 0) {
            modifyTagCount(fight, targetSide, tagKey, -Math.abs(deleteCount));
          }
        }
      }
    }

    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }
  // ---------- end startsidetag ----------

  async function nsidetag(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    // nsidetag: check tags on the opposite side (owner is opposite of incoming side)
    const ownerSide = side === 1 ? 0 : 1;
    const tagList = getTagListForSide(fight, ownerSide);
    if (!tagList || tagList.length === 0) {
      return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
    }

    const tagDefs = await loadTagsDatabase();

    for (let i = 0; i < tagList.length; i += 1) {
      const entry = tagList[i];
      const tagName = String(entry[0] ?? "");
      const tagCount = Number(entry[1] ?? 0);
      if (!tagName || tagCount <= 0) continue;

      const def = tagDefs[tagName];
      if (!isObject(def)) continue;
      // rule / siderule check (note: equip owner side is ownerSide)
      if (!equipRuleMatch(def.rule, tag)) continue;
      if (!sideruleMatches(def.siderule, side, ownerSide)) continue;

      const defEffect = def["效果"] || {};
      if (isObject(defEffect) && isObject(defEffect["伤害修改"]) && isObject(effect) && isObject(effect["伤害"])) {
        const dmgMod = defEffect["伤害修改"];
        const mode = String(dmgMod.mode ?? "").trim();
        let finalValue = 0;
        if (mode === "onefull") {
          finalValue = Number(dmgMod.value_mode || 0) * Number(tagCount || 0);
        } else {
          finalValue = Number(dmgMod.value_mode || 0);
        }
        const reqType = String(dmgMod.type ?? "").trim();
        const incomingType = String(effect["伤害"].type ?? "").trim();
        if (!reqType || reqType === incomingType) {
          const cur = Number(effect["伤害"].value);
          if (Number.isFinite(cur) && Number.isFinite(finalValue)) {
            // finalValue is additive: positive -> add, negative -> subtract
            effect = {...effect};
            effect["伤害"] = {...effect["伤害"], value: Math.max(0, Math.floor(cur + finalValue))};
          }
        }
      }

      // process deletion rules in tag definition
      if (isObject(defEffect) && isObject(defEffect["标记"])) {
        for (const [tagKey, tagCfg] of Object.entries(defEffect["标记"])) {
          const deleteCount = isObject(tagCfg) ? toInt(tagCfg.delete ?? 0, 0) : toInt(tagCfg ?? 0, 0);
          const sideProp = isObject(tagCfg) ? String(tagCfg.side ?? "") : "";
          // sideProp 'self' -> applies to the ownerSide; otherwise apply to other side
          const targetSide = sideProp === "self" ? ownerSide : (1 - ownerSide);
          if (deleteCount > 0) {
            modifyTagCount(fight, targetSide, tagKey, -Math.abs(deleteCount));
          }
        }
      }
    }

    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }
  // ---------- end nsidetag ----------

  async function nsidetrait(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

 async function nsideequip(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    // nsideequip: check equips on the opposite side (owner side is opposite)
    const equips = side === 1 ? fight.fightenemyequip : fight.fightplayerequip;
    const ownerSide = side === 1 ? 0 : 1;

    // 对方装备始终从 0 开始逐一检测（register 表示来源方位置，不作为对方起点）
    for (
      let index = 0;
      index < equips.length;
      index += 1
    ) {
      const card = getFightCardData(equips[index]);
      const cardEffect = card ? card["效果"] : null;
      const cardTagVal = card ? String(card["tag"] ?? "").trim() : "";
      const cardSiderule = card ? String(card["siderule"] ?? "").trim() : "";

      if (
        !isObject(cardEffect) ||
        !equipRuleMatch(cardEffect["rule"],tag)
      ) {
        continue;
      }

      // siderule check: the equip's siderule determines whether it triggers for this incoming side
      if (!sideruleMatches(cardSiderule, side, ownerSide)) {
        continue;
      }

      // 严格匹配 "伤害修改"
      if (!Object.prototype.hasOwnProperty.call(cardEffect,"伤害修改")) {
        continue;
      }

      const modifier = cardEffect["伤害修改"];
      const damage = isObject(effect) ? effect["伤害"] : null;

      if (!isObject(modifier) || !isObject(damage)) {
        continue;
      }

      const modValue = Number(modifier.value);
      const damageValue = Number(damage.value);

      if (
        Number.isFinite(modValue) &&
        Number.isFinite(damageValue)
      ) {
        // 新语义：正数降低伤害，负数增加伤害 => newDamage = damage - modValue
        effect = {...effect};
        effect["伤害"] = {...damage, value: Math.max(0, Math.floor(damageValue - modValue))};
        // if damage reduced to 0, we can stop early as no further effects matter
        const newDamage = effect && isObject(effect["伤害"]) ? Number(effect["伤害"].value) : 0;
        if (newDamage <= 0) {
          break;
        }
        // otherwise continue to next equip (so modifications accumulate)
      }
    }

    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  async function nsidecounter(side,type,effect,tag,sidetype,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,sidetype:sidetype,register:-1};
  }

  function setPlayerHandDisabled(fight,disabled) {
    const slots = Array.from(document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));

    slots.forEach(
      function (button) {
        if (disabled) {
          button.disabled = true;
        } else {
          button.disabled =
            button.classList.contains(
              "is-empty"
            );
        }
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
        const mpCost = isObject(effect) ? Number(effect["MP"]) : 0;

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
async function cardeffect(side,type,effect,fight) {
  /* 攻击伤害 */
  const damage = isObject(effect) ? effect["伤害"] : null;
  const value = isObject(damage) ? Number(damage.value) : 0;
  if ( Number.isFinite(value) && value !== 0) {
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
  await new Promise(function (resolve) { setTimeout(resolve,1000); });
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

  // ---------- 新增：处理 effect 中的 标记 添加/删除 ----------
  const tagsEffect = isObject(effect) ? effect["标记"] : null;
  if (isObject(tagsEffect)) {
    for (const [tagName, cfg] of Object.entries(tagsEffect)) {
      const add = isObject(cfg) ? toInt(cfg.add ?? 0, 0) : toInt(cfg ?? 0, 0);
      const del = isObject(cfg) ? toInt(cfg.delete ?? 0, 0) : 0;
      const sideProp = isObject(cfg) ? String(cfg.side ?? "") : "";
      // sideProp === 'self' -> applies to the triggering side; otherwise opposite
      const targetSideForAdd = sideProp === "self" ? side : (1 - side);
      if (add > 0) {
        modifyTagCount(fight, targetSideForAdd, tagName, Math.abs(add));
      }
      if (del > 0) {
        const targetSideForDel = sideProp === "self" ? side : (1 - side);
        modifyTagCount(fight, targetSideForDel, tagName, -Math.abs(del));
      }
    }
  }
  // ---------- end 标记处理 ----------

  const slots = Array.from(document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));
  slots.forEach(function (button) {
    const index = Number(button.dataset.index);
    const cardEntry = fight.playerhand[index];
    const parsedCard = parseFightCard(cardEntry);
    const cardName = parsedCard.name;
    const card = getFightCardData(cardName);
    const effect = card ? card["效果"] : null;
    const mpCost = isObject(effect) ? Number(effect["MP"] ?? 0) : 0;
    const mpDisabled = Number.isFinite(mpCost) && mpCost > 0 && fight.player.MP < mpCost;
    if (mpDisabled) {
      button.disabled = true;
    }
  });
  fight.carduseLocked = false;
  setPlayerHandDisabled(fight,false);
  renderAbilityButton(fight,1);
  renderAbilityButton(fight,0);
  bindPlayerHandActions(fight);
  return {side: side,type: type,effect: effect};
}

  async function carduse(side,type,effect,tag,cardName,fight,sidetype = [],register = -1, startStep = 0) {
  fight = fight || window.fight;

  if (!fight || fight.ended) {
    return null;
  }

  // 读取 loop 次数（默认为 1），允许 effect 为 null/非对象
  const loopCount = isObject(effect) ? Math.max(1, toInt(effect.loop, 1)) : 1;

  // 将 loop 字段视为控制参数，不要让后续判定误读（可选：保留原对象但不影响逻辑）
  // 注意：不深拷贝 effect，因为有些判定/装备希望基于战局状态在每次循环重新计算 effect。
  fight.carduseLocked = true;
  setPlayerHandDisabled(fight, true);

  let lastCardEffectResult = null;

  // judgement steps 顺序保持不变（按现有实现）
  const judgementSteps = [startsidecounter,startsideequip,startsidetrait,startsidetag,nsidetag,nsidetrait,nsideequip,nsidecounter];

  // currentRegister flows along steps; DO NOT auto-increment here.
  let initialRegister = typeof register === "number" ? register : -1;

  // 执行一次完整的判定 + 生效流程（供循环内部调用）
  async function doSingleIteration(iterIndex) {
    // 每次迭代都从初始 register（由调用者传入）开始扫描（各 step 内部用 register+1 语义）
    let currentRegister = initialRegister;
    // 每次使用时，使用原始传入的 effect（注意：步骤可能修改返回的 effect）
    let result = {side:Number(side) === 1 ? 1 : 0,type: type,effect: effect,tag: tag,sidetype:sidetype};

    for (let i = startStep; i < judgementSteps.length; i += 1) {
      const step = judgementSteps[i];
      result = await runJudgementStep(step,result,fight,currentRegister,i);

      if (!result) {
        break;
      }

      result.effect = prepareJudgementEffect(result.effect);

      if (result.effect === null) {
        break;
      }

      // 确保 register 不被外放（step 应该返回 register:-1）
      result.register = -1;
    }

    if (!result) {
      return null;
    }

    // 在把卡片移到场上 / 装备时，只有最后一次循环才真正添加
    const isLast = iterIndex === loopCount - 1;

    if (result && cardName) {
      if (result.type === "装备卡") {
        if (isLast) {
          const equip = result.side === 1 ? fight.fightplayerequip : fight.fightenemyequip;
          equip.push(createFightCardEntry(cardName,result.sidetype));
          renderFightEquip(fight,result.side);
        }
      } else {
        // movetosite 接受 loops 参数：只有当 loopsParam === 1 时会真正放到场上（你的判定）
        const loopsParam = isLast ? 1 : 0;
        movetosite(fight,cardName,result.side,result.sidetype,loopsParam);
      }
    }

    exposeBattleGlobals(fight);

    // 如果 result.effect === null，则不执行 cardeffect（已在上面处理）
    if (result.effect === null) {
      return null;
    }

    // 执行卡牌效果（伤害/抽卡/标记等）
    const cardeffectResult = await cardeffect(result.side,result.type,result.effect,fight);

    return cardeffectResult;
  }

  // 顺序执行 loopCount 次（中间可能由于判定使 effect 为空而中断）
  for (let iter = 0; iter < loopCount; iter += 1) {
    if (!fight || fight.ended) break;
    // 每次迭代都重新运行一次完整的判定+生效流程
    const res = await doSingleIteration(iter);
    lastCardEffectResult = res;

  }

  // 解锁与恢复 UI 状态
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
    const mpCost = isObject(effect) ? Number(effect["MP"] ?? 0) : 0;
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
      if (!cardName) {
        return;
      }
      const card = getFightCardData(cardName);
      const type = card ? card["类型"] : null;
      const effect = card ? card["效果"] : null;
      const tagValue = card ? String(card["tag"] ?? "").trim() : "";
      const tag = tagValue;
      fight.playerhand.splice(index,1);
      renderPlayerHand(fight);
      bindPlayerHandActions(fight);
      exposeBattleGlobals(fight);
      const mpCost = isObject(effect) ? Number(effect["MP"] ?? 0) : 0;
      if (Number.isFinite(mpCost) && mpCost > 0) {
        fight.player.MP -= mpCost;
      }
      const res = await carduse(1,type,effect,tag,cardName,fight,sidetype);
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
             const mpCost = isObject(abilityCard["效果"]) ? Number(abilityCard["效果"]["MP"] || 0) : 0;
             if (!Number.isFinite(mpCost) || mpCost <= 0 || fight.enemy.MP >= mpCost) {
               if (Number.isFinite(mpCost) && mpCost > 0) {
                 fight.enemy.MP -= mpCost;
               }
               const effect = abilityCard ? abilityCard["效果"] : null;
               const type = abilityCard ? abilityCard["类型"] : null;
               const tagValue = abilityCard ? String(abilityCard["tag"] ?? "").trim() : "";
               await carduse(0, type, effect, tagValue, null, fight, ["ability"]);
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
  const result = await fightenemyaction();
  if (result !== "end") {
    return;
  }
  moveSiteCardsToGrave(fight);
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
})();