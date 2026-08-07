(function () {
  "use strict";

  const DEFAULT_LEVEL = "L14";
  const STATE_KEY = "TH_CARD_ADVENTURE_STATE";
  const STATS_KEY = "TH_CARD_ADVENTURE_STATS";
  const HAND_LIMIT = 5;

  let cardDB = {};
  let adventureDB = {};
  let currentLevel = DEFAULT_LEVEL;
  let deck = [];
  let hand = [];
  let activeIndex = -1;
  let handSlots = [];
  let activated = false;

  let stats = {
    HP: 0,
    maxHP: 0,
    MP: 0,
    maxMP: 0,
    XP: 0,
    Gold: 0
  };
  function formatStat(current, max) {
    const cur = Number.isFinite(Number(current)) ? Math.floor(Number(current)) : 0;
    const cap = Number.isFinite(Number(max)) ? Math.floor(Number(max)) : null;
    return cap === null ? String(cur) : `${cur}/${cap}`;
  }

  function syncMaxFromGlobals() {
    const globalMaxHP = Number(window.maxHP);
    const globalMaxMP = Number(window.maxMP);

    if (Number.isFinite(globalMaxHP) && globalMaxHP > 0) {
      stats.maxHP = globalMaxHP;
    } else if (!Number.isFinite(stats.maxHP) || stats.maxHP <= 0) {
      stats.maxHP = stats.HP;
    }

    if (Number.isFinite(globalMaxMP) && globalMaxMP > 0) {
      stats.maxMP = globalMaxMP;
    } else if (!Number.isFinite(stats.maxMP) || stats.maxMP <= 0) {
      stats.maxMP = stats.MP;
    }

    if (stats.HP > stats.maxHP) stats.HP = stats.maxHP;
    if (stats.MP > stats.maxMP) stats.MP = stats.maxMP;
  }

  function setStat(key, value) {
    const next = Math.floor(Number(value) || 0);

    if (key === "HP") {
      stats.HP = next;
      if (Number.isFinite(stats.maxHP) && stats.maxHP > 0 && stats.HP > stats.maxHP) {
        stats.HP = stats.maxHP;
      }
      return;
    }

    if (key === "MP") {
      stats.MP = next;
      if (Number.isFinite(stats.maxMP) && stats.maxMP > 0 && stats.MP > stats.maxMP) {
        stats.MP = stats.maxMP;
      }
      return;
    }

    stats[key] = next;
  }

  function applyEffect(effect) {
    if (!isObject(effect)) {
      return;
    }

    if (effect.HP !== undefined) {
      setStat("HP", stats.HP + (Number(effect.HP) || 0));
    }

    if (effect.MP !== undefined) {
      setStat("MP", stats.MP + (Number(effect.MP) || 0));
    }

    if (effect.XP !== undefined) {
      setStat("XP", stats.XP + (Number(effect.XP) || 0));
    }

    if (effect.Gold !== undefined) {
      setStat("Gold", stats.Gold + (Number(effect.Gold) || 0));
    }

    syncStatsToDom();
    saveStats();
    document.dispatchEvent(new Event("th-card:stats-changed"));
  }

  function setCardInfoActionVisible(visible) {
    const box = $("#cardinfo-button");
    if (box) {
      box.hidden = !visible;
    }
  }

  window.setCardInfoActionVisible = setCardInfoActionVisible;
  function $(selector) {
    return document.querySelector(selector);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function toInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }

  function sanitizeJsonText(text) {
    let result = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i += 1) {
      const current = text[i];
      const next = text[i + 1];

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
        while (i < text.length && text[i] !== "\n") {
          i += 1;
        }
        result += "\n";
        continue;
      }

      if (current === "/" && next === "*") {
        i += 2;
        while (
          i < text.length &&
          !(text[i] === "*" && text[i + 1] === "/")
        ) {
          if (text[i] === "\n") {
            result += "\n";
          }
          i += 1;
        }
        i += 1;
        continue;
      }

      result += current;
    }

    return result.replace(/,\s*([}\]])/g, "$1");
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${path} 请求失败：HTTP ${response.status}`);
    }

    const text = await response.text();
    return JSON.parse(sanitizeJsonText(text));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function getCardData(name) {
    return cardDB[name] || null;
  }

  function getCardImage(name) {
    const card = getCardData(name);
    return card && card.ID ? `images/adventure/${card.ID}.png` : "null.png";
  }

  function normalizeRemaining(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (value === "void") {
      return 0;
    }

    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }

  function getDefaultRemaining(name) {
    const card = getCardData(name);
    if (!card) {
      return null;
    }

    if (card.action === "战斗") {
      return null;
    }

    if (isObject(card.action)) {
      const n = Number(card.action.actionnum);
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 1;
    }

    return null;
  }

  function cloneHandEntry(entry) {
    if (typeof entry === "string") {
      return {
        name: entry,
        remaining: getDefaultRemaining(entry)
      };
    }

    if (!isObject(entry)) {
      return null;
    }

    const name = String(entry.name || entry.card || "").trim();
    if (!name) {
      return null;
    }

    const remaining =
      entry.remaining === undefined
        ? getDefaultRemaining(name)
        : normalizeRemaining(entry.remaining);

    return {
      name: name,
      remaining: remaining === null ? getDefaultRemaining(name) : remaining
    };
  }

  function buildCardsFromGroup(groupData) {
    if (!isObject(groupData)) {
      return [];
    }

    const type = String(groupData.type || groupData.trpe || "always").trim();
    const result = [];

    if (type === "random") {
      const maxNumber = Math.max(0, toInt(groupData.maxnumber, 0));
      const pool = [];

      for (const [cardName, count] of Object.entries(groupData)) {
        if (cardName === "type" || cardName === "trpe" || cardName === "maxnumber") {
          continue;
        }

        const n = Math.max(0, toInt(count, 0));
        for (let i = 0; i < n; i += 1) {
          pool.push(cardName);
        }
      }

      shuffle(pool);
      result.push(...pool.slice(0, maxNumber));
      return result;
    }

    for (const [cardName, count] of Object.entries(groupData)) {
      if (cardName === "type" || cardName === "trpe" || cardName === "maxnumber") {
        continue;
      }

      const n = Math.max(0, toInt(count, 0));
      for (let i = 0; i < n; i += 1) {
        result.push(cardName);
      }
    }

    return result;
  }

  function buildDeckFromLevel(levelKey) {
    const level = adventureDB[levelKey];
    if (!isObject(level)) {
      return [];
    }

    let cards = [];

    for (const groupData of Object.values(level)) {
      cards = cards.concat(buildCardsFromGroup(groupData));
    }

    shuffle(cards);
    return cards;
  }

  function addGroupToBottom(levelKey) {
    const level = adventureDB[levelKey];
    if (!isObject(level)) {
      return false;
    }

    const cards = [];

    for (const groupData of Object.values(level)) {
      cards.push(...buildCardsFromGroup(groupData));
    }

    if (!cards.length) {
      return false;
    }

    deck.unshift(...cards);
    return true;
  }

  function syncStatsToDom() {
    syncMaxFromGlobals();

    const hp = $("#adventurehp");
    const mp = $("#adventuremp");
    const xp = $("#adventurexp");
    const gold = $("#adventuregold");

    if (hp) hp.textContent = formatStat(stats.HP, stats.maxHP);
    if (mp) mp.textContent = formatStat(stats.MP, stats.maxMP);
    if (xp) xp.textContent = String(stats.XP);
    if (gold) gold.textContent = String(stats.Gold);

    window.adventurehp = stats.HP;
    window.maxHP = stats.maxHP;
    window.adventuremp = stats.MP;
    window.maxMP = stats.maxMP;
    window.adventurexp = stats.XP;
    window.adventuregold = stats.Gold;
    window.adventureStats = { ...stats };

    document.dispatchEvent(new Event("th-card:stats-changed"));
  }

  function loadStats() {
    const saved = localStorage.getItem(STATS_KEY);

    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (isObject(data)) {
          for (const key of Object.keys(stats)) {
            if (Number.isFinite(Number(data[key]))) {
              stats[key] = Math.floor(Number(data[key]));
            }
          }
        }
      } catch (error) {
        console.warn("冒险数值读取失败", error);
      }
    }

    syncStatsToDom();
  }

  function saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function saveState() {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        levelKey: currentLevel,
        deck: deck.slice(),
        hand: hand.map((entry) => ({
          name: entry.name,
          remaining: entry.remaining
        }))
      })
    );

    window.adventurecardnum = deck.length;
  }

  function loadState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (!saved) {
      return false;
    }

    try {
      const data = JSON.parse(saved);

      if (!isObject(data)) {
        return false;
      }

      if (typeof data.levelKey === "string" && adventureDB[data.levelKey]) {
        currentLevel = data.levelKey;
      }

      if (Array.isArray(data.deck)) {
        deck = data.deck.map((x) => String(x).trim()).filter(Boolean);
      }

      if (Array.isArray(data.hand)) {
        hand = data.hand
          .map(cloneHandEntry)
          .filter(Boolean)
          .filter((entry) => entry.remaining === null || entry.remaining > 0);

        if (hand.length > HAND_LIMIT) {
          hand = hand.slice(0, HAND_LIMIT);
        }
      }

      return true;
    } catch (error) {
      console.warn("冒险存档读取失败", error);
      return false;
    }
  }

  function updateCounter() {
    const counter = $("#adventurecardnum");
    if (counter) {
      counter.textContent = String(deck.length);
    }
    window.adventurecardnum = deck.length;
  }

  function clearInfo() {
    const content = $("#cardinfo-content");
    const actions = $("#cardinfo-button");

    if (content) {
      content.innerHTML = "";
    }

    if (actions) {
      actions.innerHTML = "";
      actions.hidden = true;
    }

    activeIndex = -1;
  }

  function getAvailableActions(cardState, cardData) {
    if (!cardData) {
      return [];
    }

    if (cardData.action === "战斗") {
      return [
        {
          name: "战斗",
          kind: "fight",
          cost: 0,
          detail: null,
          useCount: null
        }
      ];
    }

    if (!isObject(cardData.action)) {
      return [];
    }

    const actions = [];
    const totalRemaining = Number.isFinite(cardState.remaining) ? cardState.remaining : Infinity;

    for (const [name, detail] of Object.entries(cardData.action)) {
      if (name === "actionnum") {
        continue;
      }

      const cost =
        isObject(detail) && detail.actionnum !== undefined
          ? Math.max(0, Math.floor(Number(detail.actionnum) || 0))
          : 1;

      const useCount =
        cost > 0 && Number.isFinite(totalRemaining)
          ? Math.floor(totalRemaining / cost)
          : null;

      if (cost === 0 || totalRemaining >= cost) {
        actions.push({
          name,
          kind: "normal",
          cost,
          detail,
          useCount: useCount
        });
      }
    }

    return actions;
  }

  function renderActions(cardState, cardData) {
    const box = $("#cardinfo-button");
    if (!box) {
      return;
    }

    box.innerHTML = "";

    const actions = getAvailableActions(cardState, cardData);

    if (!actions.length) {
      box.hidden = true;
      return;
    }

    box.hidden = false;

    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cardinfo-action";
      button.textContent =
        action.useCount && action.useCount > 1
          ? `${action.name} ×${action.useCount}`
          : action.name;

      button.addEventListener("click", async function () {
        await runAction(cardState, action);
      });

      box.appendChild(button);
    }
  }

  function showCardInfo(index) {
    const content = $("#cardinfo-content");
    const cardState = hand[index];

    activeIndex = index;

    if (!content || !cardState) {
      clearInfo();
      return;
    }

    const cardData = getCardData(cardState.name);

    if (typeof window.setCardInfoActionVisible === "function") {
      window.setCardInfoActionVisible(true);
    }

    if (!cardData) {
      content.innerHTML = `<h3>${escapeHtml(cardState.name)}</h3>`;
      renderActions(cardState, null);
      return;
    }

    let html = `<h3>${escapeHtml(cardState.name)}</h3>`;

    if (cardData.display) {
      html += `<p>${escapeHtml(cardData.display)}</p>`;
    }

    content.innerHTML = html;
    renderActions(cardState, cardData);
  }
  function bindHandSlots() {
    handSlots = Array.from($("#adventure-hand")?.querySelectorAll(".card-slot") || []);

    handSlots.forEach((button, index) => {
      button.addEventListener("mouseenter", function () {
        if (button.classList.contains("is-empty")) {
          return;
        }
        showCardInfo(index);
      });

      button.addEventListener("focus", function () {
        if (button.classList.contains("is-empty")) {
          return;
        }
        showCardInfo(index);
      });

      button.addEventListener("click", function () {
        if (button.classList.contains("is-empty")) {
          return;
        }
        showCardInfo(index);
      });
    });
  }
  function removeHandCardByIndex(index) {
    if (index < 0 || index >= hand.length) {
      return false;
    }

    hand.splice(index, 1);

    if (activeIndex === index) {
      clearInfo();
    } else if (activeIndex > index) {
      activeIndex -= 1;
    }

    return true;
  }

  function removeHandCardByName(name, preferredIndex) {
    if (
      Number.isInteger(preferredIndex) &&
      preferredIndex >= 0 &&
      preferredIndex < hand.length &&
      hand[preferredIndex] &&
      hand[preferredIndex].name === name
    ) {
      return removeHandCardByIndex(preferredIndex);
    }

    const index = hand.findIndex((entry) => entry.name === name);
    if (index === -1) {
      return false;
    }

    return removeHandCardByIndex(index);
  }

  function renderHand() {
    if (!handSlots.length) {
      return;
    }

    handSlots.forEach((button, index) => {
      const entry = hand[index];
      const img = button.querySelector("img");

      button.dataset.index = String(index);

      if (entry) {
        button.classList.remove("is-empty");
        button.disabled = false;
        button.dataset.card = entry.name;
        button.setAttribute("aria-label", entry.name);

        if (img) {
          img.src = getCardImage(entry.name);
          img.alt = entry.name;
        }
      } else {
        button.classList.add("is-empty");
        button.disabled = true;
        button.removeAttribute("data-card");
        button.setAttribute("aria-label", `空卡位${index + 1}`);

        if (img) {
          img.src = "null.png";
          img.alt = "empty card";
        }

        if (activeIndex === index) {
          clearInfo();
        }
      }
    });

    updateCounter();
  }

  function fillHandToFive() {
    let changed = false;

    while (hand.length < HAND_LIMIT && deck.length > 0) {
      const name = deck.pop();
      hand.push({
        name,
        remaining: getDefaultRemaining(name)
      });
      changed = true;
    }

    return changed;
  }

  function removeHandCardByIndex(index) {
    if (index < 0 || index >= hand.length) {
      return false;
    }

    hand.splice(index, 1);
    return true;
  }

  function removeHandCardByName(name, preferredIndex) {
    if (
      Number.isInteger(preferredIndex) &&
      preferredIndex >= 0 &&
      preferredIndex < hand.length &&
      hand[preferredIndex] &&
      hand[preferredIndex].name === name
    ) {
      return removeHandCardByIndex(preferredIndex);
    }

    const index = hand.findIndex((entry) => entry.name === name);
    if (index === -1) {
      return false;
    }

    return removeHandCardByIndex(index);
  }

  function applyEffect(effect) {
    if (!isObject(effect)) {
      return;
    }

    for (const [key, value] of Object.entries(effect)) {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        continue;
      }

      if (key === "HP") stats.HP += Math.floor(n);
      if (key === "MP") stats.MP += Math.floor(n);
      if (key === "XP") stats.XP += Math.floor(n);
      if (key === "Gold") stats.Gold += Math.floor(n);
    }

    syncStatsToDom();
    saveStats();
  }

  function normalizeActionCost(value) {
    if (value === "void") {
      return 0;
    }

    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 1;
  }

  function applyNormalAction(cardState, action) {
    if (!Number.isFinite(cardState.remaining)) {
      return;
    }

    if (action.cost > cardState.remaining) {
      return;
    }

    if (isObject(action.detail) && action.detail.effect) {
      applyEffect(action.detail.effect);
    }

    cardState.remaining = Math.max(0, cardState.remaining - action.cost);

    if (cardState.remaining === 0) {
      const index = hand.indexOf(cardState);
      if (index !== -1) {
        removeHandCardByIndex(index);
      }
    }
  }

  function extractOutcomeKeys(result) {
    const keys = new Set();

    if (result === true) {
      keys.add("win");
      return Array.from(keys);
    }

    if (result === false) {
      keys.add("lose");
      return Array.from(keys);
    }

    if (result === null || result === undefined) {
      return [];
    }

    if (
      typeof result === "string" ||
      typeof result === "number" ||
      typeof result === "boolean"
    ) {
      keys.add(String(result));
      return Array.from(keys);
    }

    if (Array.isArray(result)) {
      for (const value of result) {
        if (value !== null && value !== undefined) {
          keys.add(String(value));
        }
      }
      return Array.from(keys);
    }

    if (isObject(result)) {
      for (const [key, value] of Object.entries(result)) {
        if (value === true) {
          keys.add(key);
        }
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          keys.add(String(value));
        }
      }
    }

    return Array.from(keys);
  }

  function handleReaction(cardState, cardData, result) {
    if (!cardData || !isObject(cardData.reaction)) {
      return false;
    }

    const outcomes = extractOutcomeKeys(result);
    let changed = false;

    for (const outcome of outcomes) {
      const ops = cardData.reaction[outcome];
      if (!isObject(ops)) {
        continue;
      }

      if (ops.delete !== undefined) {
        const target = String(ops.delete);
        if (removeHandCardByName(target, hand.indexOf(cardState))) {
          changed = true;
        }
      }

      if (ops.addgroup !== undefined) {
        if (addGroupToBottom(String(ops.addgroup))) {
          changed = true;
        }
      }

      break;
    }

    return changed;
  }

  function syncAfterMutation(focusIndex) {
    fillHandToFive();
    saveState();
    renderHand();

    if (
      Number.isInteger(focusIndex) &&
      focusIndex >= 0 &&
      focusIndex < hand.length
    ) {
      showCardInfo(focusIndex);
      return;
    }

    if (activeIndex >= 0 && activeIndex < hand.length) {
      showCardInfo(activeIndex);
      return;
    }

    clearInfo();
  }

  async function runAction(cardState, action) {
    const index = hand.indexOf(cardState);
    if (index === -1) {
      return;
    }

    const cardData = getCardData(cardState.name);
    if (!cardData) {
      return;
    }

    if (action.kind === "normal") {
      applyNormalAction(cardState, action);
      syncAfterMutation(index);
      return;
    }

    if (action.kind === "fight") {
      const fightFn =
        typeof window.fightstart === "function"
          ? window.fightstart
          : window.fight && typeof window.fight.fightstart === "function"
            ? window.fight.fightstart
            : null;

      if (!fightFn) {
        console.warn("fightstart 不存在");
        return;
      }

      const result = await Promise.resolve(fightFn(cardData.ID));
      handleReaction(cardState, cardData, result);
      syncAfterMutation(index);
    }
  }

  function activateAdventureScene() {
    const adventure = $("#adventure");
    const characterSelect = $("#character-select");
    const gameArea = $(".game-area");

    if (characterSelect) {
      characterSelect.classList.add("is-hidden");
    }

    if (gameArea) {
      gameArea.classList.remove("is-active");
    }

    if (adventure) {
      adventure.classList.add("is-active");
    }

    activated = true;
  }

  function resetAdventure() {
    deck = buildDeckFromLevel(currentLevel);
    hand = [];
    fillHandToFive();
    saveState();
    renderHand();
    clearInfo();
  }

  function setLevel(levelKey) {
    if (!adventureDB[levelKey]) {
      return false;
    }

    currentLevel = levelKey;
    resetAdventure();
    return true;
  }

  async function boot() {
    try {
      const [cardsJson, adventureJson] = await Promise.all([
        fetchJson("adventurecards.json"),
        fetchJson("adventure.json")
      ]);

      cardDB = cardsJson;
      adventureDB = adventureJson;

      window.adventureCardsDatabase = cardDB;
      window.adventureDatabase = adventureDB;

      bindHandSlots();
      loadStats();

      const restored = loadState();

      if (!restored) {
        currentLevel = DEFAULT_LEVEL;
        deck = buildDeckFromLevel(currentLevel);
        hand = [];
        fillHandToFive();
        saveState();
      } else {
        if (!adventureDB[currentLevel]) {
          currentLevel = DEFAULT_LEVEL;
        }

        if (deck.length === 0 && hand.length === 0) {
          deck = buildDeckFromLevel(currentLevel);
          fillHandToFive();
          saveState();
        } else {
          fillHandToFive();
          saveState();
        }
      }

      renderHand();
      clearInfo();

      window.adventureGame = {
        activate: activateAdventureScene,
        reset: resetAdventure,
        refresh: renderHand,
        draw: fillHandToFive,
        setLevel: setLevel,
        getState: function () {
          return {
            levelKey: currentLevel,
            deck: deck.slice(),
            hand: hand.map((entry) => ({
              name: entry.name,
              remaining: entry.remaining
            }))
          };
        }
      };
    } catch (error) {
      console.error("冒险系统初始化失败", error);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);

  document.addEventListener("th-card:character-selected", function () {
    if (!activated) {
      activateAdventureScene();
    }
  });

  window.adventurecardnum = 0;
})();