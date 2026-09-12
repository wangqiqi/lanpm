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
| Chat perf guards | `npm run verify:chat-perf-observe` | Local budget file under `.cursorGrowth/` if present |
| Before tag | `npm run verify:m7` | Full RC regression |
| Release candidate | `npm run verify:release-gate` | Aggregates p0 + project + pairing + visual policy |
| Acceptance | `npm run dev` | **Electron** — not `npm run dev:web` (browser stub) |

`package.json` `scripts` is the command list. Extra `verify:*` names are for maintainers; you do not need them for a first contribution.

## README screenshots

```bash
npm run screenshots:capture
npm run screenshots:sync-readme
```

Capture writes light/dark PNGs (setup + main views). `sync-readme` copies the light set into `assets/` for the GitHub README and this site. Linux: prefix with `xvfb-run -a`. Screenshot capture is **not** a PR hard gate.

## Agent workflow (Super Cursor)

This repo ships a Cursor SOP under `.cursor/`: `/plan` · `/run` · `/master`. See `.cursor/AGENTS.md` in a clone.

## License

LanPM is released under [AGPL-3.0-or-later](https://github.com/wangqiqi/lanpm/blob/master/LICENSE). By contributing, you agree that your contributions will be licensed under the same terms.

## Report issues

Use [GitHub Issues](https://github.com/wangqiqi/lanpm/issues) with environment, repro steps, expected vs actual behavior.
