# LanPM Todo

> **M0–M7 执行清单已归档**（2026-05-28 · `1.0.0-rc.1`）

| 文档 | 说明 |
|------|------|
| [archive/20260528_234920_M7完成_todo执行清单归档.md](./archive/20260528_234920_M7完成_todo执行清单归档.md) | 完整 M0–M7 任务清单（56 项，全部 `[x]`） |
| [docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md) | RC 手验项与已知限制 |
| [plan.md](./plan.md) | 里程碑总览与后续规划 |

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
