# LanPM 截图资产

| 目录 | 用途 | 进 git |
|------|------|--------|
| `.lanpm/visual-screenshots/` | `verify:visual-screenshots` **临时**输出 | ❌ gitignore |
| `docs/screenshots/baselines/` | 亮/暗主题**基线** PNG（人工认可后入库） | ✅ |
| `docs/screenshots/manual/` | 手工评估 / Snipaste 对照图 | ✅ |
| `docs/screenshots/generated/` | 发版前从 `.lanpm/` 复制的全集（SPRINT-13） | 可选 |
| `assets/` | **README 门面**（由 `screenshots:sync-readme` 从无头亮主题同步） | ✅ |

## 生成无头截图

```bash
npm run build && npm run verify:visual-screenshots
```

- 默认输出：`.lanpm/visual-screenshots/`
- 覆盖：**setup** + **八视图**（chat · board · tree · gantt · calendar · whiteboard · files · cockpit）× 亮/暗 = **18** PNG
- Linux：`xvfb-run -a npm run verify:visual-screenshots`

## 与 CI / 发版

- **不进** `verify:release-gate` / PR 硬门禁（甘特在无头 GHA 曾不稳定）
- 发版可选步见 `docs/05` §2 · SPRINT-13 `screenshots:capture` + `screenshots:sync-readme`

## 历史

- 原 `snapshot/` 已迁入本目录（SPRINT-12，2026-07-29）
