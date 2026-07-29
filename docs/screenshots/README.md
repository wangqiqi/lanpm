# LanPM 截图资产

| 目录 | 用途 | 进 git |
|------|------|--------|
| `.lanpm/visual-screenshots/` | `verify:visual-screenshots` **临时**输出 | ❌ gitignore |
| `docs/screenshots/baselines/` | 亮/暗主题**基线** PNG（`screenshots:capture` 写入） | ✅ |
| `docs/screenshots/generated/` | 发版前从 `.lanpm/` 复制的全集 | ❌ gitignore |
| `assets/` | **README 门面**（`screenshots:sync-readme` 从 `light_*` 同步） | ✅ |

## 生成与更新 README 图

```bash
npm run screenshots:capture       # build + 18 PNG → baselines/ + generated/
npm run screenshots:sync-readme   # light_* → assets/（README 引用）
```

- 覆盖：**setup** + **八视图**（chat · board · tree · gantt · calendar · whiteboard · files · cockpit）× 亮/暗
- Linux：`xvfb-run -a npm run screenshots:capture`

## 与 CI / 发版

- **不进** `verify:release-gate` / PR 硬门禁
- 发版可选步见 `docs/05` §1.3 · **release** skill

## 历史

- 原 `snapshot/`、`docs/screenshots/manual/`（手工 Snipaste）已废弃；统一无头管线（SPRINT-12/13）
