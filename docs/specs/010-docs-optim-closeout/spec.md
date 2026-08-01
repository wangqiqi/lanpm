# Feature Specification: Docs Optim Closeout (docs-optim-closeout)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: docs-optim-closeout  
**Depends on**: v1.87.0 chat-perf-observe

## Summary

`docs/优化.md` 初稿写于 v1.83 前代码评审，§1–§2 仍呈「未修复」口吻。本 Sprint **仅文档**：加状态列、历史说明、§5 开放项对齐、`06_ROADMAP` 反映 v1.83–v1.87 已交付。

## Goal

1. §1 问题摘要表增加 **状态** 列（✅ 版本 / ⬜ 候选 Sprint）。
2. §2 保留历史根因，节首标明「评审快照」。
3. §5 已完成建议标 ✅；剩余债指向 plan 候选（store-hooks · dm-preview · topbar · SPIKE）。
4. `06_ROADMAP` 聊天性能从 P1 待做 → 已交付 + 剩余债指针。
5. `verify:docs-optim-closeout` 静态守卫。

## Out of Scope

- 业务代码改动
- §2 全文删除或重写
- meeting-productization · store-hooks 实现

## Document Change List

| 文件 | 变更 |
|------|------|
| `docs/优化.md` | 页眉 · §1 状态列 · §2 横幅 · §5 标记 · §8 · §10.5 · §11 |
| `docs/06_ROADMAP.md` | §1 聊天性能行 · §0 候选 |
| `docs/00_文档导航.md` | 优化.md 一行补充 v1.87 观测链 |
| `tests/static/verify-docs-optim-closeout.ts` | 静态守卫 |
| `CHANGELOG.md` | `[1.88.0]` |

## Acceptance

- `npm run verify:docs-optim-closeout` 绿
- §1 每行有状态列；开放项仅：顶栏轮询 · Zustand 订阅 · `listDmPreviews` · Worker 高亮
- `06_ROADMAP` 无「Sprint 候选 chat-perf」过时表述
- CHANGELOG **1.88.0**

## Related Specs

- `docs/specs/005-chat-perf` … `009-chat-perf-observe`
- `docs/chat-perf-baseline.md` · `docs/templates/chat-perf-regression.md`
