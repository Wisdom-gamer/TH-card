/**
 * TH-card 战斗模块测试
 *
 * 所有测试都通过 window.fightAPI 进入真实战斗流程，覆盖本次改动：
 *  - 死蝶之舞（用户指定卡牌）：造成5伤害 + 将一张"死蝶之舞"洗入牌组
 *  - 获取卡 newloc：handcard(默认) / fightcards(卡组) / grave(坟场) / site(场地) / equip(装备)
 *  - 获取卡 newcardside：self(默认) / other(对方) / all(双方)，场地无效
 *  - movetograve / movetofightcards
 *  - moveSiteCardsToGrave 重写后的逐张循环语义（实时删除 fightsitecardsow、临时卡直接删除、other 进对方坟场）
 *  - 回归：addcardtohand / 抽卡 / 伤害 / 标记 / movetosite / movetoequip / 牌堆与坟场计数 UI
 *
 * 说明：carduse 的"入场统一处理"会把打出的基本卡移入场地（既有机制），
 *       因此合成效果测试统一传 cardName = null 以隔离被测效果本身。
 *
 * 运行方式：
 *   cd tests && npm install && node fight.test.mjs
 */
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readRepoFile = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/* 与 adventure.js / cards.js 一致：剥离注释与尾随逗号 */
function sanitizeJsonText(text) {
  let result = "";
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const current = text[i];
    const next = text[i + 1];
    if (inString) {
      result += current;
      if (current === "\\") {
        result += text[i + 1] ?? "";
        i += 1;
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
      while (i < text.length && text[i] !== "\n") i += 1;
      result += "\n";
      continue;
    }
    if (current === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        if (text[i] === "\n") result += "\n";
        i += 1;
      }
      i += 1;
      continue;
    }
    result += current;
  }
  return result.replace(/,\s*([}\]])/g, "$1");
}

const readJsonFile = (rel) => JSON.parse(sanitizeJsonText(readRepoFile(rel)));

