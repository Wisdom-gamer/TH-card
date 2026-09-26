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

**双方同时持有"触发型"来源（装备/标记/手中反制卡）时，判定链无限递归，战斗卡死。**
该问题在本次改动前的 `fight.js` 中同样存在。

复现（最小化）：双方装备区各放一张效果含 `newEffectTypes` 键（`获取卡`/`抽卡`/`伤害`/`标记`/…）的卡，
例如"测试卡牌4"（无 `rule` 字段 → 恒真触发），然后任意使用一张牌。

已用插桩版 `fight.js` 追踪前 5 层嵌套 `carduse`，确认的触发链：

```
L0 side=1 startStep=0 register=-1   玩家出牌，走完 0..7 步
   └ 步骤1 使用者的装备 → 玩家装备[0] 触发
L1 side=1 startStep=1 register=0    同侧恢复（resumeStep=stepIndex=1）
   ├ 步骤1 register=0 → 从 index 1 起判，跳过来源            ✔ register 防线生效
   └ 步骤6 敌方的装备 register=-1 → 敌人装备[0] 触发
L2 side=0 startStep=1 register=0    跨侧恢复（resumeStep=8-1-6=1）
   ├ 步骤1 register=0 → 跳过敌人自己的来源
   └ 步骤6 敌方的装备 register=-1 → 玩家装备[0] 触发
L3 side=1 startStep=1 register=0    ← 参数与 L1 完全相同，环路闭合（周期=2层）
L4 side=0 startStep=1 register=0    ← 与 L2 相同
L5 …                                永不返回，伤害效果始终无法结算
```

对照组（仅一侧有触发型装备）正常终止：嵌套链走到对方装备步时无来源，链条耗尽
（2 次 `carduse` 调用后返回，伤害正常结算）。复现组 1 秒内即超过 200 次嵌套 `carduse`，
且因全是微任务，定时器被饥饿，UI 与测试超时都不会触发。

### 根因（三处叠加）

1. **跨侧恢复位置错误**：`resumeStep = stepCount - 1 - stepIndex`（`fight.js:1329`/`1344`）
   把由"敌方的装备"（步骤6）触发的嵌套链拉回步骤1，而非按预期流程继续走到
   "敌方手中的反制卡"（步骤7）后结束；嵌套链因此重跑已判定过的后半段。
2. **`register` 只保护恢复后的第一步**：`fight.js:2875-2876`
   `const stepRegister = i === startStep ? initialRegister : -1;`（注释亦明言"其后的层级必须从头判定"）。
   嵌套链的步骤1 靠 `register` 跳过了来源，但紧接着的步骤6 以 `register=-1` 从头判定，
   再次在对方装备区找到触发源。
3. **没有跨层级终止条件**：`chainCardUsed` 是每次 `effectruleAPI` 调用的局部变量
   （`fight.js:1161`），且**装备/标记的 4 个调用点（`1732`/`1764`/`1786`/`1860`）漏传第 14 个参数
   `sourceCardName`**（对比反制卡的 `1656`/`1937`），导致嵌套 `carduse` 的 `cardName` 恒为 `null`、
   反制卡兜底分支（`1342`）条件恒不成立；`fight.carduseDepth` 虽已跟踪（`2748-2750`）却从未用于防御。

### 建议修法（择一或组合）

- 在 `carduse` 中用现已跟踪的 `fight.carduseDepth` 加深度上限（最外层负责重置，超限直接返回）；
- 判定链去重：以最外层 `carduse` 为作用域记录"已触发过的 (side, 来源)"，嵌套链中重复来源直接跳过；
- 跨侧触发改为 `resumeStep = stepIndex + 1`，让嵌套链只跑后续步骤而非镜像重跑；
- 补齐 `1732`/`1764`/`1786`/`1860` 缺失的 `sourceCardName` 实参，恢复 `chainCardUsed` 防线。

因此装备相关用例会先清空另一侧装备区再执行。`newloc:"equip"` 配合
`newcardside:"other"` 会让这个状态更容易达成。
