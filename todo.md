# LanPM Todo

> **原则**：能自动化的不手做。发布前最低门禁：`npm run verify:project` + `npm run verify:m7`（**92** 单元用例 + P0 守卫 + M0–M7 集成）。  
> **报告 SSOT**：[视觉.md](./视觉.md) · [代码文档差异.md](./代码文档差异.md) — ** actionable 项以本文为准**。

---

## 发版前总览（视觉 + 文档）

| 优先级 | 类别 | 必做项 | 状态 |
|--------|------|--------|------|
| **P2 阻断** | 视觉 | §视觉 **阶段 A** 代码项 ✅；**V-14b** 手验截图 | [ ] |
| **P2 阻断** | 文档 | `verify:docs-code -- --strict` + **DOC-02 全量** §2 无 P0/P1 | [ ] |
| **P3** | 视觉 | §视觉 **阶段 B**（VIS-04~06） | ✅ |
| **P3** | 自动化 | AUTO-18~20 | [ ] |
| **手验** | 全项 | §手验 表 | [ ] |

```bash
npm run verify:project && npm run verify:m7
npm run verify:docs-code -- --strict
npm run verify:visual
npm run dev   # V-14b 截图
```

---

## 手验（真环境 / 人工仍不可完全替代）

| 项 | 来源 | 可减轻的自动化 | 状态 |
|----|------|----------------|------|
| 三平台冒烟 | 06 §2 | **AUTO-18** CI 矩阵 | [ ] |
| 性能手测填表 | 06 §3 | **AUTO-15** m7-perf ✅ | [ ] |
| 局域网双机真网联调 | 05 | **AUTO-10** dual-stub ✅ + 一台真机抽检 | [ ] |
| **V-14b** 亮/暗七页截图 | 视觉 §9.2 · 05 §2.2 | **AUTO-20**（依赖 AUTO-19） | [ ] |
| V-14b 暗色语义色观感（红/绿/黄） | 视觉 §9.2 | 人工 | [ ] |
| V-14b Ant 控件 vs 自定义 region hover 并排 | 视觉 §9.2 | 人工 | [ ] |
| I18N-05 英文 UI 走查（字号/折行） | 视觉 §9.2 | **AUTO-02** i18n-keys ✅ | [ ] |
| 发布 1.0.0 | 06 §2 | 上表 + §视觉 阶段 A + §文档 | [ ] |

**V-14b 七页**：Setup · Chat · Board · Tree · Gantt · Files · Cockpit — 亮/暗各一套，本地 `{theme}_{page}.png`，**勿提交仓库**。

---

## 视觉一致性计划

> **审计**：[视觉.md](./视觉.md)（2026-05-29）  
> **基线**：V-01~V-13 ✅ · V-14a / **AUTO-17** ✅  
> **Cursor**：`.cursor/skills/lanpm-visual-audit` · `.cursor/rules/renderer-visual-tokens.mdc`

### 阶段 A — 发版阻断（P2，建议 1 个 PR）

| ID | 任务 | 涉及文件 / 范围 | 验收 | 状态 |
|----|------|-----------------|------|------|
| VIS-01 | 语义令牌 `--lanpm-success` / `--lanpm-warning` / `--lanpm-danger`（亮暗各一套） | `global.module.css` | 亮暗可读 | ✅ |
| VIS-01a | TopBar 网络点改用语义令牌 | `TopBar.module.css` | 无孤立 Ant hex | ✅ |
| VIS-01b | 看板拖放错误改用语义令牌 | `board.module.css` | 暗色对比可接受 | ✅ |
| VIS-01c | 甘特任务条标签字色 `var(--lanpm-on-accent)` | `gantt.module.css` | 与 accent 条协调 | ✅ |
| VIS-01d | 扩展 `verify-visual.ts`：语义色 Ant hex + 错误 fallback | `tests/static/verify-visual.ts` | `verify:visual` 通过 | ✅ |
| VIS-02 | 去掉 `var(--lanpm-*, rgba(0,0,0,*))` 暗色错误 fallback | chat/board/files/emoji | fallback 已移除 | ✅ |
| VIS-02a | 聊天移动端遮罩 `--lanpm-overlay` | `chat.module.css` | 暗色不刺眼 | ✅ |
| VIS-02b | 己方气泡/提及 `--lanpm-on-accent` | `chat.module.css` | 亮暗一致 | ✅ |
| VIS-02c | 文件预览占位 `--lanpm-media-bg` | `files.module.css` | 暗色占位合理 | ✅ |
| VIS-03 | 阴影 `--lanpm-shadow-sm/md/lg` | `global.module.css` | 亮暗 elevation 一致 | ✅ |
| VIS-03a | 聊天气泡/看板/Setup 阴影统一走令牌 | chat/board/SetupWizard | 无孤立硬编码阴影 | ✅ |
| V-14b | 亮/暗七页手验 + 截图（见 §手验） | — | 05 §2.2 · 06 §2.5 勾选 | [ ] |

