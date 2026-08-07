/*
  bag.js

  功能：

  1. 管理装备栏 equip
  2. 管理背包栏 bagitem
  3. adventureequip 保存当前装备栏卡牌
  4. adventurebagitem 保存当前背包栏卡牌
  5. adventureequip / adventurebagitem 保存到 Local Storage
  6. 新获得卡牌时自动根据卡牌类型分配位置
  7. 玩家主动移动卡牌时不触发“新卡自动分配”
  8. 装备栏容量由 ME 决定
  9. 背包栏容量由 MB 决定
*/

(function () {
  "use strict";

  const BAG_STORAGE_KEY = "TH_CARD_PLAYER_BAG";
  const CHARACTER_STORAGE_KEY = "TH_CARD_CHARACTER";

  let equipmentCards = [];
  let bagItemCards = [];

  let limits = {
    ME: 0,
    MB: 0
  };


  /*
    --------------------------------------------------
    基础工具
    --------------------------------------------------
  */

  function toNonNegativeInteger(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
      return 0;
    }

    return Math.floor(number);
  }


  /*
    --------------------------------------------------
    同步全局变量
    --------------------------------------------------

    这两个变量就是你要求新增的：

    window.adventureequip
    window.adventurebagitem
  */

  function syncAdventureVariables() {
    window.adventureequip =
      equipmentCards.slice();

    window.adventurebagitem =
      bagItemCards.slice();
  }


  /*
    --------------------------------------------------
    保存 adventureequip / adventurebagitem
    --------------------------------------------------

    保存到：

    TH_CARD_CHARACTER

    同时保存旧版：

    TH_CARD_PLAYER_BAG
  */

  function saveCharacterAdventureCards() {
    let characterState = {};

    const savedCharacter =
      localStorage.getItem(
        CHARACTER_STORAGE_KEY
      );

    if (savedCharacter) {
      try {
        const parsed =
          JSON.parse(savedCharacter);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          characterState = parsed;
        }

      } catch (error) {
        console.warn(
          "角色存档读取失败，重新创建角色卡牌数据",
          error
        );
      }
    }

    characterState.adventureequip =
      equipmentCards.slice();

    characterState.adventurebagitem =
      bagItemCards.slice();

    localStorage.setItem(
      CHARACTER_STORAGE_KEY,
      JSON.stringify(characterState)
    );
  }


  /*
    --------------------------------------------------
    保存背包
    --------------------------------------------------
  */

  function saveBag() {
    const data = {
      equip: equipmentCards.slice(),
      bagitem: bagItemCards.slice()
    };

    localStorage.setItem(
      BAG_STORAGE_KEY,
      JSON.stringify(data)
    );

    syncAdventureVariables();

    saveCharacterAdventureCards();
  }


  /*
    --------------------------------------------------
    读取角色容量
    --------------------------------------------------
  */

  function loadLimitsFromCharacter() {
    const savedCharacter =
      localStorage.getItem(
        CHARACTER_STORAGE_KEY
      );

    if (!savedCharacter) {
      return;
    }

    try {
      const data =
        JSON.parse(savedCharacter);

      if (
        data &&
        typeof data === "object"
      ) {
        setLimits(
          data.ME,
          data.MB
        );
      }

    } catch (error) {
      console.warn(
        "角色容量数据读取失败",
        error
      );
    }
  }


  /*
    --------------------------------------------------
    设置容量

    注意：

    这里只设置容量，
    不会因为容量改变而自动移动已有卡牌。
    --------------------------------------------------
  */

  function setLimits(me, mb) {
    limits.ME =
      toNonNegativeInteger(me);

    limits.MB =
      toNonNegativeInteger(mb);
  }


  /*
    --------------------------------------------------
    从 Local Storage 读取装备和背包
    --------------------------------------------------
  */

  function loadBag() {
    equipmentCards = [];
    bagItemCards = [];

    let loadedFromBagStorage = false;

    /*
      先读取旧的 TH_CARD_PLAYER_BAG
    */

    const savedBag =
      localStorage.getItem(
        BAG_STORAGE_KEY
      );

    if (savedBag) {
      try {
        const data =
          JSON.parse(savedBag);

        /*
          兼容旧版：

          TH_CARD_PLAYER_BAG
          直接保存数组
        */

        if (Array.isArray(data)) {
          bagItemCards =
            data.slice();

          loadedFromBagStorage = true;
        }

        /*
          新版：

          {
            equip: [],
            bagitem: []
          }
        */

        else if (
          data &&
          typeof data === "object"
        ) {
          if (
            Array.isArray(data.equip)
          ) {
            equipmentCards =
              data.equip.slice();
          }

          if (
            Array.isArray(data.bagitem)
          ) {
            bagItemCards =
              data.bagitem.slice();
          }

          loadedFromBagStorage = true;
        }

      } catch (error) {
        console.warn(
          "TH_CARD_PLAYER_BAG 读取失败",
          error
        );
      }
    }


    /*
      ------------------------------------------------
      从 TH_CARD_CHARACTER 读取 adventureequip /
      adventurebagitem

      如果存在这两个字段，则它们作为角色当前
      装备和背包的最终状态。
      ------------------------------------------------
    */

    const savedCharacter =
      localStorage.getItem(
        CHARACTER_STORAGE_KEY
      );

    if (savedCharacter) {
      try {
        const data =
          JSON.parse(savedCharacter);

        if (
          data &&
          typeof data === "object"
        ) {

          if (
            Array.isArray(
              data.adventureequip
            )
          ) {
            equipmentCards =
              data.adventureequip.slice();
          }

          if (
            Array.isArray(
              data.adventurebagitem
            )
          ) {
            bagItemCards =
              data.adventurebagitem.slice();
          }

          /*
            兼容没有 adventureequip /
            adventurebagitem 的旧角色存档
          */

          if (
            !Array.isArray(
              data.adventureequip
            ) &&
            !loadedFromBagStorage
          ) {
            equipmentCards = [];
          }

          if (
            !Array.isArray(
              data.adventurebagitem
            ) &&
            !loadedFromBagStorage
          ) {
            bagItemCards = [];
          }
        }

      } catch (error) {
        console.warn(
          "TH_CARD_CHARACTER 读取失败",
          error
        );
      }
    }


    /*
      恢复 ME / MB
    */

    loadLimitsFromCharacter();


    /*
      同步全局变量
    */

    syncAdventureVariables();
  }


  /*
    --------------------------------------------------
    读取卡牌信息
    --------------------------------------------------
  */

  function getCardInfo(cardName) {
    if (
      window.cardDatabase &&
      window.cardDatabase[cardName]
    ) {
      return window.cardDatabase[cardName];
    }

    return null;
  }


  /*
    --------------------------------------------------
    判断卡牌应该进入哪个区域
    --------------------------------------------------

    返回：

    equip
    bagitem
    deck
    --------------------------------------------------
  */

  function getCardDestination(cardName) {
    const card =
      getCardInfo(cardName);

    const type =
      card &&
      typeof card["类型"] === "string"
        ? card["类型"].trim()
        : "";

    /*
      装备卡
    */

    if (
      type === "装备卡" ||
      type === "装备"
    ) {
      return "equip";
    }


    /*
      道具卡 / 物品卡
    */

    if (
      type === "道具卡" ||
      type === "物品卡" ||
      type === "道具" ||
      type === "物品"
    ) {
      return "bagitem";
    }


    /*
      其他类型进入牌库
    */

    return "deck";
  }


  /*
    --------------------------------------------------
    HTML 转义
    --------------------------------------------------
  */

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /*
    --------------------------------------------------
    显示卡牌信息
    --------------------------------------------------
  */

  function showCardInfo(cardName) {
    const box =
      document.querySelector(
        "#cardinfo-content"
      );

    if (!box) {
      return;
    }

    const card =
      getCardInfo(cardName);

    if (!card) {
      box.textContent =
        cardName;

      return;
    }

    let html =
      `<h3>${escapeHtml(cardName)}</h3>`;


    if (card["角色归属"]) {
      html +=
        `<p>角色：${escapeHtml(
          card["角色归属"]
        )}</p>`;
    }


    if (card["类型"]) {
      html +=
        `<p>类型：${escapeHtml(
          card["类型"]
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
    创建装备 / 背包卡牌按钮
    --------------------------------------------------
  */

  function createBagSlot(
    cardName,
    source
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
      getCardInfo(cardName);


    button.className =
      "bag-slot";

    button.type =
      "button";

    button.dataset.card =
      cardName;

    button.dataset.source =
      source;

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


    button.appendChild(img);


    /*
      鼠标悬停
    */

    button.addEventListener(
      "mouseenter",
      function () {
        showCardInfo(cardName);
      }
    );


    /*
      点击：

      equip → 牌库
      bagitem → 牌库
    */

    button.addEventListener(
      "click",
      function () {

        if (
          typeof window.moveCardToDeck ===
          "function"
        ) {

          window.moveCardToDeck(
            cardName,
            source
          );

        }

      }
    );


    return button;
  }


  /*
    --------------------------------------------------
    渲染指定容器
    --------------------------------------------------
  */

  function renderContainer(
    selector,
    cards,
    source
  ) {
    const container =
      document.querySelector(
        selector
      );

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    cards.forEach(
      function (cardName) {

        container.appendChild(
          createBagSlot(
            cardName,
            source
          )
        );

      }
    );
  }


  /*
    --------------------------------------------------
    渲染装备栏和背包栏
    --------------------------------------------------
  */

  function renderBag() {

    renderContainer(
      "#equip",
      equipmentCards,
      "equip"
    );


    renderContainer(
      "#bagitem",
      bagItemCards,
      "bagitem"
    );


    syncAdventureVariables();
  }


  /*
    --------------------------------------------------
    将卡牌直接加入牌库
    --------------------------------------------------
  */

  function sendToDeck(cardName) {

    if (
      window.playerDeck &&
      typeof window.playerDeck.addDirect ===
      "function"
    ) {

      window.playerDeck.addDirect(
        cardName
      );

      return;
    }


    /*
      cards.js 尚未建立 playerDeck 时，
      先进入等待队列
    */

    window.TH_CARD_PENDING_DECK =
      window.TH_CARD_PENDING_DECK ||
      [];

    window.TH_CARD_PENDING_DECK.push(
      cardName
    );
  }


  /*
    --------------------------------------------------
    新获得卡牌
    --------------------------------------------------

    只有这里执行自动分配：

    装备卡：
      equip 未满 → equip
      equip 已满 → deck

    道具卡：
      bagitem 未满 → bagitem
      bagitem 已满 → deck

    其他：
      deck
    --------------------------------------------------
  */

  function addNewCard(cardName) {

    const destination =
      getCardDestination(
        cardName
      );


    let actualDestination =
      "deck";


    if (
      destination === "equip"
    ) {

      if (
        equipmentCards.length <
        limits.ME
      ) {

        equipmentCards.push(
          cardName
        );

        actualDestination =
          "equip";

      } else {

        sendToDeck(
          cardName
        );

      }

    }


    else if (
      destination === "bagitem"
    ) {

      if (
        bagItemCards.length <
        limits.MB
      ) {

        bagItemCards.push(
          cardName
        );

        actualDestination =
          "bagitem";

      } else {

        sendToDeck(
          cardName
        );

      }

    }


    else {

      sendToDeck(
        cardName
      );

    }


    /*
      保存并刷新

      注意：

      这里只会执行一次“获得新卡”的自动分配。
      save / render 不会再次移动卡牌。
    */

    saveBag();
    renderBag();


    return actualDestination;
  }


  /*
    --------------------------------------------------
    牌库 → 专用栏

    这是玩家主动移动已有卡牌。

    不执行“新卡自动分配”。

    只移动到该卡牌对应的专用栏。
    如果专用栏已满，则保持在牌库。
    --------------------------------------------------
  */

  function moveFromDeck(cardName) {

    const destination =
      getCardDestination(
        cardName
      );


    /*
      装备卡
    */

    if (
      destination === "equip"
    ) {

      if (
        equipmentCards.length >=
        limits.ME
      ) {
        return false;
      }

      equipmentCards.push(
        cardName
      );

      saveBag();
      renderBag();

      return true;
    }


    /*
      道具卡
    */

    if (
      destination === "bagitem"
    ) {

      if (
        bagItemCards.length >=
        limits.MB
      ) {
        return false;
      }

      bagItemCards.push(
        cardName
      );

      saveBag();
      renderBag();

      return true;
    }


    /*
      基本卡及其他卡牌
      不允许移动到专用栏
    */

    return false;
  }


  /*
    --------------------------------------------------
    从指定专用栏删除一张卡
    --------------------------------------------------

    source 必须是：

    equip
    bagitem
    --------------------------------------------------
  */

  function takeCard(
    cardName,
    source
  ) {

    let cards = null;


    if (
      source === "equip"
    ) {

      cards =
        equipmentCards;

    }

    else if (
      source === "bagitem"
    ) {

      cards =
        bagItemCards;

    }


    if (!cards) {
      return false;
    }


    /*
      只删除一张相同卡名的卡。
      解决多张相同卡牌移动时全部消失的问题。
    */

    const index =
      cards.indexOf(
        cardName
      );


    if (index === -1) {
      return false;
    }


    cards.splice(
      index,
      1
    );


    saveBag();
    renderBag();


    return true;
  }


  /*
    --------------------------------------------------
    删除卡牌
    --------------------------------------------------
  */

  function removeCard(
    cardName,
    source
  ) {

    if (source) {
      return takeCard(
        cardName,
        source
      );
    }


    return (
      takeCard(
        cardName,
        "equip"
      ) ||
      takeCard(
        cardName,
        "bagitem"
      )
    );
  }


  /*
    --------------------------------------------------
    根据 adventureequip /
    adventurebagitem 恢复状态

    character.js 恢复角色时调用。
    --------------------------------------------------
  */

  function restoreState(
    equip,
    bagitem
  ) {

    equipmentCards =
      Array.isArray(equip)
        ? equip.slice()
        : [];


    bagItemCards =
      Array.isArray(bagitem)
        ? bagitem.slice()
        : [];


    syncAdventureVariables();

    saveBag();
    renderBag();
  }


  /*
    --------------------------------------------------
    重置背包

    新角色开始游戏时调用。
    --------------------------------------------------
  */

  function resetBag() {

    equipmentCards = [];
    bagItemCards = [];


    syncAdventureVariables();

    saveBag();
    renderBag();
  }


  /*
    --------------------------------------------------
    对外接口
    --------------------------------------------------
  */

  window.playerBag = {

    /*
      兼容旧代码：

      getCards()
      返回道具栏
    */

    getCards: function () {
      return bagItemCards.slice();
    },


    /*
      返回完整状态
    */

    getState: function () {

      return {
        equip:
          equipmentCards.slice(),

        bagitem:
          bagItemCards.slice(),

        adventureequip:
          equipmentCards.slice(),

        adventurebagitem:
          bagItemCards.slice(),

        ME:
          limits.ME,

        MB:
          limits.MB
      };

    },


    /*
      设置专用槽位容量
    */

    setLimits:
      setLimits,


    /*
      新获得卡牌

      自动分配
    */

    add:
      addNewCard,

    addNew:
      addNewCard,


    /*
      牌库 → 专用栏
    */

    moveFromDeck:
      moveFromDeck,


    /*
      专用栏 → 牌库
    */

    take:
      takeCard,

    remove:
      removeCard,


    /*
      从角色存档恢复
    */

    restoreState:
      restoreState,


    /*
      清空
    */

    reset:
      resetBag,


    /*
      刷新显示
    */

    refresh:
      renderBag

  };


  /*
    --------------------------------------------------
    DOM 加载后读取存档
    --------------------------------------------------
  */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      loadBag();

      renderBag();

    }
  );

})();