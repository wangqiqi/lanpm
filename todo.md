# LanPM Todo

> **未完成 SSOT**（已完成 → [archive/todo/](./archive/todo/)）  
> 发版前：`npm run verify:release-gate`

---

## UI/UX 审图（2026-05-29 · Agent · `.lanpm/visual-screenshots` 1440×900）

**总评：7/10 → ~7.5/10（Setup/侧栏/看板/文件 polish 后）** — 工程化、克制、可达 RC 视觉基线。

| 维度 | 结论 |
|------|------|
| 布局骨架（56/64/16、七页壳层） | ✅ 与 `docs/04` 一致 |
| 亮/暗主题区分 | ✅ 对比正常 |
| 语义色（accent / success / warning / danger） | ✅ 顶栏网络点、看板「高」、驾驶舱「风险」 |
| Ant 默认蓝 `#1677ff` | ✅ 未见残留 |
| **亮色甘特黑条** | ✅ **截图问题**（无头 `capturePage` 透明 SVG），**非实际 UI bug** |

### 分页评分

| 页面 | 亮/暗 | 评分 | 备注 |
|------|-------|------|------|
| Chat | ✅/✅ | 8/10 | 侧栏分区标题已加强 |
| Board | ✅/✅ | 8/10 | 卡片标题/ hover 已加强 |
| Tree | ✅/✅ | 7/10 | seed 数据下留白多 |
| Gantt | ✅/✅ | 8/10 | 亮截图黑条已澄清为截屏问题 |
| Files | ✅/✅ | 8/10 | 工具栏主次已分层 |
| Cockpit | ✅/✅ | 7/10 | 数据少时偏空 |
| Setup | ✅/✅ | 7/10 | CTA/表单/头像已 polish |

### 待办（按优先级）

| ID | 严重 | 项 | 状态 |
|----|------|-----|------|
| **UX-SETUP-CTA** | P0 | Setup「继续」按钮亮/暗 Primary 对比度 | [x] |
| **UX-SETUP-FORM** | P1 | Setup 输入框 focus 指示（行内 accent 条） | [x] |
| **UX-SETUP-AVATAR** | P1 | Setup 默认头像亮/暗均用 accent | [x] |
| **UX-CHAT-SIDEBAR** | P2 | 聊天侧栏分区标题与辅助文案对比度 | [x] |
| **UX-BOARD-DENSITY** | P2 | 看板卡片标题字号 + hover | [x] |
| **UX-FILES-TOOLBAR** | P2 | 文件页上传 vs 书签工具栏分层 | [x] |
| **UX-BRAND** | P2 | regionInteract hover 环 + Setup/看板 accent 锚点 | [x] |
| **UX-RESET** | — | 顶栏用户菜单「注销身份」回 Setup | [x] |
| **UX-DISCOVER** | — | 顶栏「发现」：群组加入 + 成员私聊 | [x] |

审图归档：[archive/review/20260529_173500_V14b设计还原度审图_rc37.md](archive/review/20260529_173500_V14b设计还原度审图_rc37.md)

---

## P2 发版阻断

| ID | 任务 | 状态 |
|----|------|------|
| **V-14b-HOV** | 顶栏/底栏/分段鼠标 hover（`RegionButton` / `ViewSegment`）— **须人手 `npm run dev`** | [ ] |
| **VIS-08** | V-14b 总勾选（HOV 完成后） | [ ] |
| **DOC-02** | `docs/06` §2.5 人工验收项勾选 | [ ] |

```bash
npm run verify:release-gate
```

---

## 手验（真环境）

| ID | 任务 | 状态 |
|----|------|------|
| DOC-ACC-02 | 三平台真机 UI 抽检 | [ ] |
| DOC-ACC-03 | 双机局域网真网联调（含 **发现 → 加群 / 私聊**） | [ ] |
| — | 性能手测（冷启动/内存/Tab P95）填 `docs/06` §2.4 | [ ] |
| DOC-ACC-04 | I18N 英文 UI 长文案折行 | [ ] |
| — | 发布 **1.0.0** | [ ] |

---

## 跟踪（非阻断）

| 项 | 说明 |
|----|------|
| 圆角治理 | 新模块遵守 `docs/04` §1.3 |
| post-RC | [docs/08](docs/08_post-RC规划与已知限制.md) |

---

## 维护

- IPC → `channels.ts` + `verify:ipc-contract`
- i18n → zh/en + `verify:i18n-keys`
- UI → `docs/04` + `verify:visual`
