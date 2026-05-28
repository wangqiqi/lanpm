# LanPM Todo

> **当前版本**：`1.0.0-rc.4` · M0–M7 已归档（`1.0.0-rc.1`）

| 文档 | 说明 |
|------|------|
| [archive/20260528_234920_M7完成_todo执行清单归档.md](./archive/20260528_234920_M7完成_todo执行清单归档.md) | 完整 M0–M7 任务清单（56 项，全部 `[x]`） |
| [docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md) | RC 手验项与已知限制 |
| [plan.md](./plan.md) | 目标、决策与路线索引（无逐条待办） |
| [archive/20260528_235810_M0-M7完成_plan逐阶段执行计划归档.md](./archive/20260528_235810_M0-M7完成_plan逐阶段执行计划归档.md) | M0–M7 逐阶段执行计划（自 plan.md 迁出） |

---

## RC → 正式版（手验）

- [ ] 三平台冒烟（Win / macOS / Linux）
- [ ] 性能手测填表（docs/06 §3：冷启动 / 内存 / Tab P95）
- [ ] 局域网双机真网联调（docs/06 §4）
- [ ] 发布 **`1.0.0`**

---

## v1.1+ backlog

- [x] 顶栏全局搜索（任务 + 消息）（DoD：`search:query` IPC + `GlobalSearch` + `verify:search`）
- [x] 看板删除任务 UI（DoD：`task:deleteTask` 软删除 + `KanbanCard` Popconfirm）
- [ ] 任务 P2P / Yjs 同步
- [ ] 远端文件 P2P 下载

---

## 视觉一致性（v1.0.x 补丁，2026-05-28 审计）

> 原则摘要见 [plan.md §11](./plan.md#11-视觉一致性原则摘要)。

### P0 — 设计令牌与暗色

- [x] **V-01** 在 `global.module.css` 补全 `--lanpm-border` / `--lanpm-bubble-bg` / `--lanpm-code-bg` 及 accent 半透明变量
- [x] **V-02** 模块 CSS 强调色改 `var(--lanpm-accent*)`（chat / board / gantt / files / avatar）
- [x] **V-03** `TaskTreeView` 空状态改用 `ViewEmptyHint`（`--lanpm-text-secondary`）

### P1 — 布局与页级结构

- [x] **V-04** `ViewHeader` 统一页标题 level 4（群组 + 驾驶舱）
- [x] **V-05** `MainLayout` 主区内边距 16px
- [x] **V-06** TopBar 56px、BottomNav 64px（与 `docs/05` §1 一致）
- [x] **V-07** 驾驶舱去掉 `max-width` 窄栏，与群组页同宽外壳

### P2 — 模块内模式统一

- [x] **V-08** `ViewToolbar` / `ViewToolbarGroup`（看板 / 树 / 甘特 / 文件）
- [x] **V-09** `ViewLoadingCenter` / `ViewEmptyHint` 统一加载与空状态
- [x] **V-10** 甘特 `todayColor` + 暗色 `.chartWrap` 覆盖
- [x] **V-11** 页标题语义落文档：`docs/05` §1.1（聊天=群名，任务视图=模块名）

### P3 — 清理与文档

- [x] **V-12** 删除遗留 `features/shell/*`、`features/views/*`、`GroupView` M1 占位分支
- [x] **V-13** 更新 `docs/05` §1（尺寸、令牌、工具栏约定）
- [x] **V-14a** `npm run verify:visual` 静态守卫（已纳入 `verify:m7`）
- [ ] **V-14b** 亮/暗手验截图（步骤见 [docs/09_视觉手验清单.md](./docs/09_视觉手验清单.md)）