/* ------------------------------------------------------------------ */
/* 极简测试框架                                                        */
/* ------------------------------------------------------------------ */
const cases = [];
const test = (name, fn) => cases.push({ name, fn });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(cond, timeout = 20000, label = "条件") {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeout) {
      throw new Error(`等待超时：${label}`);
    }
    await sleep(20);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "断言失败");
}

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg || "不相等"}：期望 ${e}，实际 ${a}`);
  }
}

const countOf = (list, name) =>
  (Array.isArray(list) ? list : []).filter((entry) => window.parseFightCard(entry).name === name).length;

/* ------------------------------------------------------------------ */
/* 浏览器环境加载（jsdom + 本地 fetch）                                 */
/* ------------------------------------------------------------------ */
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  const text = String(error && error.message ? error.message : error);
  if (!/Could not load|图片|img/.test(text)) {
    console.error("[jsdomError]", text);
  }
});
virtualConsole.on("error", (...args) => console.error("[page error]", ...args));

const dom = new JSDOM(readRepoFile("index.html"), {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;

/* fetch：直接读仓库内的 json 文件 */
window.fetch = async (requestPath) => {
  const clean = String(requestPath).split("?")[0];
  const text = readRepoFile(clean);
  return { ok: true, status: 200, text: async () => text };
};

/* 压缩战斗动画等待时间（保持异步顺序，仅加速） */
const rawSetTimeout = window.setTimeout.bind(window);
window.setTimeout = (fn, ms, ...args) => rawSetTimeout(fn, Math.min(Number(ms) || 0, 10), ...args);

/* 按 index.html 的顺序加载脚本 */
for (const script of ["cards.js", "fight.js", "advfight.js"]) {
  window.eval(readRepoFile(script));
}

/* ------------------------------------------------------------------ */
/* 战斗前置：角色、牌组、冒险数据                                       */
/* ------------------------------------------------------------------ */
await waitFor(() => window.cardDatabase && Object.keys(window.cardDatabase).length > 0, 20000, "cards.js 数据加载");

for (const cardName of ["猛击", "打击", "测试卡牌1", "测试卡牌3", "测试卡牌4", "测试卡牌5", "死蝶之舞"]) {
  assert(window.cardDatabase[cardName], `cards.json 中找不到卡牌：${cardName}`);
}

await window.initializeCharacterCards("测试角色1");
window.playerDeck.reset();
const deckList = ["猛击", "打击", "测试卡牌1", "测试卡牌3", "测试卡牌4", "测试卡牌5"];
for (const cardName of deckList) {
  window.playerDeck.addDirect(cardName);
}

window.adventureCardsDatabase = readJsonFile("adventurecards.json");
window.adventureStats = { HP: 200, MAXHP: 200, MP: 10, MAXMP: 10, XP: 0, Gold: 0 };
window.selectedCharacter = "测试角色1";
window.adventurebagitem = [];
window.adventureequip = [];

/* 从 fightAPI 进入战斗 */
window.fightAPI("test1");
await waitFor(
  () => window.fight && window.fight.playerhand.length >= 3 && window.fight.enemyhand.length >= 3,
  20000,
  "fightAPI 初始发牌"
);

const fight = window.fight;
fight.sideturn = "player";
/* 防止测试伤害把战斗提前结束 */
fight.enemy.HP = 999;
fight.enemy.MAXHP = 999;

const bottomSlots = Array.from(window.document.querySelectorAll(".game-area .player.bottom .slots .card-slot"));
const slotByIndex = (index) => bottomSlots.find((slot) => slot.dataset.index === String(index));
const endTurnButton = window.document.querySelector(".game-area .end-turn");
assert(endTurnButton, "找不到结束回合按钮");

/* 合成效果直接走 carduse（cardName 传 null，避免"入场移入场地"干扰被测效果） */
async function runEffect(effect, tag = "handcard", cardName = null) {
  return window.carduse(1, "event", effect, tag, cardName, fight, [], -1, 0, {}, null, false, 0);
}

function getCardEffect(cardName, getCardConfig) {
  return { "效果": { "获取卡": { [cardName]: getCardConfig } } };
}

const runGetCard = (cardName, getCardConfig) => runEffect(getCardEffect(cardName, getCardConfig), "handcard;handcardaddcardself");

/* 清空手牌，避免8张上限干扰计数 */
const clearHand = () => { fight.playerhand.length = 0; };

/* ================================================================== */
/* 一、用户指定卡牌：死蝶之舞（真实点击手牌路径）                        */
/* ================================================================== */

test("死蝶之舞：点击手牌造成5伤害并把一张死蝶之舞洗入牌组", async () => {
  const enemyHPBefore = fight.enemy.HP;
  const deckLenBefore = fight.playercards.length;

  clearHand();
  fight.playerhand.push("死蝶之舞");
  const slot = slotByIndex(0);
  assert(slot && !slot.disabled, "手牌槽位0不可用");

  slot.click();

  await waitFor(
    () => fight.enemy.HP === enemyHPBefore - 5 && countOf(fight.playercards, "死蝶之舞") === 1,
    20000,
    "死蝶之舞效果结算"
  );

  eq(fight.enemy.HP, enemyHPBefore - 5, "敌人应受到5点伤害");
  eq(fight.playercards.length, deckLenBefore + 1, "牌组应增加1张");
  eq(countOf(fight.playercards, "死蝶之舞"), 1, "牌组中应多出一张死蝶之舞");
  eq(countOf(fight.playerhand, "死蝶之舞"), 0, "手牌中的死蝶之舞应已被打出");
  /* 洗入的必须是可抽的纯卡名条目 */
  const shuffled = fight.playercards.filter((entry) => window.parseFightCard(entry).name === "死蝶之舞");
  eq(shuffled.length, 1, "牌组中应只有一张死蝶之舞");
  eq(window.parseFightCard(shuffled[0]).name, "死蝶之舞", "洗入条目应可解析出卡名");
  /* 牌组数量 UI 同步 */
  eq(window.document.getElementById("fightplayerdecknum").textContent, String(fight.playercards.length), "牌组数量UI应同步");
});

/* ================================================================== */
/* 二、获取卡 newloc / newcardside                                     */
/* ================================================================== */

test("获取卡：不填 newloc 默认加入手牌", async () => {
  clearHand();
  await runGetCard("测试卡牌1", { value: 1 });
  eq(fight.playerhand.length, 1, "手牌应增加1张");
  eq(window.parseFightCard(fight.playerhand[0]).name, "测试卡牌1", "加入手牌的应是测试卡牌1");
});

test("获取卡：newloc=handcard 显式加入手牌", async () => {
  clearHand();
  await runGetCard("测试卡牌1", { value: 1, newloc: "handcard" });
  eq(fight.playerhand.length, 1, "手牌应增加1张");
});

test("获取卡：newloc=fightcards newcardside=self 洗入己方牌组", async () => {
  clearHand();
  const deckBefore = fight.playercards.length;
  const nameBefore = countOf(fight.playercards, "测试卡牌3");
  await runGetCard("测试卡牌3", { value: 1, newloc: "fightcards", newcardside: "self" });
  eq(fight.playercards.length, deckBefore + 1, "己方牌组应增加1张");
  eq(countOf(fight.playercards, "测试卡牌3"), nameBefore + 1, "己方牌组应多出一张测试卡牌3");
  eq(fight.playerhand.length, 0, "手牌不应增加");
});

test("获取卡：newloc=fightcards newcardside=other 洗入对方牌组", async () => {
  const enemyDeckBefore = fight.enemycards.length;
  const playerDeckBefore = fight.playercards.length;
  await runGetCard("测试卡牌3", { value: 1, newloc: "fightcards", newcardside: "other" });
  eq(fight.enemycards.length, enemyDeckBefore + 1, "对方牌组应增加1张");
  eq(countOf(fight.enemycards, "测试卡牌3"), 1, "对方牌组应含有测试卡牌3");
  eq(fight.playercards.length, playerDeckBefore, "己方牌组不应变化");
  eq(window.document.getElementById("fightenemydecknum").textContent, String(fight.enemycards.length), "敌方牌组数量UI应同步");
});

test("获取卡：newloc=fightcards newcardside=all 洗入双方牌组", async () => {
  const deckBefore = fight.playercards.length;
  const enemyDeckBefore = fight.enemycards.length;
  await runGetCard("测试卡牌5", { value: 1, newloc: "fightcards", newcardside: "all" });
  eq(fight.playercards.length, deckBefore + 1, "己方牌组应增加1张");
  eq(fight.enemycards.length, enemyDeckBefore + 1, "对方牌组应增加1张");
});

test("获取卡：newloc=grave newcardside=self 放入己方坟场", async () => {
  const graveBefore = fight.fightplayergrave.length;
  await runGetCard("测试卡牌1", { value: 1, newloc: "grave", newcardside: "self" });
  eq(fight.fightplayergrave.length, graveBefore + 1, "己方坟场应增加1张");
  eq(countOf(fight.fightplayergrave, "测试卡牌1"), 1, "己方坟场应含有测试卡牌1");
  eq(window.document.getElementById("fightplayergravenum").textContent, String(fight.fightplayergrave.length), "己方坟场数量UI应同步");
});

test("获取卡：newloc=grave newcardside=other 放入对方坟场", async () => {
  const enemyGraveBefore = fight.fightenemygrave.length;
  await runGetCard("测试卡牌1", { value: 1, newloc: "grave", newcardside: "other" });
  eq(fight.fightenemygrave.length, enemyGraveBefore + 1, "对方坟场应增加1张");
  eq(countOf(fight.fightenemygrave, "测试卡牌1"), 1, "对方坟场应含有测试卡牌1");
  eq(window.document.getElementById("fightenemygravenum").textContent, String(fight.fightenemygrave.length), "敌方坟场数量UI应同步");
});

test("获取卡：newloc=grave newcardside=all 放入双方坟场", async () => {
  const graveBefore = fight.fightplayergrave.length;
  const enemyGraveBefore = fight.fightenemygrave.length;
  await runGetCard("测试卡牌4", { value: 1, newloc: "grave", newcardside: "all" });
  eq(fight.fightplayergrave.length, graveBefore + 1, "己方坟场应增加1张");
  eq(fight.fightenemygrave.length, enemyGraveBefore + 1, "对方坟场应增加1张");
});

test("获取卡：newloc=site 放到自身场地且忽略 newcardside", async () => {
  const siteBefore = fight.fightsitecards.length;
  await runGetCard("测试卡牌5", { value: 1, newloc: "site", newcardside: "other" });
  eq(fight.fightsitecards.length, siteBefore + 1, "场地应增加1张");
  eq(fight.fightsitecardsow[fight.fightsitecards.length - 1], 1, "场地卡所有者应为玩家（site 不支持 newcardside）");
  eq(window.parseFightCard(fight.fightsitecards[fight.fightsitecards.length - 1]).name, "测试卡牌5", "场地卡应是测试卡牌5");
  eq(fight.fightsitecardsow.length, fight.fightsitecards.length, "场地两个数组应保持对齐");
});

test("获取卡：newloc=site 支持 sidetype 配置", async () => {
  const siteBefore = fight.fightsitecards.length;
  await runGetCard("测试卡牌5", { value: 1, newloc: "site", sidetype: "+|temp" });
  eq(fight.fightsitecards.length, siteBefore + 1, "场地应增加1张");
  const entry = fight.fightsitecards[fight.fightsitecards.length - 1];
  assert(window.parseFightCard(entry).sidetype.includes("temp"), "场地卡应带有 temp sidetype");
});

test("获取卡：newloc=equip newcardside=self 放入己方装备区", async () => {
  /* 隔离：清空对方装备。双方装备同时存在触发型效果时会触发引擎既有的判定链无限递归
     （effectruleAPI 的装备触发在 startsideequip/nsideequip 之间乒乓，与本次改动无关），
     详见 tests/README 中的说明。 */
  fight.fightenemyequip.length = 0;
  const equipBefore = fight.fightplayerequip.length;
  await runGetCard("测试卡牌4", { value: 1, newloc: "equip", newcardside: "self" });
  eq(fight.fightplayerequip.length, equipBefore + 1, "己方装备区应增加1张");
  eq(window.parseFightCard(fight.fightplayerequip[fight.fightplayerequip.length - 1]).name, "测试卡牌4", "装备卡应是测试卡牌4");
});

test("获取卡：newloc=equip newcardside=other 放入对方装备区", async () => {
  /* 隔离：清空己方装备（原因同上） */
  fight.fightplayerequip.length = 0;
  const equipBefore = fight.fightenemyequip.length;
  await runGetCard("测试卡牌4", { value: 1, newloc: "equip", newcardside: "other" });
  eq(fight.fightenemyequip.length, equipBefore + 1, "对方装备区应增加1张");
  /* 恢复干净状态，避免影响后续用例 */
  fight.fightenemyequip.length = 0;
});

test("获取卡：value>1 时按数量放置", async () => {
  const graveBefore = fight.fightplayergrave.length;
  await runGetCard("测试卡牌1", { value: 3, newloc: "grave" });
  eq(fight.fightplayergrave.length, graveBefore + 3, "己方坟场应增加3张");
});

test("获取卡：非法 newloc 回退为手牌", async () => {
  clearHand();
  await runGetCard("测试卡牌1", { value: 1, newloc: "notexist" });
  eq(fight.playerhand.length, 1, "非法 newloc 应回退加入手牌");
});

test("获取卡：非法 newcardside 回退为自身", async () => {
  const graveBefore = fight.fightplayergrave.length;
  const enemyGraveBefore = fight.fightenemygrave.length;
  await runGetCard("测试卡牌1", { value: 1, newloc: "grave", newcardside: "notexist" });
  eq(fight.fightplayergrave.length, graveBefore + 1, "非法 newcardside 应放入己方坟场");
  eq(fight.fightenemygrave.length, enemyGraveBefore, "对方坟场不应变化");
});

test("获取卡：value_read 动态数量（经 effectAPI 预处理后生效）", async () => {
  try {
    window.modifyTagCount(fight, 1, "力量", 2);
    eq(window.getTagCount(fight, 1, "力量"), 2, "力量标记应为2");
    const graveBefore = fight.fightplayergrave.length;
    /* 不提供静态 value，迫使 effectAPI 走 value_read 动态解析 */
    await runGetCard("测试卡牌1", { newloc: "grave", value_read: "<self.tags.力量>" });
    eq(fight.fightplayergrave.length, graveBefore + 2, "应按力量标记数量(2)放入坟场");
  } finally {
    /* 无论如何都清掉力量标记，避免影响后续伤害类断言 */
    const powerLeft = window.getTagCount(fight, 1, "力量");
    if (powerLeft > 0) {
      window.modifyTagCount(fight, 1, "力量", -powerLeft);
    }
  }
});

/* ================================================================== */
/* 三、movetograve / movetofightcards                                  */
/* ================================================================== */

test("movetograve：卡牌名+放置侧，放入玩家坟场", () => {
  const graveBefore = fight.fightplayergrave.length;
  const result = window.movetograve("猛击", 1);
  eq(result, true, "应返回 true");
  eq(fight.fightplayergrave.length, graveBefore + 1, "玩家坟场应增加1张");
  eq(fight.fightplayergrave[fight.fightplayergrave.length - 1], "猛击", "坟场最后一张应是猛击");
});

test("movetograve：放入敌人坟场", () => {
  const enemyGraveBefore = fight.fightenemygrave.length;
  const result = window.movetograve("猛击", 0);
  eq(result, true, "应返回 true");
  eq(fight.fightenemygrave.length, enemyGraveBefore + 1, "敌人坟场应增加1张");
});

test("movetograve：空卡牌名返回 false 且不改变坟场", () => {
  const graveBefore = fight.fightplayergrave.length;
  const enemyGraveBefore = fight.fightenemygrave.length;
  eq(window.movetograve("", 1), false, "空名应返回 false");
  eq(window.movetograve(null, 0), false, "null 应返回 false");
  eq(fight.fightplayergrave.length, graveBefore, "玩家坟场不应变化");
  eq(fight.fightenemygrave.length, enemyGraveBefore, "敌人坟场不应变化");
});

test("movetofightcards：洗入己方牌组", () => {
  const deckBefore = fight.playercards.length;
  const result = window.movetofightcards("猛击", 1);
  eq(result, true, "应返回 true");
  eq(fight.playercards.length, deckBefore + 1, "己方牌组应增加1张");
  assert(countOf(fight.playercards, "猛击") >= 1, "牌组中应含有猛击");
});

test("movetofightcards：洗入对方牌组", () => {
  const enemyDeckBefore = fight.enemycards.length;
  const result = window.movetofightcards("猛击", 0);
  eq(result, true, "应返回 true");
  eq(fight.enemycards.length, enemyDeckBefore + 1, "对方牌组应增加1张");
});

test("movetofightcards：洗入后牌组顺序被打乱（非简单追加到末尾）", () => {
  /* 统计性断言（非随机断言）：同一张牌重复洗入20次，落点应随机分布且不总在末尾。
     全部相同位置的概率约为 (1/7)^19，实际不可能抖动。 */
  const seen = new Set();
  for (let round = 0; round < 20; round += 1) {
    fight.playercards.length = 0;
    for (const name of ["猛击", "打击", "测试卡牌1", "测试卡牌3", "测试卡牌4", "测试卡牌5"]) {
      fight.playercards.push(name);
    }
    window.movetofightcards("死蝶之舞", 1);
    seen.add(fight.playercards.indexOf("死蝶之舞"));
  }
  assert(seen.size >= 2, `洗入位置应随机分布，实际只出现在: ${[...seen].join(",")}`);
  assert([...seen].some((index) => index !== 6), "洗入的牌不应总是位于牌组末尾");
  /* 恢复牌组，供后续抽卡类用例使用 */
  fight.playercards.length = 0;
  for (const name of ["猛击", "打击", "测试卡牌1", "测试卡牌3", "测试卡牌4", "测试卡牌5"]) {
    fight.playercards.push(name);
  }
});

/* ================================================================== */
/* 四、moveSiteCardsToGrave（经结束回合按钮进入真实流程）                */
/* ================================================================== */

test("结束回合：moveSiteCardsToGrave 逐张处理场地卡（临时卡删除、other 进对方坟场）", async () => {
  /* 先清掉历史场地卡，只保留本次摆放的四种，保证期望可计算 */
  fight.fightsitecards.length = 0;
  fight.fightsitecardsow.length = 0;
  window.movetosite(fight, "测试卡牌1", 1, [], 1, {});        /* 玩家普通 → 玩家坟场 */
  window.movetosite(fight, "测试卡牌3", 1, ["temp"], 1, {});   /* 临时 → 直接删除 */
  window.movetosite(fight, "测试卡牌4", 1, ["other"], 1, {});  /* other → 敌人坟场 */
  window.movetosite(fight, "测试卡牌5", 0, [], 1, {});         /* 敌人普通 → 敌人坟场 */

  const graveBefore = fight.fightplayergrave.length;
  const enemyGraveBefore = fight.fightenemygrave.length;
  const turnBefore = fight.turn;

  endTurnButton.click();

  await waitFor(
    () => fight.sideturn === "player" && fight.turn === turnBefore + 1,
    30000,
    "回合循环结束"
  );

  eq(fight.fightsitecards.length, 0, "场地卡数组应被清空");
  eq(fight.fightsitecardsow.length, 0, "场地所有者数组应被实时删除清空");
  /* 玩家坟场只受玩家场地卡影响：测试卡牌1（死蝶之舞已在之前测试中入场，此处只算本次4张） */
  eq(fight.fightplayergrave.length, graveBefore + 1, "玩家坟场应只增加1张（测试卡牌1）");
  /* 敌人坟场还包含敌方本回合打出的牌，因此按卡名断言 */
  assert(countOf(fight.fightenemygrave, "测试卡牌4") >= 1, "敌人坟场应含有 other 的测试卡牌4");
  assert(countOf(fight.fightenemygrave, "测试卡牌5") >= 1, "敌人坟场应含有敌人的测试卡牌5");
  assert(fight.fightenemygrave.length >= enemyGraveBefore + 2, "敌人坟场至少应增加2张");
  /* 临时卡任何坟场都不应有 */
  eq(countOf(fight.fightplayergrave, "测试卡牌3"), 0, "临时卡不应进入玩家坟场");
  eq(countOf(fight.fightenemygrave, "测试卡牌3"), 0, "临时卡不应进入敌人坟场");
});

/* ================================================================== */
/* 五、回归：其他受影响模块                                            */
/* ================================================================== */

test("回归：伤害效果", async () => {
  const enemyHPBefore = fight.enemy.HP;
  await runEffect({ "效果": { "伤害": { value: 3, type: "普通" } } }, "handcard;handcarddamage");
  eq(fight.enemy.HP, enemyHPBefore - 3, "敌人应受到3点伤害");
});

test("回归：抽卡效果", async () => {
  clearHand();
  const deckBefore = fight.playercards.length;
  await runEffect({ "效果": { "抽卡": { value: 2 } } }, "handcard");
  await waitFor(() => fight.playerhand.length === 2, 20000, "抽卡效果");
  eq(fight.playercards.length, deckBefore - 2, "牌组应减少2张");
});

test("回归：标记效果", async () => {
  await runEffect({ "效果": { "标记": { "护甲": { "self": { value: 1 } } } } }, "handcard");
  eq(window.getTagCount(fight, 1, "护甲"), 1, "玩家应获得1层护甲");
});

test("回归：addcardtohand 直接调用与 sidetype 应用", () => {
  clearHand();
  const added = window.addcardtohand("测试卡牌1", 1, "+|temp", undefined);
  eq(added, true, "应返回 true");
  eq(fight.playerhand.length, 1, "手牌应增加1张");
  assert(window.parseFightCard(fight.playerhand[0]).sidetype.includes("temp"), "sidetype 增减应生效");
});

test("回归：movetosite / movetoequip 直接调用", () => {
  const siteBefore = fight.fightsitecards.length;
  eq(window.movetosite(fight, "测试卡牌1", 0, [], 1, {}), true, "movetosite 应返回 true");
  eq(fight.fightsitecards.length, siteBefore + 1, "场地应增加1张");
  eq(fight.fightsitecardsow[fight.fightsitecards.length - 1], 0, "所有者应为敌人");
  eq(fight.fightsitecardsow.length, fight.fightsitecards.length, "场地两个数组应保持对齐");

  const equipBefore = fight.fightplayerequip.length;
  eq(window.movetoequip(fight, "测试卡牌4", 1, [], {}), true, "movetoequip 应返回 true");
  eq(fight.fightplayerequip.length, equipBefore + 1, "装备区应增加1张");
});

test("回归：牌组为空时坟场回收（recycleGraves 相关数组完好）", async () => {
  clearHand();
  fight.playercards.length = 0;
  const turnBefore = fight.turn;
  endTurnButton.click();
  await waitFor(() => fight.sideturn === "player" && fight.turn === turnBefore + 1, 30000, "牌组抽空后的回合循环");
  assert(fight.playercards.length > 0 || fight.fightplayergrave.length === 0, "牌组应被坟场补充或坟场已空");
});

/* ------------------------------------------------------------------ */
/* 执行                                                               */
/* ------------------------------------------------------------------ */
const TEST_TIMEOUT = 30000;
let passed = 0;
const failed = [];
for (const item of cases) {
  const started = Date.now();
  let timer = null;
  try {
    await Promise.race([
      item.fn(),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          const state = window.fight ? {
            hand: window.fight.playerhand.length,
            enemyHand: window.fight.enemyhand.length,
            deck: window.fight.playercards.length,
            enemyDeck: window.fight.enemycards.length,
            grave: window.fight.fightplayergrave.length,
            enemyGrave: window.fight.fightenemygrave.length,
            site: window.fight.fightsitecards.length,
            siteOw: window.fight.fightsitecardsow.length,
            ended: window.fight.ended,
            locked: window.fight.carduseLocked,
            depth: window.fight.carduseDepth,
            sideturn: window.fight.sideturn,
            turn: window.fight.turn
          } : null;
          reject(new Error(`用例超时（${TEST_TIMEOUT}ms）。战斗状态：${JSON.stringify(state)}`));
        }, TEST_TIMEOUT);
      })
    ]);
    passed += 1;
    console.log(`  OK   ${item.name}  (${Date.now() - started}ms)`);
  } catch (error) {
    failed.push({ name: item.name, error });
    console.log(`  FAIL ${item.name}  (${Date.now() - started}ms)`);
    console.log(`       ${error && error.message ? error.message : error}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

console.log(`\n结果：${passed}/${cases.length} 通过`);
if (failed.length > 0) {
  console.log("失败用例：");
  for (const item of failed) {
    console.log(`  - ${item.name}`);
  }
  process.exitCode = 1;
}
window.close();
