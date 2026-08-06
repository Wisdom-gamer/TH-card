/*
  bag.js

  功能：
  1. 根据玩家卡牌数据动态创建/删除 playerbag 内卡牌窗口
  2. 修改后保存 Local Storage
  3. 首次加载读取保存数据
  4. 鼠标悬停卡牌时显示 cardinfo
*/

(function () {
  "use strict";

  const STORAGE_KEY = "TH_CARD_PLAYER_BAG";

  let playerBagCards = [];

  function saveBag() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(playerBagCards)
    );
  }


  function loadBag() {
    const data = localStorage.getItem(STORAGE_KEY);

    if (data) {
      try {
        playerBagCards = JSON.parse(data);
      } catch (e) {
        playerBagCards = [];
      }
    }
  }


  function getCardInfo(name) {
    if (
      window.cardDatabase &&
      window.cardDatabase[name]
    ) {
      return window.cardDatabase[name];
    }

    return null;
  }


  function showCardInfo(name) {

    const box = document.querySelector("#cardinfo");

    if (!box) {
      return;
    }


    const card = getCardInfo(name);


    if (!card) {

      box.textContent = name;

      return;
    }


    let html = "";

    html += `<h3>${name}</h3>`;


    if (card["角色归属"]) {
      html +=
        `<p>角色:${card["角色归属"]}</p>`;
    }


    if (card["类型"]) {
      html +=
        `<p>类型:${card["类型"]}</p>`;
    }


    if (
      card["效果"] &&
      card["效果"]["描述"]
    ) {

      html +=
        `<p>${card["效果"]["描述"]}</p>`;
    }


    box.innerHTML = html;

  }



  function createBagSlot(cardName) {

    const button =
      document.createElement("button");


    button.className = "bag-slot";

    button.type = "button";

    button.dataset.card = cardName;


    const img =
      document.createElement("img");


    /*
      如果未来 cards.json 增加图片字段，
      可直接读取。

      当前没有图片时使用 null.png
    */

    let image =
      "null.png";


    const card =
      getCardInfo(cardName);


    if (
      card &&
      card["图片"]
    ) {
      image = card["图片"];
    }


    img.src = image;

    img.alt = cardName;


    button.appendChild(img);



    button.addEventListener(
      "mouseenter",
      function () {
        showCardInfo(cardName);
      }
    );


    button.addEventListener(
      "click",
      function () {

        if (
          window.moveCardToDeck
        ) {

          window.moveCardToDeck(cardName);

        }

      }
    );


    return button;

  }



    function renderBag() {

    // 背包项应该在 #bagitem 容器显示（#bagcards 是牌库）
    const container = document.querySelector("#bagitem");

    if (!container) {
      return;
    }

    container.innerHTML = "";

    playerBagCards.forEach(function(cardName) {
      container.appendChild(createBagSlot(cardName));
    });

  }



  function addCard(cardName) {

    playerBagCards.push(cardName);

    saveBag();

    renderBag();

  }



  function removeCard(cardName) {

    const index =
      playerBagCards.indexOf(cardName);


    if (index !== -1) {

      playerBagCards.splice(
        index,
        1
      );

    }


    saveBag();

    renderBag();

  }



  window.playerBag = {

    getCards:function(){

      return playerBagCards;

    },


    add:addCard,


    remove:removeCard,


    refresh:renderBag

  };



  document.addEventListener(
    "DOMContentLoaded",
    function(){

      loadBag();

      renderBag();

    }
  );


})();