### 阶段 B — 文档与启动路径（P3）

| ID | 任务 | 涉及文件 | 状态 |
|----|------|----------|------|
| VIS-04 | 圆角三级写入 `docs/04` §1.3 | `docs/04_交互与UI约定.md` | ✅ |
| VIS-05 | 崩溃/预 React 错误页跟随 `data-theme` | `RootErrorBoundary`、`main.tsx`、`crash.module.css` | ✅ |
| VIS-06 | `App.module.css` 顶栏边框 `--lanpm-bar-border` | `App.module.css` | ✅ |
| VIS-05a | 甘特 PNG/PDF 导出背景读 `--lanpm-bg` | `ganttExport.ts` | ✅ |

### 阶段 C — 可选 / 自动化（P4+）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| VIS-07 | 字体尺度令牌化（建议 4 档：`caption` / `body` / `title` / `display`） | 视觉 §4；新样式优先引用 | [ ] |
| VIS-08 | 默认头像调色板（`setup/avatar.ts`）低优装饰色 | 视觉 §6.2；可延后 | [ ] |
| AUTO-19 | Electron 无头 smoke | AUTO-20 前置 | [ ] |
| AUTO-20 | 截图回归（Playwright/Electron） | 减轻后续 V-14b | [ ] |

### 已完成（勿重复开项）

| ID | 说明 |
|----|------|
| V-01~V-13 | 令牌、ViewHeader/Toolbar/State、56/64/16、regionInteract |
| V-14a | `verify:visual` 纳入 `verify:m7` |
| AUTO-17 | 扩展 visual（七页引用 + 亮/暗 token 差异静态守卫） |

### 推荐执行顺序

1. VIS-01 → VIS-01a~d → VIS-02 → VIS-02a~c → VIS-03 → VIS-03a  
2. V-14b + §手验 暗色语义 / Ant hover  
3. VIS-04 → VIS-05 → VIS-05a → VIS-06  
4. VIS-07 / VIS-08 / AUTO-19 → AUTO-20  

---

## 文档与代码一致性

> **报告**：[代码文档差异.md](./代码文档差异.md) · **Cursor**：`.cursor/skills/lanpm-docs-code-audit`  
> **§1 机读**：2026-05-29 无差异 ✅ — 发版前须重跑 `--strict`

### 机读 / 门禁

| ID | 任务 | 命令 | 状态 |
|----|------|------|------|
| DOC-01 | 刷新机读报告 §1（RC 号、docs/05 脚本表、布局数字） | `npm run verify:docs-code` | 每次发版前 |
| DOC-03 | 发版门禁：§1 有 P0/P1 则失败 | `verify:project` 内 `--strict` | ✅ |
| DOC-VIS-01 | UI 文档 vs 视觉（圆角 §1.3、语义/阴影令牌） | `docs/04` · `视觉.md` | ✅ |

### 全量审计（代码文档差异.md §2 — Agent/人工）

