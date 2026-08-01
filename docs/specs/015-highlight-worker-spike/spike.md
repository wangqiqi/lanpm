# SPIKE 015 — Highlight.js Web Worker (highlight-worker-spike)

**Created**: 2026-08-01  
**Status**: Closed — **Defer（暂缓实现）**  
**Sprint id**: highlight-worker-spike  
**SPIKE IDs**: SPIKE-1163 – SPIKE-1167  
**Depends on**: v1.86.0 chat-perf-viewport · v1.85.0 chat-perf-p3 · `docs/优化.md` §5.17

## Executive Summary

| 结论 | **Defer** — 暂不立项 Worker 高亮实现 Sprint |
|------|---------------------------------------------|
| **理由** | v1.84–86 已将高亮限制在**严格视口 + 展开态**；主线程成本已边界化，Worker 引入异步复杂度与双端缓存，ROI 偏低 |
| **复评触发** | Packaged 回归 §2.2 仍见 `highlightCode` 尖峰；或用户展开 ≥200 行代码块时 UI 卡顿 ≥300ms |
| **若复评 Adopt** | 优先 **Dedicated Worker + 现有 `highlightSetup` 逻辑迁移**（非 Shiki 全量替换） |

---

## §现状（SPIKE-1163）

### 调用链

```
ChatVirtualMessageList
  → shouldDeferHeavyContentForRow (messageContentDefer)
  → MessageContentDeferProvider
  → MessageBubble → CodeBlock / MarkdownView
  → highlightCode (highlightSetup.ts)  // 主线程同步
```

### 已交付缓解（v1.84–v1.86）

| 措施 | 锚点 | 效果 |
|------|------|------|
| 视口 defer | `messageContentDefer.tsx` · `ChatVirtualMessageList.tsx` | 离屏行 `deferHeavyContent=true`，**不调用** `highlightCode` |
| 折叠延后 | `CodeBlock.tsx` L48：`shouldHighlight = !defer && (!collapsible \|\| expanded)` | >12 行默认折叠，折叠态无高亮 |
| 禁 `highlightAuto` | `highlightSetup.ts` L60：`plaintext` 回退 | 避免全库语言探测 |
| LRU 缓存 | `LruMap` 200 条 `(lang,codeHash)` | 重复块 O(1) |
| 长度上限 | `HIGHLIGHT_MAX_CHARS = 50_000` | 超长截断 |
| Markdown memo | `MarkdownView` `cacheKey` | 父重渲染不重复解析 |

### 仍留在主线程的场景

1. **视口内**且（短代码 **或** 用户点击「展开」）→ 同步 `hljs.highlight`
2. 首次展开长代码块 → 可能 50–200ms+（与语言/长度相关）
3. `useMemo` 在 `shouldHighlight` 翻转时仍阻塞 render 提交

### 性能预算（引用）

`docs/specs/009-chat-perf-observe/spec.md` · `docs/templates/chat-perf-regression.md`：

- 滚动 10s Scripting **< 500ms**
- 无**持续**离屏 `highlightCode` 尖峰（defer 已覆盖）

**结论**：开放项「Worker 高亮」针对的是 **立项前** 全量高亮路径；当前架构下高亮已是 **按需、有界** 子集。

---

## §Worker 路径（SPIKE-1164）

### 技术栈约束

| 项 | 现状 |
|----|------|
| 打包 | Electron + Vite（renderer） |
| 高亮库 | `highlight.js` core + 12 语言分块注册（`highlightSetup.ts`） |
| 仓内 Worker | **无** Dedicated Worker 先例 |
| Vite | 支持 `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })` |

### 建议 Worker 契约（若实现）

```typescript
// highlight.worker.ts
type HighlightRequest = { id: number; code: string; language: string }
type HighlightResponse =
  | { id: number; ok: true; html: string }
  | { id: number; ok: false; error: string }

// Renderer: highlightCodeAsync(code, lang) → Promise<string>
// - 复用 highlightSetup 注册表（worker 内 duplicate ensureRegistered）
// - LRU 可保留 renderer 侧（按 html 缓存）或 worker 侧（按请求去重）
```

### 集成改动面

| 文件 | 改动 |
|------|------|
| `highlight.worker.ts` | 新建 · 迁入 `highlightCode` 逻辑 |
| `highlightSetup.ts` | 导出 async API + 主线程 fallback（测试/SSR） |
| `CodeBlock.tsx` | `useState` loading skeleton · `useEffect` 请求 · 取消陈旧 id |
| `MarkdownView` | 内嵌 `CodeBlock` 已覆盖；无额外路径 |
| 测试 | 单元测 worker 纯函数；E2E 可选 |

