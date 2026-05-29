# LanPM Todo

> **原则**：能自动化的不手做。发布前最低门禁：`npm run verify:project` + `npm run verify:m7`（**92** 单元用例 + P0 守卫 + M0–M7 集成）。  
> **报告 SSOT**：[视觉.md](./视觉.md) · [代码文档差异.md](./代码文档差异.md) — **actionable 项以本文为准**。  
> **已完成归档**：[archive/20260529_140842_todo已完成项全量归档.md](./archive/20260529_140842_todo已完成项全量归档.md) · [archive/20260529_153500_todo已完成项_rc34后归档.md](./archive/20260529_153500_todo已完成项_rc34后归档.md)

---

## 当前优先（下一批执行）

> **来源**：rc.35 后剩余 P2 阻断为 **V-14b 人工审阅**；DOC-02 §2 初版已写入 `代码文档差异.md`，子项见 §文档。

### V-14b 手验（截图 + 人工）

| 优先级 | ID | 任务 | 说明 | 状态 |
|--------|-----|------|------|------|
| **P2** | **V-14b-D** | 暗色七页截图归档 | `npm run verify:visual-screenshots` 可生成；人工核对后本地归档 | [ ] |
| **P2** | **V-14b-L** | 亮色七页截图 | 同上 | [ ] |
| **P2** | **V-14b-SEM** | 暗色语义色观感 | 红/绿/黄 — 审阅已通过，勾选前再扫一眼 | [ ] |
| **P2** | **V-14b-HOV** | Ant vs `RegionButton` / `ViewSegment` hover | 顶栏、底栏、文件/甘特分段 | [ ] |
| **P2** | **V-14b-GNT** | 甘特修复后复截 | 对比 `dark_gantt.png` | [ ] |

**推荐顺序**：`verify:visual-screenshots` → V-14b-D/L/GNT → V-14b-HOV/SEM → DOC-02 收尾。

---

## 发版前总览（视觉 + 文档）

| 优先级 | 类别 | 必做项 | 状态 |
|--------|------|--------|------|
| **P2 阻断** | 视觉 | **V-14b** 手验审阅（截图可 AUTO-20 生成） | [ ] |
| **P2 阻断** | 文档 | **DOC-02** §2 无 P0 缺口（初版 ✅；PRD 表述/06 勾选收尾） | [ ] |
| **手验** | 全项 | §手验 表 | [ ] |

```bash
npm run verify:project && npm run verify:m7
npm run verify:docs-code -- --strict
npm run verify:visual
npm run build && npm run verify:visual-screenshots   # V-14b 截图
```

---

## 手验（真环境 / 人工仍不可完全替代）

| 项 | 来源 | 可减轻的自动化 | 状态 |
|----|------|----------------|------|
| 三平台冒烟 | 06 §2 | **AUTO-18** CI 矩阵 ✅ | [ ] |
| 性能手测填表 | 06 §3 | **AUTO-15** m7-perf ✅（已归档） | [ ] |
| 局域网双机真网联调 | 05 | **AUTO-10** dual-stub ✅ + 一台真机抽检 | [ ] |
| **V-14b** 亮/暗七页截图 | 视觉 §9.2 · 05 §2.2 | **AUTO-20** ✅（生成后人工审） | [ ] |
| V-14b 暗色语义色观感 | 视觉 §9.2 | 人工 | [ ] |
| V-14b Ant vs region hover | 视觉 §9.2 | 人工 | [ ] |
| I18N-05 英文 UI 走查 | 视觉 §9.2 | **AUTO-02** i18n-keys ✅ | [ ] |
| 发布 1.0.0 | 06 §2 | 上表 + V-14b + DOC-02 收尾 | [ ] |

**V-14b 七页**：Setup · Chat · Board · Tree · Gantt · Files · Cockpit — 亮/暗各一套，输出 `.lanpm/visual-screenshots/{theme}_{page}.png`，**勿提交仓库**。

---

## 视觉一致性（待办）

> **已完成**：阶段 A/B/C、VIS-FIX、VIS-08、AUTO-17/19/20 → [rc34 后归档](./archive/20260529_153500_todo已完成项_rc34后归档.md) + rc.35 CHANGELOG

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| V-14b | 亮/暗七页手验 + 人工审阅 | 05 §2.2 · 06 §2.5 | [ ] |

---

## 文档与代码一致性

> **§1 机读**：无差异 ✅ · **§2 初版**：2026-05-29 已写入 [代码文档差异.md](./代码文档差异.md)

| ID | 任务 | 状态 |
|----|------|------|
| DOC-02 | §2 统筹（初版 ✅；06 勾选 / PRD 表述统一收尾） | [ ] |
| DOC-PRD-01~03 | §2 结论：已闭环 | ✅ |
| DOC-TECH-01 | §2 结论：文档已降级 | ✅ |
| DOC-VIS-01 | §2 结论：已对齐 | ✅ |
| DOC-ACC-01 | V-14b / 06 勾选对齐 | [ ] |
| DOC-F-02~05 | §2 backlog（标签字段、续传等） | P2/P3 跟踪 |

---

## 维护

- 新增 IPC → `channels.ts` + `verify:ipc-contract`
- 新增 i18n key → zh/en + `verify:i18n-keys`
- 改 UI 色/圆角 → [视觉.md](./视觉.md) + `docs/04` + `verify:visual`
- 改 docs/05 命令表或 RC 号 → `verify:docs-code`
- **发版前**：`verify:project` + `verify:m7` + `verify:docs-code -- --strict` + V-14b 人工审 + DOC-02 收尾
