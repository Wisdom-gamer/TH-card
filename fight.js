(function () {
  "use strict";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function toInt(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.floor(number) : fallback;
  }

  function shuffle(list) {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
    }

    return list;
  }

  function getAdventureCardById(cardId) {
    const database = window.adventureCardsDatabase;

    if (!isObject(database)) {
      return null;
    }

    const targetId = String(cardId ?? "");

    for (const [name, card] of Object.entries(database)) {
      if (card && String(card.ID ?? "") === targetId) {
        return {
          name: name,
          card: card
        };
      }
    }

    return null;
  }

  function getAdventureStats() {
    const stats = isObject(window.adventureStats)
      ? window.adventureStats
      : {};

    /*
      角色刚创建时，adventure.js 内部 stats 可能还是 0/0。
      此时直接读取角色存档可以得到 character.js 刚刚保存的真实数值。
    */
    const savedText = localStorage.getItem("TH_CARD_CHARACTER");
    let saved = null;

    if (savedText) {
      try {
        const data = JSON.parse(savedText);

        if (isObject(data)) {
          saved = data;
        }
      } catch (error) {
        console.warn("角色战斗状态读取失败", error);
      }
    }

    const hpSource = saved
      ? (saved.adventurehp ?? saved.HP)
      : (stats.HP ?? window.adventurehp ?? window.HP);

    const mpSource = saved
      ? (saved.adventuremp ?? saved.MP)
      : (stats.MP ?? window.adventuremp ?? window.MP);

    const hp = Number.isFinite(Number(hpSource))
      ? Math.floor(Number(hpSource))
      : 0;

    const maxHPSource = saved
      ? (saved.maxHP ?? hp)
      : (stats.maxHP ?? window.maxHP ?? hp);

    const maxMPSource = saved
      ? (saved.maxMP ?? mpSource)
      : (stats.maxMP ?? window.maxMP ?? mpSource);

    const maxHP =
      Number.isFinite(Number(maxHPSource)) &&
      Number(maxHPSource) > 0
        ? Math.floor(Number(maxHPSource))
        : hp;

    const mp = Number.isFinite(Number(mpSource))
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
    const database = window.cardDatabase;
    const card = isObject(database)
      ? database[cardName]
      : null;

    return card && card["图片"]
      ? card["图片"]
      : "null.png";
  }

  function getEnemyCardImage(cardName) {
    const database = window.adventureCardsDatabase;
    const card = isObject(database)
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
    const slots = Array.from(
      document.querySelectorAll(slotSelector)
    );

    slots.forEach((button, index) => {
      const cardName = cards[index];
      const img = button.querySelector("img");

      button.dataset.index = String(index);

      if (cardName) {
        button.classList.remove("is-empty");
        button.disabled = false;
        button.dataset.card = cardName;
        button.setAttribute("aria-label", cardName);

        if (img) {
          img.src = imageResolver(cardName);
          img.alt = cardName;
        }
      } else {
        button.classList.add("is-empty");
        button.disabled = true;
        button.removeAttribute("data-card");
        button.setAttribute(
          "aria-label",
          `${labelPrefix}空卡位${index + 1}`
        );

        if (img) {
          img.src = "null.png";
          img.alt = "empty card";
        }
      }
    });
  }

  function updateBattleBars() {
    if (typeof window.thCardSyncBattleBars === "function") {
      window.thCardSyncBattleBars();
    }
  }

  function exposeBattleGlobals(fight) {
    window.fight = fight;

    window.fightenemy = fight.enemy;
    window.fightplayer = fight.player;

    window.fightenemycards = fight.enemycards;
    window.fightplayercards = fight.playercards;
    window.fightplayerhand = fight.playerhand;

    window.enemyhp = fight.enemy.HP;
    window.maxenemyhp = fight.enemy.MAXHP;
    window.enemymp = fight.enemy.MP;
    window.maxenemymp = fight.enemy.MAXMP;

    window.playerhp = fight.player.HP;
    window.maxplayerhp = fight.player.MAXHP;
    window.playermp = fight.player.MP;
    window.maxplayermp = fight.player.MAXMP;

    updateBattleBars();
  }

  function buildCardPool(source) {
    const pool = [];

    if (Array.isArray(source)) {
      source.forEach(function (cardName) {
        const name = String(cardName).trim();

        if (name) {
          pool.push(name);
        }
      });
    } else if (isObject(source)) {
      for (const [cardName, count] of Object.entries(source)) {
        if (
          cardName === "type" ||
          cardName === "trpe" ||
          cardName === "maxnumber"
        ) {
          continue;
        }

        const amount = Math.max(
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
    const enemyRecord =
      getAdventureCardById(enemyId);

    const enemyCard =
      enemyRecord
        ? enemyRecord.card
        : {};

    const adventureStats =
      getAdventureStats();

    const enemyHP =
      Math.max(
        0,
        toInt(enemyCard.HP, 0)
      );

    const enemyMP =
      Math.max(
        0,
        toInt(enemyCard.MP, 0)
      );

    const playerDeck =
      window.playerDeck &&
      typeof window.playerDeck.getCards === "function"
        ? window.playerDeck.getCards().slice()
        : [];

    return {
      turn: 1,

      enemy: {
        name: enemyRecord
          ? enemyRecord.name
          : String(enemyId || "敌人"),

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
        name: String(
          window.selectedCharacter ||
          "玩家"
        ),

        HP: adventureStats.HP,
        MAXHP: adventureStats.MAXHP,

        MP: adventureStats.MAXMP,
        MAXMP: adventureStats.MAXMP
      },

      enemycards:
        buildCardPool(enemyCard.cards),

      playercards:
        shuffle(playerDeck),

      playerhand: [],

      resolve: null,
      ended: false
    };
  }

  function renderEnemyHand(fight) {
    const cards =
      fight.enemycards.slice(0, 3);

    renderSlots(
      ".game-area .player.top .slots .card-slot",
      cards,
      getEnemyCardImage,
      "敌人"
    );
  }

  function drawPlayerCards(fight) {
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

      fight.playerhand.push(cardName);
    }

    window.fightplayerhand =
      fight.playerhand;
  }

  function renderPlayerHand(fight) {
    renderSlots(
      ".game-area .player.bottom .slots .card-slot",
      fight.playerhand,
      getPlayerCardImage,
      "玩家"
    );
  }

  function fightenemyaction() {
    return "end";
  }

  function fightmain() {
    const fight = window.fight;

    if (!fight || fight.ended) {
      return;
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

    /*
      显示敌人前3张牌
    */
    renderEnemyHand(fight);

    /*
      更新战斗双方 HP / MP
    */
    exposeBattleGlobals(fight);

    /*
      玩家结束回合
    */
    const endTurnButton =
      document.querySelector(
        ".game-area .end-turn"
      );

    if (endTurnButton) {
      endTurnButton.disabled = false;

      endTurnButton.onclick =
        function () {
          if (
            !window.fight ||
            window.fight !== fight ||
            fight.ended
          ) {
            return;
          }

          /*
            敌人行动
          */
          const result =
            fightenemyaction();

          /*
            只有返回 end 才进入下一回合
          */
          if (result !== "end") {
            return;
          }

          /*
            回合数 +1
          */
          fight.turn += 1;

          /*
            执行下一回合发卡
          */
          const outcome =
            fightmain();

          /*
            fightmain 只有在战斗结束时
            才会返回 win / lost
          */
          if (
            outcome === "win" ||
            outcome === "lost"
          ) {
            fight.ended = true;

            endTurnButton.disabled = true;
            endTurnButton.onclick = null;

            const resolve =
              fight.resolve;

            fight.resolve = null;

            if (
              typeof resolve === "function"
            ) {
              resolve(outcome);
            }
          }
        };
    }

    /*
      战斗结束判断。

      玩家 HP > 0 且敌人 HP <= 0：
      胜利
    */
    if (
      fight.player.HP > 0 &&
      fight.enemy.HP <= 0
    ) {
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
      fightAPI 的 Promise 会继续等待，
      因此不会向 runAction 返回。
    */
  }

  function fightAPI(enemyId) {
    const fight =
      createBattleState(enemyId);

    window.fight = fight;

    fight.turn = 1;
    fight.ended = false;

    exposeBattleGlobals(fight);

    return new Promise(function (resolve) {
      fight.resolve = resolve;

      const outcome =
        fightmain();

      /*
        只有 fightmain 返回 win/lost
        才让 fightAPI 完成。
      */
      if (
        outcome === "win" ||
        outcome === "lost"
      ) {
        fight.ended = true;
        fight.resolve = null;
        resolve(outcome);
      }
    });
  }

  window.fightAPI = fightAPI;
  window.fightmain = fightmain;
  window.fightenemyaction =
    fightenemyaction;
})();