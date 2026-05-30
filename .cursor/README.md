# LanPM — Cursor

| Skill / Rule | 用途 |
|--------------|------|
| **[lanpm-release](./skills/lanpm-release/SKILL.md)** + **[lanpm-release](./rules/lanpm-release.mdc)** | **A 打版**（频繁）：CHANGELOG · rc · `verify:m7` · commit，**不出包** · **B 二进制**（偶尔）：`verify:release-gate` · push `v*` tag |
| [lanpm-visual-audit](./skills/lanpm-visual-audit/SKILL.md) | `verify:visual` · A 打版自检 / **B 出包门禁** |
| [lanpm-docs-code-audit](./skills/lanpm-docs-code-audit/SKILL.md) | `verify:docs-code` · A 可选机读 / **B `--strict`** |
| [renderer-visual-tokens](./rules/renderer-visual-tokens.mdc) | 编辑 `src/renderer` |
| [release-visual-gate](./rules/release-visual-gate.mdc) | 仅视觉门禁（非完整发版时） |

**口令**：`发版`/`打版`/`release` → **A**（`verify:m7`）；`发布二进制`/`push release` → **B**（`verify:release-gate` + push `v*` tag → `release.yml` / 可选 `sync-r2.yml`）。手验：`docs/06` §2.6。
