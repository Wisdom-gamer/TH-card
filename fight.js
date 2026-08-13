(function () {
  "use strict";

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function toInt(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? Math.floor(number)
      : fallback;
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

    return card && card["图片"]
      ? card["图片"]
      : "null.png";
  }

  function getEnemyCardImage(cardName) {
    const database =
      window.adventureCardsDatabase;

    const card =
      isObject(database)
        ? database[cardName]
        : null;

    return card && card.ID
      ? `images/adventure/${card.ID}.png`
      : "null.png";
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
        const cardName =
          cards[index];

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

          if (img) {
            img.src = "null.png";
            img.alt = "empty card";
          }
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
    window.fightplayercards = fight.playercards;
    window.fightplayerhand = fight.playerhand;
    window.fightsitecards = fight.fightsitecards;
    window.fightsitecardsow = fight.fightsitecardsow;
    window.fightplayergrave = fight.fightplayergrave;
    window.fightenemygrave = fight.fightenemygrave;
    window.fightplayerequip = fight.fightplayerequip;
    window.fightenemyequip = fight.fightenemyequip;
    
    window.enemyhp = fight.enemy.HP;
    window.maxenemyhp = fight.enemy.MAXHP;
    window.enemymp = fight.enemy.MP;
    window.maxenemymp = fight.enemy.MAXMP;

    window.playerhp = fight.player.HP;
    window.maxplayerhp = fight.player.MAXHP;
    window.playermp = fight.player.MP;
    window.maxplayermp = fight.player.MAXMP;

    updateFightPileCounts(fight);
    renderFightEquip(fight, 1);
    renderFightEquip(fight, 0);
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
    const site =
      document.getElementById(
        "fightsite"
      );

    if (!site) {
      return;
    }

    site.innerHTML = "";

    fight.fightsitecards.forEach(
      function (cardName, index) {
        const owner =
          fight.fightsitecardsow[index];

        const button =
          document.createElement(
            "button"
          );

        const img =
          document.createElement(
            "img"
          );

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
        img.src =
          owner === 1
            ? getPlayerCardImage(
                cardName
              )
            : getEnemyCardImage(
                cardName
              );

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
    const box =
      document.getElementById(
        owner === 1
          ? "fightplayerequip"
          : "fightenemyequip"
      );

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
      function (cardName) {
        const slot =
          document.createElement(
            "div"
          );

        const img =
          document.createElement(
            "img"
          );

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
  /*
    将卡牌移动到场上。

    owner:
      1 = 玩家
      0 = 敌人
  */
  function movetosite(
    fight,
    cardName,
    owner
  ) {
    if (
      !fight ||
      !cardName
    ) {
      return false;
    }

    owner =
      Number(owner) === 1
        ? 1
        : 0;

    /*
      卡牌加入场上数组末尾。
    */
    fight.fightsitecards.push(
      cardName
    );

    /*
      相同位置保存所有者。
    */
    fight.fightsitecardsow.push(
      owner
    );

    renderFightSite(fight);

    return true;
  }

  /*
    将场上所有卡牌移动到
    原持有者的坟场。
  */
  function moveSiteCardsToGrave(
    fight
  ) {
    for (
      let index = 0;
      index <
      fight.fightsitecards.length;
      index += 1
    ) {
      const cardName =
        fight.fightsitecards[index];

      const owner =
        fight.fightsitecardsow[index];

      if (owner === 1) {
        fight.fightplayergrave.push(
          cardName
        );
      } else {
        fight.fightenemygrave.push(
          cardName
        );
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

    const playerDeck = window.playerDeck && typeof window.playerDeck.getCards === "function" ? window.playerDeck .getCards() .slice() : [];

    return {
      turn: 1,

      enemy: {
        name:
          enemyRecord
            ? enemyRecord.name
            : String(
                enemyId || "敌人"
              ),

        ID: String(
          enemyCard.ID ||
          enemyId ||
          ""
        ),

        HP: enemyHP,
        MAXHP: enemyHP,

        MP: enemyMP,
        MAXMP: enemyMP
      },

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
      /* 玩家手牌 */
      playerhand: [],

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
      resolve: null,
      ended: false,
      carduseLocked: false
    };
  }

  function renderEnemyHand(
    fight
  ) {
    const cards =
      fight.enemycards.slice(0,3);

    renderSlots(
      ".game-area .player.top .slots .card-slot",
      cards,
      getEnemyCardImage,
      "敌人"
    );
  }

  function drawPlayerCards(
    fight
  ) {
    const drawCount =
      fight.turn === 1
        ? 3
        : 2;

    for (
      let index = 0;
      index < drawCount;
      index += 1
    ) {
      const cardName =
        fight.playercards.pop();

      if (!cardName) {
        break;
      }

      fight.playerhand.push(
        cardName
      );
    }

    window.fightplayerhand = fight.playerhand;

    updateFightPileCounts(fight);
  }

  function renderPlayerHand(fight) {
    renderSlots(".game-area .player.bottom .slots .card-slot",fight.playerhand,getPlayerCardImage,"玩家");
  }
    function getFightCardData(
    cardName
  ) {
    const database =
      window.cardDatabase;

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
      const ret = {side:result.side,type:result.type,effect:effect,tag:result.tag,register:-1};
      return ret;
    }

    // pass current register to step; step may be async and may trigger nested calls
    const stepResult = await step(result.side,result.type,effect,result.tag,fight,typeof register === "number" ? register : -1,typeof stepIndex === "number"? stepIndex:0);

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

  async function startsidecounter(side,type,effect,tag,fight,register,stepIndex) {
    // register unused here; always return with register -1
    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

  async function startsideequip(side,type,effect,tag,fight,register,stepIndex) {
    // side: incoming effect side
    // iterate equips that are on the same side as the incoming side (owner side)
    const equips = side === 1 ? fight.fightplayerequip : fight.fightenemyequip;
    const ownerSide = side === 1 ? 1 : 0;

    // allow multiple passive effects to trigger; do not override incoming effect
    for (
      let index = 0;
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

      // 被动伤害触发：启动新的调用（嵌套），从当前步骤位置开始，register 传当前装备在数组中的位置
      if (Object.prototype.hasOwnProperty.call(cardEffect,"被动伤害")) {
        const passive = cardEffect["被动伤害"];
        if (isObject(passive) && Number.isFinite(Number(passive.value)) && Number(passive.value) !== 0) {
          // build effect object for nested call: treat like a damage effect
          const nestedEffect = { "伤害": { value: Number(passive.value), type: passive.type ?? passive.type } };
          const nestedTag = cardTagVal === "" ? "equip" : cardTagVal;
          // register passed is current equip index
          // startStepIndex: use stepIndex to begin nested judgement from this same function position
          await carduse(ownerSide, "装备卡", nestedEffect, nestedTag, null, fight, index, stepIndex);
          // after nested call, continue to check next equips
        }
        // continue without replacing original effect
        continue;
      }

      // 如果装备不是被动伤害（例如某些会替换效果的装备），保留原逻辑：覆盖 effect 并停止（与原实现保持兼容）
      if (isObject(cardEffect) && !isObject(cardEffect["伤害修改"])) {
        effect = cardEffect;
        // match original behavior: stop at first overriding equip
        break;
      }
    }

    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

  async function startsidetrait(side,type,effect,tag,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

  async function startsidetag(side,type,effect,tag,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

  async function nsidetag(side,type,effect,tag,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

  async function nsidetrait(side,type,effect,tag,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

async function nsideequip(side,type,effect,tag,fight,register,stepIndex) {
    // nsideequip: check equips on the opposite side (owner side is opposite)
    const equips = side === 1 ? fight.fightenemyequip : fight.fightplayerequip;
    const ownerSide = side === 1 ? 0 : 1;

    // If register provided (>=0), start from that index; otherwise start at 0
    const startIndex = (typeof register === "number" && register >= 0) ? register : 0;

    for (
      let index = startIndex;
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

      const defense = cardEffect["伤害修改"];
      // Recompute damage based on current effect (so reductions are cumulative)
      const damage = isObject(effect) ? effect["伤害"] : null;

      if (
        !isObject(defense) ||
        !isObject(damage)
      ) {
        continue;
      }

      const defenseValue = Number(defense.value);
      const damageValue = Number(damage.value);

      if (
        Number.isFinite(defenseValue) &&
        Number.isFinite(damageValue)
      ) {
        // apply reduction cumulatively
        effect = {...effect};
        effect["伤害"] = {...damage,value:Math.max(0,damageValue-defenseValue)};
        // if damage reduced to 0, we can stop early as no further effects matter
        const newDamage = effect && isObject(effect["伤害"]) ? Number(effect["伤害"].value) : 0;
        if (newDamage <= 0) {
          break;
        }
        // otherwise continue to next equip (so reductions accumulate)
      }
    }

    return {side:side,type:type,effect:effect,tag:tag,register:-1};
  }

  async function nsidecounter(side,type,effect,tag,fight,register,stepIndex) {
    return {side:side,type:type,effect:effect,tag:tag,register:-1};
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
    const damage = isObject(effect) ? effect["伤害"] : null;

    const value = isObject(damage) ? Number(damage.value) : 0;

    if ( Number.isFinite(value) && value !== 0) {
      if (side === 1) {
        fight.enemy.HP = fight.enemy.HP - value;
      } else {
        fight.player.HP = fight.player.HP - value;
      }
    }
    exposeBattleGlobals(fight);

    await new Promise(
      function (resolve) {
        setTimeout(resolve,1000);
      }
    );

    fight.carduseLocked = false;

    setPlayerHandDisabled(fight,false);

    bindPlayerHandActions(fight);

    return {side: side,type: type,effect: effect};
  }

  async function carduse(side,type,effect,tag,cardName,fight,register = -1, startStep = 0) {
    fight = fight || window.fight;

    if (!fight || fight.ended) {
      return null;
    }

    fight.carduseLocked = true;

    setPlayerHandDisabled(fight,true);

    let result = {side:Number(side) === 1 ? 1 : 0,type: type,effect: effect,tag: tag};

    const judgementSteps = [startsidecounter,startsideequip,startsidetrait,startsidetag,nsidetag,nsidetrait,nsideequip,nsidecounter
    ];

    // currentRegister flows along steps; when passed, increment between steps (per要求 register在传入后固定+1)
    let currentRegister = typeof register === "number" ? register : -1;

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

      // if register was passed (>=0), increase it for the next step per你的要求
      if (currentRegister >= 0) {
        currentRegister += 1;
      }

      // ensure we don't propagate register outwards (functions should return register:-1)
      result.register = -1;
    }

    if (result && cardName) {
      if (result.type === "装备卡") {
        const equip = result.side === 1 ? fight.fightplayerequip : fight.fightenemyequip;

        equip.push(cardName);

        renderFightEquip(fight,result.side);
      } else {
        movetosite(fight,cardName,result.side);
      }
    }

    exposeBattleGlobals(fight);

    if (!result) {
      // unlock if nothing to apply
      fight.carduseLocked = false;
      setPlayerHandDisabled(fight,false);
      bindPlayerHandActions(fight);
      return null;
    }

    const cardeffectResult = await cardeffect(result.side,result.type,result.effect,fight);

    // NOTE: 按要求，胜负判定不在这里进行（只在手牌动作完成、player/enemy turnstart 完成时进行）。
    // 返回 cardeffectResult 给调用者，由调用者负责在需要的时刻检查战局并结束战斗。

    return cardeffectResult;
  }
  
  /*
    fightmain 中负责绑定
    玩家手牌点击行为。

    鼠标点击 = 使用卡牌。
  */
  function bindPlayerHandActions(fight) {
    const slots = Array.from(document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));

    slots.forEach(
      function (button) {
        if (fight.carduseLocked) {
          button.disabled = true;
          button.onclick = null;
          return;
        }

        button.onclick = async function () {
            if (!window.fight || window.fight !== fight || fight.ended || fight.carduseLocked) {
              return;
            }
            const index = Number(button.dataset.index);
            const cardName =fight.playerhand[
                index
              ];

            if (!cardName) {
              return;
            }

            const card = getFightCardData(cardName);
            const type = card ? card["类型"] : null;
            const effect = card ? card["效果"] : null;
            const tagValue = card ? String(card["tag"] ?? "").trim() : "";
            const tag = tagValue === "" ? "handcard" : tagValue;
            /* 从玩家手牌删除 */
            fight.playerhand.splice(index,1);

            /* 重新显示玩家手牌 */
            renderPlayerHand(fight);

            /* 重新绑定点击事件 */
            bindPlayerHandActions(fight);

            exposeBattleGlobals(fight);

            /* 使用卡牌：1 = 玩家 */
            const res = await carduse(1,type,effect,tag,cardName,fight);

            // 在手牌动作完成后才做胜负判定（按你的要求）
            const outcome = getFightOutcome(fight);
            if (outcome === "win" || outcome === "lost") {
              finishFight(fight,outcome);
            }
          };
      }
    );
  }

  async function fightenemyaction() {
    const fight = window.fight;
    const turnStartResult = await carduse(0,"event","event","turnstart",null,fight);

    if (turnStartResult === "win" || turnStartResult === "lost") {
      return turnStartResult;
    }

    const turnEndResult = await carduse(0,"event","event","turnend",null,fight);

    if (turnEndResult === "win" || turnEndResult === "lost") {
      return turnEndResult;
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
    /*
      发卡
      第1回合：3张
      之后：2张
    */
    drawPlayerCards(fight);

    /*
      显示玩家手牌
    */
    renderPlayerHand(fight);

    /* 绑定玩家手牌点击。鼠标点击即视为使用。 */
    bindPlayerHandActions(fight);

    /* 显示敌人前3张牌  */
    renderEnemyHand(fight);

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

          if (turnEndResult === "win" || turnEndResult === "lost") {
            return;
          }
          /*
            敌人行动
          */
          const result = await fightenemyaction();

          /*
            只有返回 end
            才进入下一回合。
          */
          if (result !== "end") {
            return;
          }

          /*
            回合结束：
            场上所有卡牌进入
            原持有者的坟场。
          */
          moveSiteCardsToGrave(fight);

          /*
            坟场进入牌组前，
            检查牌组是否已经为空。
          */
          recycleGraves(fight);

          /*
            回合数 +1
          */
          fight.turn += 1;

          /*
            执行下一回合。
          */
          const outcome = await fightmain();

          /*
            fightmain 只有在
            战斗结束时才返回 win/lost。
          */
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

    window.fight = fight;

    fight.turn = 1;
    fight.ended = false;

    exposeBattleGlobals(fight);

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
window.movetosite = movetosite;
window.carduse = carduse;
window.cardeffect = cardeffect;
})();