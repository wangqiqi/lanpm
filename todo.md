# LanPM Todo

> 发布前：`npm run verify:project` && `npm run verify:m7`。

---

## P2 发版阻断

| ID | 任务 | 来源 | 状态 |
|----|------|------|------|
| **V-14b** | 亮/暗七页人工审阅（SEM/HOV/有任务甘特） | `docs/05` §2.2 · `docs/06` §2.5 | [ ] |
| **DOC-02** | 06 人工验收项收尾（AUTO-20 / DOC-F-03 已对齐） | `docs/06` §2.5 | [ ] |
| **DOC-ACC-01** | V-14b 与 06 §2.5 拆项对齐 | `docs/06` §2.5 | [x] |

```bash
npm run verify:project && npm run verify:m7
npm run verify:docs-code -- --strict
npm run verify:visual
npm run build && npm run verify:visual-screenshots   # 生成 .lanpm/visual-screenshots/*.png
```

---

## V-14b 手验（截图 + 人工）

> **七页**：Setup · Chat · Board · Tree · Gantt · Files · Cockpit — 亮/暗各一套 → `.lanpm/visual-screenshots/{theme}_{page}.png`（**勿提交仓库**）。  
> **顺序**：`verify:visual-screenshots` → 暗色页 → 亮色页 → hover/语义色。

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| AUTO-20 | 14 张 PNG 生成 + 亮暗 MD5 校验 | `verify:visual-screenshots` | [x] |
| V-14b-D | 暗色七页截图人工核对 | `dark_*.png`；空态甘特已无白条，**有任务时**再手验时间轴 | [ ] |
| V-14b-L | 亮色七页截图人工核对 | `light_*.png` | [ ] |
| V-14b-GNT | 甘特修复后复截确认 | AUTO-20 种子任务 + 暗色时间轴无白条 ✅ | [x] |
| V-14b-SEM | 暗色语义色观感 | 红/绿/黄（TopBar 网络点、错误态、标签） | [ ] |
| V-14b-HOV | Ant vs `RegionButton` / `ViewSegment` hover | 顶栏、底栏、文件/甘特分段 | [ ] |
| VIS-08 | V-14b 总勾选 | 与上表同项，视觉报告 ID | [ ] |

---

## 手验（`docs/06` · 真环境）

| ID | 任务 | 可减轻的自动化 | 状态 |
|----|------|----------------|------|
| DOC-ACC-02 | 三平台冒烟 | AUTO-18 CI 矩阵 ✅；真机 UI 抽检 | [ ] |
| DOC-ACC-03 | 局域网双机真网联调 | AUTO-10 `verify:dual-stub` ✅ + 两台真机 | [ ] |
| — | 性能手测填表 | m7-perf 三行已写入 `docs/06` §2.4；冷启动/内存/Tab 待手测 | [ ] |
| DOC-ACC-04 | I18N-05 英文 UI 走查 | `verify:i18n-en` ✅（m7）；长文案折行人工 | [ ] |
| — | 发布 1.0.0 | 上表 + V-14b + DOC-02 全部 [x] | [ ] |

---

## 视觉 — 非阻断 / 改进（P3~P4）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| VIS-07b | 业务模块离散 `font-size` 迁 `--lanpm-font-*` | VIS-07 主干已落地；chat/board/gantt 等逐步替换 | [ ] |
| — | 圆角 6/10/12/14 混用治理 | 文档已三级（VIS-04 ✅）；新模块遵守 `docs/04` §1.3 | [ ] |
| — | `RootErrorBoundary` / 启动页残余硬编码色 | `crash.module.css` 已用 `--lanpm-*` 令牌 | [x] |

---

## 文档差异 — §2 backlog（非 P2 阻断）

| ID | 严重 | 任务 | 状态 |
|----|------|------|------|
| DOC-TECH-02 | P2 | 任务多机 CRDT（Yjs）vs 当前 `task_patch` | post-RC · `docs/08` |
| DOC-F-02 | P2 | 看板独立「标签」字段 | 产品 backlog |
| DOC-F-03 | P2 | 拖入垃圾桶删任务 vs PRD 表述 | ✅ `docs/04` §6.2 已对齐 `01` §7.3 |
| DOC-F-04 | P3 | 顶栏 Profile 面板 disabled 抽检 | ✅ `verify:profile-panel` |
| DOC-F-05 | P2 | 文件断点续传 | post-RC · `docs/08` |

---

## 维护（例行，非勾选）

- 新增 IPC → `channels.ts` + `verify:ipc-contract`
- 新增 i18n key → zh/en + `verify:i18n-keys`
- 改 UI 色/圆角 → `docs/04` + `verify:visual`
- 改 `docs/05` 命令表或 RC 号 → `verify:docs-code`
- **发版前**：`verify:project` + `verify:m7` + `verify:docs-code -- --strict` + **V-14b** + **DOC-02**
