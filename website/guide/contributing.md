# Contributing

Thank you for helping improve LanPM.

## Development workflow

```bash
npm install
npm run dev          # Electron app (source of truth)
npm run lint
npm run typecheck
npm run test
npm run verify:p0    # guards: IPC, i18n, docs, screenshots layout
```

Before a release candidate:

```bash
npm run verify:m7
npm run build
```

## Verification (common)

| When | Command | Note |
|------|---------|------|
| Daily / PR | `npm run verify:p0` | IPC, i18n, docs links, screenshot layout |
| Docs ↔ code | `npm run verify:docs-code -- --strict` | Also in `verify:project` |
| Chat perf guards | `npm run verify:chat-perf-observe` | Local budget: `.cursorGrowth/decisions/chat-perf.md` if present |
| Before tag | `npm run verify:m7` | Full RC regression |
| Acceptance | `npm run dev` | **Electron** — not `npm run dev:web` (browser stub) |

Full matrix: [docs/05 §1](https://github.com/wangqiqi/lanpm/blob/master/docs/05_测试与联调发布.md#1-自动化验收脚本).

## README screenshots

```bash
npm run screenshots:capture
npm run screenshots:sync-readme
```

See [docs/screenshots](https://github.com/wangqiqi/lanpm/tree/master/docs/screenshots) for the visual baseline workflow.

## Agent workflow (Super Cursor)

This repo ships [Super Cursor](https://github.com/wangqiqi/lanpm/tree/master/.cursor) SOP: `/plan` · `/run` · `/master`. See [`.cursor/AGENTS.md`](https://github.com/wangqiqi/lanpm/blob/master/.cursor/AGENTS.md).

## License

LanPM is released under [AGPL-3.0-or-later](https://github.com/wangqiqi/lanpm/blob/master/LICENSE). By contributing, you agree that your contributions will be licensed under the same terms.

## Report issues

Use [GitHub Issues](https://github.com/wangqiqi/lanpm/issues) with environment, repro steps, expected vs actual behavior.
