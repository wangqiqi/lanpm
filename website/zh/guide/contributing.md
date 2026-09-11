# 参与贡献

感谢你愿意改进 LanPM。

## 开发流程

```bash
npm install
npm run dev          # Electron（验收真源）
npm run lint
npm run typecheck
npm run test
npm run verify:p0    # IPC、i18n、文档、截图布局等门禁
```

发版候选前：

```bash
npm run verify:m7
npm run build
```

## 常用验收

| 场景 | 命令 | 说明 |
|------|------|------|
| 日常 / PR | `npm run verify:p0` | IPC、i18n、文档链、截图布局 |
| 文档 ↔ 代码 | `npm run verify:docs-code -- --strict` | 亦含于 `verify:project` |
| 聊天性能守卫 | `npm run verify:chat-perf-observe` | 预算见本地 `.cursorGrowth/decisions/chat-perf.md`（若有） |
| 打 tag 前 | `npm run verify:m7` | 全量 RC 回归 |
| 产品验收 | `npm run dev` | **Electron** 为准 — 非 `npm run dev:web`（浏览器 stub） |

完整矩阵：[docs/05 §1](https://github.com/wangqiqi/lanpm/blob/master/docs/05_测试与联调发布.md#1-自动化验收脚本)。

## README 截图

```bash
npm run screenshots:capture
npm run screenshots:sync-readme
```

视觉基线流程见 [docs/screenshots](https://github.com/wangqiqi/lanpm/tree/master/docs/screenshots)。

## Agent 工作流（Super Cursor）

本仓内置 [Super Cursor](https://github.com/wangqiqi/lanpm/tree/master/.cursor) SOP：`/plan` · `/run` · `/master`。见 [`.cursor/AGENTS.md`](https://github.com/wangqiqi/lanpm/blob/master/.cursor/AGENTS.md)。

## 许可证

LanPM 以 [AGPL-3.0-or-later](https://github.com/wangqiqi/lanpm/blob/master/LICENSE) 发布。贡献即表示同意以相同许可授权。

## 反馈问题

请在 [GitHub Issues](https://github.com/wangqiqi/lanpm/issues) 提供环境、复现步骤、预期与实际行为。