### Electron 注意点

- Worker 与 renderer **同 origin**（`file://` / `localhost`）— Vite dev & build 均支持 module worker
- **勿**在 worker 内访问 `document`（hljs 仅 `highlight` API 无 DOM 依赖 — ✅）
- 语言 CSS 仍在 renderer `useHighlightTheme` 注入 — 不变

### 成本估算

| 维度 | 评估 |
|------|------|
| 实现 | **M**（3–5 TASK，含 async UI 与取消） |
| 风险 | 竞态（快速滚动/折叠）、双端缓存一致性 |
| 收益 | 展开长块时主线程不阻塞；滚动停止后高亮「渐进」 |
| 回归 | 全链 `verify:chat-perf*` + 人工 §2.2 |

---

## §替代方案（SPIKE-1165）

| 方案 | 做法 | 优点 | 缺点 | 结论 |
|------|------|------|------|------|
| **A. 维持现状** | 依赖 defer + LRU + 折叠 | 零复杂度；已满足预算 | 展开超长块仍可能卡一下 | **当前推荐** |
| **B. Dedicated Worker + hljs** | 上节契约 | 最小依赖变更；逻辑可迁移 | async UI · 缓存分裂 | **Adopt 时首选** |
| **C. Shiki / shiki-wasm** | 替换高亮引擎 | 主题一致性好 | 包体↑ · 与现有 hljs CSS 脱节 · 迁移 L | **不推荐** |
| **D. requestIdleCallback 队列** | 主线程空闲时再 highlight | 实现轻 | 仍占主线程长任务；滚动时 idle 不可靠 | **不推荐单独做** |
| **E. 预高亮 + 持久化 HTML** | DB 存 highlighted html | 零运行时 | 存储膨胀 · 主题切换失效 · 撤回编辑复杂 | **不做** |

### rIC 补充说明

`requestIdleCallback` 可把 `highlightCode` 推迟到空闲回调，但：

1. 用户展开代码时期望**即时**着色 — idle 延迟可感知  
2. 快速滚动时 browser 可能**不调度** idle  
3. 不能与 Worker 叠加为首选；仅作 B 的备选降级

---

## §Decision（SPIKE-1166）

### 拍板

| 决策 | **Defer（暂缓）** |
|------|-------------------|
| 不立项 | `highlight-worker` 实现 Sprint（本季度） |
| 文档 | `docs/优化.md` §5.17 / §1 标「已调研 · 暂缓」 |
| 候选 | 保留 `highlight-worker` 于 plan 候选表，附复评条件 |

### 复评条件（满足任一 → `/plan` 实现 Sprint）

1. `docs/templates/chat-perf-regression.md` §2.2 **连续两版** packaged 抽检失败（离屏/展开尖峰）  
2. 产品反馈：展开 ≥100 行代码块明显卡顿  
3. 新增「默认展开代码」类消息类型（扩大高亮面）

### 若 Adopt — 实现 Sprint 提纲（≤8 TASK）

| ID | Task | Target |
|----|------|--------|
| TASK-1170 | Spec `016-highlight-worker` | `docs/specs/016-highlight-worker/spec.md` |
| TASK-1171 | `highlight.worker.ts` + 语言注册迁移 | `highlight.worker.ts` |
| TASK-1172 | `highlightCodeAsync` + 取消/去重 | `highlightSetup.ts` |
| TASK-1173 | `CodeBlock` async UI（skeleton · error fallback） | `CodeBlock.tsx` |
| TASK-1174 | `verify:highlight-worker` 静态 + 单测 | `tests/` |
| TASK-1175 | `verify:chat-perf*` 回归 | CI |
| TASK-1176 | `docs/优化.md` · CHANGELOG | `docs/` |
| TASK-1177 | Sprint closeout | archive |

**预估**：1 Sprint · patch/minor · 无新 npm 依赖（沿用 highlight.js）

---

## §References

- `src/renderer/src/features/chat/highlightSetup.ts`
- `src/renderer/src/features/chat/CodeBlock.tsx`
- `src/renderer/src/features/chat/messageContentDefer.tsx`
- `docs/specs/007-chat-perf-p3/spec.md` · `008-chat-perf-viewport` · `009-chat-perf-observe`
- `docs/templates/chat-perf-regression.md` §2.2