| ID | 任务 | 对照 | 示例差距（待核实） | 状态 |
|----|------|------|-------------------|------|
| DOC-02 | **统筹**：全量审计后更新 `代码文档差异.md` §2 表格 | 01–06 + README | — | [ ] |
| DOC-PRD-01 | PRD P0：**任务详情面板** | `docs/01` vs `src/` | 面板 UI/交互是否实现 | [ ] |
| DOC-PRD-02 | PRD P0：**聊天附件** | `docs/01` vs `src/` | 发送/展示/同步 | [ ] |
| DOC-PRD-03 | P1：**WebView 书签** / 浏览器导入导出 | `docs/01`、`docs/06` vs `src/` | 内嵌预览、书签 IO | [ ] |
| DOC-TECH-01 | post-RC 技术选型 vs 依赖树 | `docs/01` §1.3、`docs/02`、`package.json` | Yjs、WebRTC、IndexedDB 未引入须文档一致 | [ ] |
| DOC-ACC-01 | 验收勾选 vs 本文状态 | `docs/06` §2 vs `todo.md` | 手验/M 里程碑勾选对齐 | [ ] |
| DOC-VIS-01 | UI 文档 vs 视觉审计 | `docs/04` vs [视觉.md](./视觉.md) §2–§6 | 圆角/语义色/字号（与 **VIS-04** 联动） | [ ] |

参考归档：[archive/20260529_095839_实现文档一致性评估_评估.md](./archive/20260529_095839_实现文档一致性评估_评估.md)

### 文档审计推荐顺序

1. `npm run verify:docs-code` → `verify:p0`  
2. DOC-PRD-01 ~ DOC-PRD-03、DOC-TECH-01  
3. DOC-ACC-01、DOC-VIS-01  
4. 汇总写入 `代码文档差异.md` §2（**DOC-02**）  
5. `verify:docs-code -- --strict`

---

## 测试体系（已完成 ✅）

### 单元 `tests/unit/` · `npm run test` — 22 文件 / 92 用例

详见 `docs/05_测试与联调发布.md` §1.1。

### 集成 / 静态 / 编排 `tests/`

| 命令 | 说明 | 状态 |
|------|------|------|
| `verify:p0` | P0 一致性守卫 8 项串联 | ✅ |
| `verify:shared` | 纯 shared 冒烟 7 步 | ✅ |
| `verify:project` | p0 + lint + coverage + shared + search + build | ✅ |
| `verify:m7` | 全量回归 | ✅ |
| `verify:dual-stub` | 单机双 Stub 联调 | ✅ |
| `verify:peer-registry` | peer TTL 清理 | ✅ |
| `verify:docs-code` | 文档↔代码机读 + 刷新 `代码文档差异.md` | ✅ |

---

## 自动化增强计划

### P0 — 一致性守卫 ✅

| ID | 脚本 | 状态 |
|----|------|------|
| AUTO-01 | `verify:ipc-contract` | ✅ |
| AUTO-02 | `verify:i18n-keys` | ✅ |
| AUTO-03 | `verify:docs-links` | ✅ |
| AUTO-04 | 扩展 `verify:project` | ✅ |
| AUTO-05 | `verify:rc-reality` | ✅ |

### P1 — 完整性守卫 ✅

| ID | 脚本 | 状态 |
|----|------|------|
| AUTO-06~11 | schema · stub-parity · router · sync · dual-stub · build | ✅ |

### P2 — 稳定性 / 边界 ✅

| ID | 任务 | 状态 |
|----|------|------|
| AUTO-13~17 | offline-sync · file-concurrency · m7-perf · coverage · visual | ✅ |

### P3 — 进阶（待做）

| ID | 任务 | 状态 |
|----|------|------|
| AUTO-18 | CI 三平台矩阵 | [ ] |
| AUTO-19 | Electron 无头 smoke | [ ] |
| AUTO-20 | 截图回归 | [ ] |

---

## 维护

- 新增 IPC → `channels.ts` + `verify:ipc-contract`
- 新增 i18n key → zh/en + `verify:i18n-keys`
- 改 UI 色/圆角 → [视觉.md](./视觉.md) + `docs/04` + `verify:visual`
- 改 docs/05 命令表或 RC 号 → `verify:docs-code`
- 全量视觉审计 → 更新 `视觉.md`（`lanpm-visual-audit`）
- 全量文档审计 → 更新 `代码文档差异.md` §2（`lanpm-docs-code-audit`）
- **发版前**：`verify:project` + `verify:m7` + `verify:docs-code -- --strict` + §视觉 阶段 A + §文档 DOC-02
