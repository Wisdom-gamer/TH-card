/*
  cards.js

  功能：

  1. 读取 cards.json
  2. 读取 pc.json
  3. 根据角色 pc.json 的“初始卡”发放卡牌
  4. 新获得的卡牌通过 playerBag.addNew 自动分配
  5. 维护牌库 TH_CARD_DECK
  6. 牌库中的装备卡可以移动到 equip
  7. 牌库中的道具卡可以移动到 bagitem
  8. equip / bagitem 中的卡可以移动回牌库
*/

(function () {
  "use strict";

  const DECK_STORAGE_KEY =
    "TH_CARD_DECK";


  let cardDatabase = {};
  let pcDatabase = {};
  let deckCards = [];


  window.cardDatabase =
    cardDatabase;


  /*
    --------------------------------------------------
    删除 JSON 注释
    --------------------------------------------------
  */

  function stripJsonComments(text) {

    let result = "";

    let inString = false;

    let escaped = false;


    for (
      let index = 0;
      index < text.length;
      index += 1
    ) {

      const current =
        text[index];

      const next =
        text[index + 1];


      if (inString) {

        result +=
          current;


        if (escaped) {

          escaped =
            false;

        }

        else if (
          current === "\\"
        ) {

          escaped =
            true;

        }

        else if (
          current === '"'
        ) {

          inString =
            false;

        }


        continue;
      }


      if (
        current === '"'
      ) {

        inString =
          true;

        result +=
          current;

        continue;
      }


      if (
        current === "/" &&
        next === "/"
      ) {

        while (
          index < text.length &&
          text[index] !== "\n"
        ) {

          index += 1;

        }


        result +=
          "\n";

        continue;
      }


      if (
        current === "/" &&
        next === "*"
      ) {

        index += 2;


        while (
          index < text.length &&
          !(
            text[index] === "*" &&
            text[index + 1] === "/"
          )
        ) {

          if (
            text[index] === "\n"
          ) {

            result +=
              "\n";

          }

          index += 1;

        }


        index += 1;

        continue;
      }


      result +=
        current;

    }


    return result;
  }


  /*
    --------------------------------------------------
    读取 JSON
    --------------------------------------------------
  */

  async function fetchJsonFile(
    path,
    allowComments
  ) {

    const response =
      await fetch(
        path,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `${path} 请求失败：HTTP ${response.status}`
      );

    }


    const text =
      await response.text();


    return JSON.parse(
      allowComments
        ? stripJsonComments(text)
        : text
    );

  }


  /*
    --------------------------------------------------
    数据库加载
    --------------------------------------------------
  */

  const databaseReady =
    Promise.all([

      fetchJsonFile(
        "cards.json",
        true
      ),

      fetchJsonFile(
        "pc.json",
        false
      )

    ])

    .then(
      function (result) {

        cardDatabase =
          result[0];

        pcDatabase =
          result[1];


        window.cardDatabase =
          cardDatabase;

        window.pcDatabase =
          pcDatabase;


        renderDeck();


        if (
          window.playerBag
        ) {

          window.playerBag.refresh();

        }


        return {
          cards:
            cardDatabase,

          characters:
            pcDatabase
        };

      }
    )

    .catch(
      function (error) {

        console.error(
          "卡牌或角色数据读取失败",
          error
        );

        throw error;

      }
    );


  /*
    --------------------------------------------------
    保存牌库
    --------------------------------------------------
  */

  function saveDeck() {

    localStorage.setItem(

      DECK_STORAGE_KEY,

      JSON.stringify(
        deckCards
      )

    );

  }


  /*
    --------------------------------------------------
    读取牌库
    --------------------------------------------------
  */

  function loadSavedDeck() {

    const saved =
      localStorage.getItem(
        DECK_STORAGE_KEY
      );


    if (!saved) {

      deckCards =
        [];

      return;
    }


    try {

      const data =
        JSON.parse(
          saved
        );


      deckCards =
        Array.isArray(data)
          ? data
          : [];


    } catch (error) {

      console.warn(
        "牌库存档读取失败，将使用空牌库",
        error
      );


      deckCards =
        [];

    }

  }


  /*
    --------------------------------------------------
    HTML 转义
    --------------------------------------------------
  */

  function escapeHtml(value) {

    return String(value)

      .replaceAll(
        "&",
        "&amp;"
      )

      .replaceAll(
        "<",
        "&lt;"
      )

      .replaceAll(
        ">",
        "&gt;"
      )

      .replaceAll(
        '"',
        "&quot;"
      )

      .replaceAll(
        "'",
        "&#039;"
      );

  }


  /*
    --------------------------------------------------
    显示卡牌信息
    --------------------------------------------------
  */

  function showInfo(cardName) {

    const box =
      document.querySelector(
        "#cardinfo-content"
      );


    if (!box) {
      return;
    }


    const card =
      cardDatabase[
        cardName
      ];


    if (!card) {

      box.textContent =
        cardName;

      return;

    }


    let html =
      `<h3>${escapeHtml(
        cardName
      )}</h3>`;


    if (
      card["类型"]
    ) {

      html +=
        `<p>类型：${escapeHtml(
          card["类型"]
        )}</p>`;

    }


    if (
      card["角色归属"]
    ) {

      html +=
        `<p>角色：${escapeHtml(
          card["角色归属"]
        )}</p>`;

    }


    if (
      card["效果"] &&
      card["效果"]["描述"]
    ) {

      html +=
        `<p>${escapeHtml(
          card["效果"]["描述"]
        )}</p>`;

    }


    box.innerHTML =
      html;

  }


  /*
    --------------------------------------------------
    创建牌库卡牌按钮
    --------------------------------------------------
  */

  function createCardSlot(
    cardName
  ) {

    const button =
      document.createElement(
        "button"
      );


    const img =
      document.createElement(
        "img"
      );


    const card =
      cardDatabase[
        cardName
      ];


    button.className =
      "bag-slot";


    button.type =
      "button";


    button.dataset.card =
      cardName;


    button.dataset.source =
      "deck";


    button.setAttribute(
      "aria-label",
      cardName
    );


    img.src =
      card &&
      card["图片"]
        ? card["图片"]
        : "null.png";


    img.alt =
      cardName;


    button.appendChild(
      img
    );


    /*
      鼠标悬停
    */

    button.addEventListener(
      "mouseenter",
      function () {

        showInfo(
          cardName
        );

      }
    );


    /*
      点击：

      只有装备卡和道具卡
      可以移动到专用栏。

      基本卡不会移动。
    */

    button.addEventListener(
      "click",
      function () {

        moveDeckCardToDedicatedSlot(
          cardName
        );

      }
    );


    return button;
  }


  /*
    --------------------------------------------------
    渲染牌库
    --------------------------------------------------
  */

  function renderDeck() {

    const box =
      document.querySelector(
        "#bagcards"
      );


    if (!box) {
      return;
    }


    box.innerHTML =
      "";


    deckCards.forEach(
      function (cardName) {

        box.appendChild(

          createCardSlot(
            cardName
          )

        );

      }
    );

  }


  /*
    --------------------------------------------------
    直接加入牌库

    这是：

    “已经决定进入牌库”

    的操作。

    不进行任何自动分配。
    --------------------------------------------------
  */

  function addDirect(
    cardName
  ) {

    deckCards.push(
      cardName
    );


    saveDeck();

    renderDeck();

  }


  /*
    --------------------------------------------------
    重置牌库
    --------------------------------------------------
  */

  function resetDeck() {

    deckCards =
      [];


    saveDeck();

    renderDeck();

  }


  /*
    --------------------------------------------------
    牌库 → equip / bagitem

    玩家主动移动已有卡牌。

    不执行新卡自动分配。
    --------------------------------------------------
  */

  function moveDeckCardToDedicatedSlot(
    cardName
  ) {

    const card =
      cardDatabase[
        cardName
      ];


    /*
      不存在的卡牌
    */

    if (!card) {
      return;
    }


    /*
      基本卡不能移动
    */

    if (
      card["类型"] ===
      "基本卡"
    ) {

      return;

    }


    /*
      找到牌库中的一张卡
    */

    const index =
      deckCards.indexOf(
        cardName
      );


    if (
      index === -1
    ) {

      return;

    }


    if (
      !window.playerBag ||
      typeof window.playerBag.moveFromDeck !==
      "function"
    ) {

      return;

    }


    /*
      先尝试加入专用栏。

      如果容量已满，
      moveFromDeck 返回 false，
      牌库中的卡牌保持不变。
    */

    const moved =
      window.playerBag.moveFromDeck(
        cardName
      );


    if (!moved) {

      return;

    }


    /*
      专用栏加入成功后，
      才从牌库删除一张。

      使用之前找到的 index，
      因此只删除一张重复卡。
    */

    deckCards.splice(
      index,
      1
    );


    saveDeck();

    renderDeck();

  }


  /*
    --------------------------------------------------
    equip / bagitem → 牌库
    --------------------------------------------------

    source 必须明确：

    equip
    bagitem

    这样不会把同名卡牌从错误的位置删除。
    --------------------------------------------------
  */

  function moveCardToDeck(
    cardName,
    source
  ) {

    if (
      !window.playerBag ||
      typeof window.playerBag.take !==
      "function"
    ) {

      return false;

    }


    /*
      只有指定 source 中存在
      该卡牌时才删除。
    */

    const removed =
      window.playerBag.take(
        cardName,
        source
      );


    if (!removed) {

      return false;

    }


    /*
      直接放入牌库。

      注意：

      这里使用 addDirect，
      而不是 giveCardToPlayer。

      因为这是“主动移动已有卡牌”，
      不能再次触发新卡自动分配。
    */

    addDirect(
      cardName
    );


    return true;
  }


  /*
    --------------------------------------------------
    数量标准化
    --------------------------------------------------
  */

  function normalizeCount(
    value
  ) {

    const count =
      Number(value);


    if (
      !Number.isFinite(count) ||
      count <= 0
    ) {

      return 0;

    }


    return Math.floor(
      count
    );

  }


  /*
    --------------------------------------------------
    给玩家新卡牌

    这里才执行：

    “获得新卡 → 自动分配”

    --------------------------------------------------
  */

  async function giveCardToPlayer(
    cardName,
    count
  ) {

    await databaseReady;


    const amount =
      normalizeCount(
        count === undefined
          ? 1
          : count
      );


    if (
      !cardDatabase[
        cardName
      ]
    ) {

      console.warn(
        `pc.json 引用了 cards.json 中不存在的卡牌：${cardName}`
      );

    }


    for (
      let index = 0;
      index < amount;
      index += 1
    ) {

      if (
        window.playerBag &&
        typeof window.playerBag.addNew ===
        "function"
      ) {

        /*
          新卡：
          执行自动分配
        */

        window.playerBag.addNew(
          cardName
        );

      }

      else {

        /*
          playerBag 不存在时，
          直接进入牌库
        */

        addDirect(
          cardName
        );

      }

    }

  }


  /*
    --------------------------------------------------
    根据角色初始卡初始化
    --------------------------------------------------
  */

  async function initializeCharacterCards(
    characterName
  ) {

    await databaseReady;


    const character =
      pcDatabase[
        characterName
      ];


    if (!character) {

      throw new Error(
        `pc.json 中不存在角色：${characterName}`
      );

    }


    /*
      清空旧牌库
    */

    resetDeck();


    /*
      清空旧装备和背包
    */

    if (
      window.playerBag
    ) {

      window.playerBag.reset();


      /*
        先设置容量，
        再发初始卡。
      */

      window.playerBag.setLimits(
        character.ME,
        character.MB
      );

    }


    /*
      读取 pc.json：

      "初始卡": {
        "测试卡牌1": 2,
        "测试卡牌2": 4
      }
    */

    const initialCards =
      character["初始卡"] ||
      {};


    for (
      const [
        cardName,
        count
      ]
      of Object.entries(
        initialCards
      )
    ) {

      /*
        初始卡也视为“玩家获得新卡”，
        所以通过 giveCardToPlayer。

        因此：

        装备卡 → equip
        道具卡 → bagitem
        槽位满 → deck
      */

      await giveCardToPlayer(
        cardName,
        count
      );

    }


    saveDeck();

    renderDeck();


    if (
      window.playerBag
    ) {

      window.playerBag.refresh();

    }

  }


  /*
    --------------------------------------------------
    对外接口
    --------------------------------------------------
  */

  window.playerDeck = {

    getCards:
      function () {

        return deckCards.slice();

      },


    addDirect:
      addDirect,


    reset:
      resetDeck,


    refresh:
      renderDeck

  };


  /*
    equip / bagitem → deck
  */

  window.moveCardToDeck =
    moveCardToDeck;


  /*
    新卡
  */

  window.giveCardToPlayer =
    giveCardToPlayer;


  /*
    初始化角色卡牌
  */

  window.initializeCharacterCards =
    initializeCharacterCards;


  /*
    --------------------------------------------------
    处理 bag.js 在 cards.js 尚未加载时
    暂存的牌库卡牌
    --------------------------------------------------
  */

  if (
    Array.isArray(
      window.TH_CARD_PENDING_DECK
    )
  ) {

    window.TH_CARD_PENDING_DECK.forEach(
      function (cardName) {

        addDirect(
          cardName
        );

      }
    );


    window.TH_CARD_PENDING_DECK =
      [];

  }


  /*
    --------------------------------------------------
    角色选择完成
    --------------------------------------------------
  */

  document.addEventListener(
    "th-card:character-selected",
    function (event) {

      const characterName =
        event.detail &&
        event.detail.name;


      if (!characterName) {
        return;
      }


      initializeCharacterCards(
        characterName
      )
      .catch(
        function (error) {

          console.error(
            "角色初始卡发放失败",
            error
          );

        }
      );

    }
  );


  /*
    --------------------------------------------------
    页面加载
    --------------------------------------------------
  */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      loadSavedDeck();

      renderDeck();

    }
  );

})();