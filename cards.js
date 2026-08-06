/*
  cards.js

  功能：

  1. 读取 cards.json
  2. 基本卡每种加入牌库2张
  3. 道具卡每种加入背包1张
  4. 道具卡可在牌库和背包之间移动
  5. 悬停显示卡牌描述
*/


(function(){

"use strict";


let cardDatabase = {};

let deckCards = [];

let itemCards = [];



window.cardDatabase =
  cardDatabase;



function loadCards(){


  fetch("cards.json")

  .then(
    response =>
      response.json()
  )

  .then(
    data => {


      cardDatabase =
        data;


      window.cardDatabase =
        data;


      initCards();


      renderDeck();


      if(window.playerBag){

        window.playerBag.refresh();

      }


    }
  )

  .catch(
    error => {

      console.error(
        "cards.json读取失败",
        error
      );

    }
  );


}



function initCards(){


  deckCards = [];

  itemCards = [];


  Object.keys(cardDatabase)
  .forEach(
    function(name){


      const card =
        cardDatabase[name];


      if(
        card["类型"]
        ===
        "基本卡"
      ){

        deckCards.push(name);

        deckCards.push(name);


      }


      else if(
        card["类型"]
        ===
        "道具卡"
      ){

        itemCards.push(name);


      }


    }
  );


  saveCards();

}



function saveCards(){


  localStorage.setItem(
    "TH_CARD_DECK",
    JSON.stringify(deckCards)
  );


  /*
    道具卡实际由 bag.js 保存
  */

}



function loadSavedCards(){


  const data =
    localStorage.getItem(
      "TH_CARD_DECK"
    );


  if(data){

    deckCards =
      JSON.parse(data);

  }


}



function showInfo(name){


  const box =
    document.querySelector(
      "#cardinfo"
    );


  if(!box){
    return;
  }



  const card =
    cardDatabase[name];


  if(!card){

    box.textContent =
      name;

    return;

  }



  let html =
    `<h3>${name}</h3>`;



  html +=
    `<p>类型:${card["类型"]}</p>`;


  if(
    card["角色归属"]
  ){

    html +=
      `<p>角色:${card["角色归属"]}</p>`;

  }


  if(
    card["效果"]
    &&
    card["效果"]["描述"]
  ){

    html +=
      `<p>${card["效果"]["描述"]}</p>`;

  }


  box.innerHTML =
    html;


}



function createCardSlot(name){


  const button =
    document.createElement(
      "button"
    );


  button.className =
    "bag-slot";


  button.type =
    "button";


  const img =
    document.createElement(
      "img"
    );


  img.src =
    "null.png";


  img.alt =
    name;


  button.appendChild(img);



  button.addEventListener(
    "mouseenter",
    function(){

      showInfo(name);

    }
  );



  button.addEventListener(
    "click",
    function(){

      moveItem(
        name
      );

    }
  );



  return button;


}



function renderDeck(){


  const box =
    document.querySelector(
      "#bagcards"
    );


  if(!box){
    return;
  }



  box.innerHTML =
    "";



  deckCards.forEach(
    function(name){

      box.appendChild(
        createCardSlot(name)
      );

    }
  );


}



function moveItem(name){



  /*
    如果点击的是道具卡：
    牌库 -> 背包

    如果点击的是背包：
    背包 -> 牌库

  */


  const index =
    deckCards.indexOf(name);



  if(index !== -1){


    deckCards.splice(
      index,
      1
    );


    if(window.playerBag){

      window.playerBag.add(
        name
      );

    }


  }


  else if(
    window.playerBag
  ){


    window.playerBag.remove(
      name
    );


    deckCards.push(
      name
    );


  }



  saveCards();

  renderDeck();


}



window.moveCardToDeck =
  moveItem;



document.addEventListener(
  "DOMContentLoaded",
  function(){


    loadSavedCards();

    loadCards();


  }
);


})();