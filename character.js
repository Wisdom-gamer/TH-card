/*
  character.js

  从 pc.json 建立角色选择界面。
  左右按钮循环切换角色；点击角色名确认选择并开始冒险。
*/

(function () {
  "use strict";

  const CHARACTER_STORAGE_KEY = "TH_CARD_CHARACTER";

  let characters = {};
  let characterNames = [];
  let currentIndex = 0;

  function getElement(selector) {
    return document.querySelector(selector);
  }

  function characterImagePath(characterName) {
    const fileName = htmlToPlainText(characterName).trim();
    return `/images/character/${encodeURIComponent(fileName)}.png`;
  }

  function htmlToPlainText(html) {
    const temporary = document.createElement("div");
    temporary.innerHTML = html;
    return temporary.textContent || temporary.innerText || "角色";
  }

  function setSelectorEnabled(enabled) {
    ["#character-prev", "#character-next", "#character-name"]
      .forEach(function (selector) {
        const element = getElement(selector);

        if (element) {
          element.disabled = !enabled;
        }
      });
  }

  function renderCharacter() {
    if (characterNames.length === 0) {
      return;
    }

    const characterName = characterNames[currentIndex];
    const image = getElement("#character-image");
    const nameButton = getElement("#character-name");

    if (image) {
      delete image.dataset.fallbackUsed;
      image.src = characterImagePath(characterName);
      image.alt = htmlToPlainText(characterName);
    }

    if (nameButton) {
      nameButton.innerHTML = characterName;
      nameButton.setAttribute(
        "aria-label",
        `选择角色：${htmlToPlainText(characterName)}`
      );
    }
  }

  function changeCharacter(offset) {
    if (characterNames.length === 0) {
      return;
    }

    currentIndex = (
      currentIndex + offset + characterNames.length
    ) % characterNames.length;

    renderCharacter();
  }

  function saveCharacterState(characterName, character) {
    const hp = Number(character.HP) || 0;
    const mp = Number(character.MP) || 0;
    const me = Math.max(0, Math.floor(Number(character.ME) || 0));
    const mb = Math.max(0, Math.floor(Number(character.MB) || 0));

    window.selectedCharacter = characterName;
    window.adventurehp = hp;
    window.adventuremp = mp;
    window.adventurexp = 0;
    window.adventuregold = 25;

    const state = {
      name: characterName,
      HP: hp,
      MP: mp,
      ME: me,
      MB: mb,
      adventurehp: window.adventurehp,
      adventuremp: window.adventuremp,
      adventurexp: window.adventurexp,
      adventuregold: window.adventuregold
    };

    localStorage.setItem(
      CHARACTER_STORAGE_KEY,
      JSON.stringify(state)
    );

    return state;
  }

  function updateAdventureView(characterName, state) {
    const values = {
      adventurehp: state.adventurehp,
      adventuremp: state.adventuremp,
      adventurexp: state.adventurexp,
      adventuregold: state.adventuregold
    };

    Object.entries(values).forEach(function (entry) {
      const element = document.getElementById(entry[0]);

      if (element) {
        element.textContent = entry[1];
      }
    });

    const avatar = getElement("#adventure-character-image");

    if (avatar) {
      avatar.src = characterImagePath(characterName);
      avatar.alt = htmlToPlainText(characterName);
    }
  }

  function showAdventure() {
    const selector = getElement("#character-select");
    const adventure = getElement("#adventure");

    if (selector) {
      selector.classList.add("is-hidden");
      selector.setAttribute("aria-hidden", "true");
    }

    if (adventure) {
      adventure.classList.add("is-active");
      adventure.setAttribute("aria-hidden", "false");
    }
  }

  function selectCurrentCharacter() {
    if (characterNames.length === 0) {
      return;
    }

    const characterName = characterNames[currentIndex];
    const character = characters[characterName];
    const state = saveCharacterState(characterName, character);

    if (window.playerBag) {
      window.playerBag.setLimits(state.ME, state.MB);
    }

    updateAdventureView(characterName, state);
    showAdventure();

    document.dispatchEvent(
      new CustomEvent("th-card:character-selected", {
        detail: {
          name: characterName,
          character: character,
          state: state
        }
      })
    );
  }
function restoreSavedCharacter() {

  const saved =
    localStorage.getItem(
      CHARACTER_STORAGE_KEY
    );


  /*
    没有角色存档
    → 正常显示角色选择
  */

  if (!saved) {

    return false;

  }


  try {

    const savedState =
      JSON.parse(
        saved
      );


    /*
      存档无效
    */

    if (
      !savedState ||
      typeof savedState !==
      "object" ||
      !savedState.name
    ) {

      return false;

    }


    /*
      恢复装备栏

      兼容旧存档：

      如果不存在 adventureequip，
      就使用空数组。
    */

    const adventureequip =
      Array.isArray(
        savedState.adventureequip
      )

        ? savedState.adventureequip.slice()

        : [];


    /*
      恢复道具栏
    */

    const adventurebagitem =
      Array.isArray(
        savedState.adventurebagitem
      )

        ? savedState.adventurebagitem.slice()

        : [];


    const state = {

      name:
        savedState.name,

      HP:
        Number(
          savedState.HP
        ) || 0,

      MP:
        Number(
          savedState.MP
        ) || 0,

      ME:
        Math.max(
          0,
          Math.floor(
            Number(
              savedState.ME
            ) || 0
          )
        ),

      MB:
        Math.max(
          0,
          Math.floor(
            Number(
              savedState.MB
            ) || 0
          )
        ),

      adventurehp:
        Number(
          savedState.adventurehp
        ) || 0,

      adventuremp:
        Number(
          savedState.adventuremp
        ) || 0,

      adventurexp:
        Number(
          savedState.adventurexp
        ) || 0,

      adventuregold:
        Number(
          savedState.adventuregold
        ) || 0,

      adventureequip:
        adventureequip,

      adventurebagitem:
        adventurebagitem

    };


    /*
      恢复基本变量
    */

    window.selectedCharacter = state.name;
    window.adventurehp = state.adventurehp;
    window.adventuremp = state.adventuremp;
    window.adventurexp = state.adventurexp;
    window.adventuregold = state.adventuregold;


    /*
      恢复新增变量
    */

    window.adventureequip = state.adventureequip.slice();


    window.adventurebagitem = state.adventurebagitem.slice();

    if (
      window.playerBag
    ) {

      window.playerBag.setLimits(
        state.ME,
        state.MB
      );
      if (
        typeof window.playerBag.restoreState ===
        "function"
      ) {
        window.playerBag.restoreState(
          state.adventureequip,
          state.adventurebagitem
        );
      }
    }
    updateAdventureView(
      state.name,
      state
    );
    showAdventure();
    return true;
  } catch (error) {
    console.warn(
      "已保存的角色状态无法恢复，将进入角色选择",
      error
    );


    return false;

  }

}
  async function loadCharacters() {
    const response = await fetch("pc.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`pc.json 请求失败：HTTP ${response.status}`);
    }

    characters = await response.json();
    characterNames = Object.keys(characters);

    if (characterNames.length === 0) {
      throw new Error("pc.json 中没有可选择的角色");
    }

    const saved = localStorage.getItem(CHARACTER_STORAGE_KEY);

    if (saved) {
      try {
        const savedState = JSON.parse(saved);
        const savedIndex = characterNames.indexOf(savedState.name);

        if (savedIndex !== -1) {
          currentIndex = savedIndex;
        }
      } catch (error) {
        console.warn("已保存的角色信息无法读取", error);
      }
    }

    renderCharacter();
    setSelectorEnabled(true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const previousButton = getElement("#character-prev");
    const nextButton = getElement("#character-next");
    const nameButton = getElement("#character-name");
    const image = getElement("#character-image");

    setSelectorEnabled(false);

    if (previousButton) {
      previousButton.addEventListener("click", function () {
        changeCharacter(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        changeCharacter(1);
      });
    }

    if (nameButton) {
      nameButton.addEventListener("click", selectCurrentCharacter);
    }

    if (image) {
      image.addEventListener("error", function () {
        if (!image.dataset.fallbackUsed) {
          image.dataset.fallbackUsed = "true";
          image.src = "null.png";
        }
      });

      image.addEventListener("load", function () {
        if (image.src.endsWith("null.png")) {
          return;
        }

        delete image.dataset.fallbackUsed;
      });
    }

if (restoreSavedCharacter()) {
  return;
}

loadCharacters().catch(function (error) {
  console.error("角色选择界面初始化失败", error);

  if (nameButton) {
    nameButton.textContent = "角色数据读取失败";
  }
});
  });
})();
/* 接口 window.giveCardToPlayer("卡牌名", 数量); */
