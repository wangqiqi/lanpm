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
