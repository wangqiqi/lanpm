# 聊天性能基线记录

> **用途**：packaged build 人工抽检的**实测值**归档；发版前后对比。  
> **步骤**：`docs/templates/chat-perf-regression.md`  
> **预算阈值**：`docs/specs/009-chat-perf-observe/spec.md` §Budget

---

## 参考基线（v1.86.0 · chat-perf-viewport 后）

> 以下为 **2026-08-01** 开发机参考值（非 CI 门禁）；新环境首次抽检可抄作对照，**须**在本机 packaged build 复测后更新。

| 指标 | 阈值（通过） | v1.86 参考 | 待填（本机） |
|------|-------------|------------|--------------|
| 首屏 Scripting（3s） | < 800ms | ~450–600ms | |
| 滚动 Scripting（10s） | < 500ms | ~200–400ms | |
| 停滚恢复 | ≤ 1s | 通过 | |
| 滚动后 Heap Δ | 无阶梯暴涨 | ~10–25MB | |
| 切群后 Heap | 无泄漏式累积 | 通过 | |
| DOM 节点（500+ 群） | 亚线性于 N | ~视口×overscan | |
| `listMenus` 首屏 | ≤ 2 次 | 1–2 | |

**环境备注**：Linux x64 · Electron packaged · 测试群 500+ 条 · DevTools 关闭后录制

---

## 历史记录

| 版本 | 日期 | 执行人 | 首屏 Scripting | 滚动 Scripting | Heap Δ | 结论 | 备注 |
|------|------|--------|----------------|----------------|--------|------|------|
| v1.86.0 | 2026-08-01 | — | ~500ms | ~300ms | ~15MB | 参考 | viewport defer 后 |
| v1.87.0 | | | | | | | chat-perf-observe 文档 Sprint |

---

## 如何更新

1. 跑完 `docs/templates/chat-perf-regression.md` 勾选表。
2. 在 **历史记录** 追加一行（版本 · 日期 · 实测值 · 通过/失败）。
3. 若阈值需调整，改 `docs/specs/009-chat-perf-observe/spec.md` §Budget 并走 plan Sprint。
