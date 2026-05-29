# LanPM Todo

> **未完成 SSOT**（已完成 → [archive/todo/](./archive/todo/)）  
> 发版前：`npm run verify:release-gate`

---

## UI/UX 审图（2026-05-29 · Agent · `.lanpm/visual-screenshots` 1440×900）

**总评：7/10** — 工程化、克制、可达 RC 视觉基线；距「高级产品感」差 polish 层。

| 维度 | 结论 |
|------|------|
| 布局骨架（56/64/16、七页壳层） | ✅ 与 `docs/04` 一致 |
| 亮/暗主题区分 | ✅ 对比正常 |
| 语义色（accent / success / warning / danger） | ✅ 顶栏网络点、看板「高」、驾驶舱「风险」 |
| Ant 默认蓝 `#1677ff` | ✅ 未见残留 |
| **亮色甘特黑条** | ✅ **截图问题**（无头 `capturePage` 透明 SVG），**非实际 UI bug**；真机/dev 正常 |

### 分页评分

| 页面 | 亮/暗 | 评分 | 备注 |
|------|-------|------|------|
| Chat | ✅/✅ | 8/10 | 结构完整；空态略空，侧栏层级可加强 |
| Board | ✅/✅ | 7.5/10 | 四列清晰；卡片偏小，暗色 Tag 对比可加强 |
| Tree | ✅/✅ | 7/10 | 进度条+层级线清楚；seed 数据下留白多 |
| Gantt | ✅/✅ | 8/10 | 暗色正常；亮截图黑条已澄清为截屏问题 |
| Files | ✅/✅ | 7.5/10 | 分类 Tab + 列表/预览合理；工具栏可收敛 |
| Cockpit | ✅/✅ | 7/10 | KPI 三卡简洁；数据少时偏空 |
| Setup | ⚠️/⚠️ | 5.5/10 | CTA「继续」对比度弱；表单 affordance 弱；亮/暗头像色不一致 |

### 待办（按优先级）

| ID | 严重 | 项 | 状态 |
|----|------|-----|------|
| **UX-SETUP-CTA** | P0 | Setup「继续」按钮亮/暗对比度（应像 Primary Button） | [ ] |
| **UX-SETUP-FORM** | P1 | Setup 输入框可见边界或 focus ring | [ ] |
| **UX-SETUP-AVATAR** | P1 | Setup 默认头像色亮/暗统一（令牌） | [ ] |
| **UX-CHAT-SIDEBAR** | P2 | 聊天侧栏「私聊/群聊/成员」分区与辅助文案对比度 | [ ] |
| **UX-BOARD-DENSITY** | P2 | 看板卡片信息密度（1440 宽屏） | [ ] |
| **UX-FILES-TOOLBAR** | P2 | 文件页工具栏主次分层 | [ ] |
| **UX-BRAND** | P2 | 品牌记忆点（选中态 / hover / Setup 首屏锚点） | [ ] |
| **UX-RESET** | — | 顶栏用户菜单「注销身份」回 Setup（开发/换机） | [x] |

审图归档：[archive/review/20260529_173500_V14b设计还原度审图_rc37.md](archive/review/20260529_173500_V14b设计还原度审图_rc37.md)

---

## P2 发版阻断

| ID | 任务 | 状态 |
|----|------|------|
| **V-14b-HOV** | 顶栏/底栏/分段鼠标 hover（`RegionButton` / `ViewSegment`） | [ ] |
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
| DOC-ACC-03 | 双机局域网真网联调 | [ ] |
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
