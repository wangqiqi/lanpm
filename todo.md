# LanPM Todo

> **M0–M7 执行清单已归档**（2026-05-28 · `1.0.0-rc.1`）

| 文档 | 说明 |
|------|------|
| [archive/20260528_234920_M7完成_todo执行清单归档.md](./archive/20260528_234920_M7完成_todo执行清单归档.md) | 完整 M0–M7 任务清单（56 项，全部 `[x]`） |
| [docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md) | RC 手验项与已知限制 |
| [plan.md](./plan.md) | RC→1.0 与 v1.1 backlog |
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

> 全页面静态审计（`layout/` + `views/` + 五大业务视图 + 首次配置 + 驾驶舱）。执行计划见 [plan.md §12](./plan.md#12-视觉一致性整改计划v10x-补丁)。

### P0 — 设计令牌与暗色

- [ ] **V-01** 在 `global.module.css` 补全 `--lanpm-border` / `--lanpm-bubble-bg` / `--lanpm-code-bg`（现多处 fallback 硬编码 rgba，与 `--lanpm-separator` 双轨）
- [ ] **V-02** 将模块 CSS 中 `#1677ff`、`rgba(22,119,255,*)` 替换为 `var(--lanpm-accent)` 及语义化半透明变量（涉及：`chat` / `board` / `gantt` / `files`；`ThemeProvider` 已配 `#0071e3` / `#0a84ff`）
- [ ] **V-03** `TaskTreeView` 空状态 `rgba(0,0,0,0.45)` 改为 `var(--lanpm-text-secondary)`（暗色下不可读）

### P1 — 布局与页级结构

- [ ] **V-04** 统一页标题：群组内业务视图 `Title level={4}`，驾驶舱与 docs/05 对齐（或抽 `ViewHeader`）
- [ ] **V-05** 主内容区内边距与 `docs/05` §1 对齐（约定 16px；当前 `MainLayout.main` 为 `20px 24px`，聊天 `12px 16px`，驾驶舱自带 `16px 20px`）
- [ ] **V-06** 顶栏/底栏高度与文档对齐或更新 `docs/05`（实现：TopBar **52px**、BottomNav **56px**；文档：顶栏 **56px**、底栏 **64px**）
- [ ] **V-07** 驾驶舱 `CockpitView` 与群组视图统一外壳（`max-width` / 内边距 / 标题层级；避免「居中窄栏」与其它页全宽割裂）

### P2 — 模块内模式统一

- [ ] **V-08** 抽公共 `ViewToolbar`（看板 / 树 / 甘特 / 文件工具栏布局、间距、主按钮位置一致）
- [ ] **V-09** 统一加载与空状态（`Spin` 居中 class、`EmptyHint` 文案样式；看板/树裸 `<Spin />` vs 甘特/文件带 class）
- [ ] **V-10** 甘特图暗色：`gantt-task-react` 默认样式 + `.chartWrap :global(.bar)` 硬编码色，需 `data-theme` 覆盖或主题变量
- [ ] **V-11** 聊天页标题显示群名/DM 名，其它视图显示模块名（看板/树等）— 确认产品意图后统一「上下文标题」规则

### P3 — 清理与文档

- [ ] **V-12** 删除或归档未引用遗留 UI：`features/shell/*`、`ViewPlaceholder`、`CockpitPlaceholder`、`GroupView` 末尾 M1 占位分支
- [ ] **V-13** 更新 `docs/05` §1 实测尺寸表，或按实现改顶栏/底栏高度
- [ ] **V-14** 手验清单：亮/暗色下逐页截图对比（聊天、看板、树、甘特、文件、驾驶舱、首次配置）
