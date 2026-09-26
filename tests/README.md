# TH-card 战斗模块测试

通过 jsdom 加载真实页面环境（index.html + cards.js / fight.js / advfight.js），
所有用例都从 `window.fightAPI` 进入真实战斗流程后进行操作。

## 运行

```bash
cd tests
npm install
node fight.test.mjs
```

（或仓库根目录执行 `node tests/fight.test.mjs`，需先在 tests/ 下 npm install）

## 覆盖范围

| 模块 | 用例 |
| --- | --- |
| 死蝶之舞（用户指定卡牌） | 点击手牌 → 5 伤害 + 一张"死蝶之舞"洗入牌组（真实 DOM 点击路径） |
| 获取卡 `newloc` | `handcard`(默认/显式/非法回退)、`fightcards`、`grave`、`site`(含 sidetype)、`equip` |
| 获取卡 `newcardside` | `self`(默认/非法回退)、`other`、`all`；`site` 下无效 |
| 获取卡数量 | 固定 `value`、`value>1`、`value_read` 动态值 |
| `movetograve` | 玩家/敌人坟场、空名返回 false、坟场计数 UI |
| `movetofightcards` | 玩家/敌人牌组、洗入打乱顺序（统计性断言） |
| `moveSiteCardsToGrave` | 经结束回合按钮进入：临时卡直接删除、`other` 进对方坟场、所有者归属、两个数组实时清空 |
| 回归 | `addcardtohand`(含 sidetype 增减)、抽卡、伤害、标记、`movetosite`/`movetoequip`、牌堆坟场计数 UI、牌组抽空后坟场回收 |

## 已知引擎问题（与本次改动无关，测试中已隔离）

**双方装备同时存在"触发型"效果时，判定链会无限递归（战斗卡死）。**

复现（改动前的 fight.js 同样存在）：

1. 玩家装备区与敌人装备区各放入一张效果含 `获取卡`/`伤害`/`标记`/`抽卡` 等
   （即 `effectruleAPI` 中 `newEffectTypes` 收录的效果键）的卡，例如"测试卡牌4"；
2. 之后任意使用一张牌（或触发任何效果）；
3. `carduse` 会在 `startsideequip` 与 `nsideequip` 之间无限乒乓：
   装备触发 → 嵌套 `carduse` → 对方装备再次触发 → ……，`register` 防线只覆盖同一步骤/同一列表，无法打断跨步骤乒乓。

因此装备相关用例会先清空另一侧装备区再执行。`newloc:"equip"` 配合
`newcardside:"other"` 会让这个状态更容易达成，如需根治，
建议在 `carduse` 中利用现已跟踪但未使用的 `fight.carduseDepth` 加深度上限，
或让嵌套 `carduse` 遵循目前被忽略的 `rulesChecked` 参数。
