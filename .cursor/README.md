# LanPM — Cursor 项目配置

| 路径 | 用途 |
|------|------|
| [skills/lanpm-visual-audit/SKILL.md](./skills/lanpm-visual-audit/SKILL.md) | 视觉审计 → 输出 **`视觉.md`** |
| [skills/lanpm-docs-code-audit/SKILL.md](./skills/lanpm-docs-code-audit/SKILL.md) | 文档↔代码审计 → 输出 **`代码文档差异.md`** |
| [rules/renderer-visual-tokens.mdc](./rules/renderer-visual-tokens.mdc) | 编辑 `src/renderer` 样式时的令牌与壳层约束 |
| [rules/release-visual-gate.mdc](./rules/release-visual-gate.mdc) | 发版 / RC 时提醒跑视觉 + 文档门禁 |

## 怎么用

| 诉求 | 说法 | 主输出 |
|------|------|--------|
| 视觉/UI | 「做视觉一致性检测」「更新视觉.md」 | `视觉.md` |
| 文档/实现 | 「文档和代码一致性」「更新代码文档差异」 | `代码文档差异.md` |
| 发版 | 「准备发 RC / 1.0.0」 | 两者 + `verify:m7` |

```bash
npm run verify:visual      # UI 静态守卫
npm run verify:docs-code   # 刷新 代码文档差异.md §1
npm run verify:docs-code -- --strict  # 有 §1 差异则失败
npm run verify:p0          # 文档链接、RC 依赖等
```

规范真源：`docs/04` + `视觉.md`；`docs/01–06` + `代码文档差异.md`。
