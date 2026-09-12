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
| 聊天性能守卫 | `npm run verify:chat-perf-observe` | 预算文件在本地 `.cursorGrowth/`（若有） |
| 打 tag 前 | `npm run verify:m7` | 全量 RC 回归 |
| 发版候选 | `npm run verify:release-gate` | 聚合 p0 + project + 配对 + 视觉策略 |
| 产品验收 | `npm run dev` | **Electron** 为准 — 非 `npm run dev:web`（浏览器 stub） |

命令清单以 `package.json` 的 `scripts` 为准。其余 `verify:*` 给维护者用，第一次贡献不必全跑。

## README 截图

```bash
npm run screenshots:capture
npm run screenshots:sync-readme
```

capture 会生成亮/暗主题 PNG（配置向导 + 主视图）。`sync-readme` 把亮色图拷到 `assets/`，供 GitHub README 和本站使用。Linux 可加 `xvfb-run -a`。截图管线**不是** PR 硬门禁。

## Agent 工作流（Super Cursor）

本仓在 `.cursor/` 内置 SOP：`/plan` · `/run` · `/master`。克隆后见 `.cursor/AGENTS.md`。

## 许可证

LanPM 以 [AGPL-3.0-or-later](https://github.com/wangqiqi/lanpm/blob/master/LICENSE) 发布。贡献即表示同意以相同许可授权。

## 反馈问题

请在 [GitHub Issues](https://github.com/wangqiqi/lanpm/issues) 提供环境、复现步骤、预期与实际行为。
