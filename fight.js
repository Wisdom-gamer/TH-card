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

    window.enemyhp = fight.enemy.HP;
    window.maxenemyhp = fight.enemy.MAXHP;
    window.enemymp = fight.enemy.MP;
    window.maxenemymp = fight.enemy.MAXMP;

    window.playerhp = fight.player.HP;
    window.maxplayerhp = fight.player.MAXHP;
    window.playermp = fight.player.MP;
    window.maxplayermp = fight.player.MAXMP;

    updateFightPileCounts(fight);
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

  function createBattleState(
    enemyId
  ) {
    const enemyRecord =
      getAdventureCardById(
        enemyId
      );

    const enemyCard =
      enemyRecord
        ? enemyRecord.card
        : {};

    const adventureStats =  getAdventureStats();

    const enemyHP = Math.max(0,toInt(enemyCard.HP, 0)
      );

    const enemyMP = Math.max(0,toInt(enemyCard.MP, 0)
      );

    const playerDeck =
      window.playerDeck &&
      typeof window.playerDeck.getCards ===
        "function"
        ? window.playerDeck
            .getCards()
            .slice()
        : [];

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
        name: String(
          window.selectedCharacter ||
          "玩家"
        ),

        HP:adventureStats.HP,
        MAXHP:adventureStats.MAXHP,
        MP:adventureStats.MAXMP,
        MAXMP:adventureStats.MAXMP
      },

      /*
        玩家牌组
      */
      playercards:shuffle(playerDeck),

      /*
        敌人牌组
      */
      enemycards:buildCardPool(enemyCard.cards),

      /*
        玩家手牌
      */
      playerhand: [],

      /*
        战斗场地卡牌。
        两个数组下标一一对应。
      */
      fightsitecards: [],

      fightsitecardsow: [],

      /*
        玩家坟场
      */
      fightplayergrave: [],

      /*
        敌人坟场
      */
      fightenemygrave: [],

      resolve: null,
      ended: false
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

    window.fightplayerhand =
      fight.playerhand;

    updateFightPileCounts(fight);
  }

  function renderPlayerHand(
    fight
  ) {
    renderSlots(
      ".game-area .player.bottom .slots .card-slot",
      fight.playerhand,
      getPlayerCardImage,
      "玩家"
    );
  }

  /*
    fightmain 中负责绑定
    玩家手牌点击行为。

    鼠标点击 = 使用卡牌。
  */
  function bindPlayerHandActions(
    fight
  ) {
    const slots =
      Array.from(
        document.querySelectorAll(
          ".game-area .player.bottom .slots .card-slot"
        )
      );

    slots.forEach(
      function (button) {
        button.onclick =
          function () {
            if (
              !window.fight ||
              window.fight !== fight ||
              fight.ended
            ) {
              return;
            }

            const index =Number(button.dataset.index);

            const cardName = fight.playerhand[index];

            if (!cardName) {
              return;
            }

            /*
              从玩家手牌删除。
            */
            fight.playerhand.splice(index,1);

            /*
              移动到场上。
              玩家所有者 = 1。
            */
            movetosite(fight,cardName,1);

            /*
              重新显示玩家手牌。
            */
            renderPlayerHand(fight);

            /*
              重新绑定点击事件。
            */
            bindPlayerHandActions(fight);

            exposeBattleGlobals(fight);
          };
      }
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
      绑定玩家手牌点击。
      鼠标点击即视为使用。
    */
    bindPlayerHandActions(fight);

    /*
      显示敌人前3张牌
    */
    renderEnemyHand(fight);

    /*
      显示场上卡牌
    */
    renderFightSite(fight);

    /*
      更新双方 HP / MP
      以及牌库 / 坟场数量。
    */
    exposeBattleGlobals(fight);

    /*
      玩家结束回合
    */
    const endTurnButton = document.querySelector(
        ".game-area .end-turn"
      );

    if (endTurnButton) {
      endTurnButton.disabled = false;

      endTurnButton.onclick = function () {
          if (!window.fight || window.fight !== fight || fight.ended
          ) {
            return;
          }

          /*
            敌人行动
          */
          const result = fightenemyaction();

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
          const outcome = fightmain();

          /*
            fightmain 只有在
            战斗结束时才返回 win/lost。
          */
          if (
            outcome === "win" ||
            outcome === "lost"
          ) {
            fight.ended = true;
            endTurnButton.disabled = true;
            endTurnButton.onclick = null;
            const resolve = fight.resolve;
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

      玩家 HP > 0
      且敌人 HP <= 0：
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
    if (
      fight.player.HP <= 0
    ) {
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

        const outcome = fightmain();

        /*
          只有 fightmain
          返回 win/lost
          才完成 Promise。
        */
        if (
          outcome === "win" ||
          outcome === "lost"
        ) {
          fight.ended = true;

          fight.resolve = null;

          resolve(
            outcome
          );
        }
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
})();