# LanPM — Cursor 项目配置

| 路径 | 用途 |
|------|------|
| [skills/lanpm-visual-audit/SKILL.md](./skills/lanpm-visual-audit/SKILL.md) | **视觉一致性审计**工作流（发版门禁 / 用户主动要求 / 更新 `视觉.md`） |
| [rules/renderer-visual-tokens.mdc](./rules/renderer-visual-tokens.mdc) | 编辑 `src/renderer` 样式时的令牌与壳层约束 |
| [rules/release-visual-gate.mdc](./rules/release-visual-gate.mdc) | 发版 / RC 时提醒跑视觉门禁 |

## 怎么用

- **主动审计**：对话中说「做视觉一致性检测」「更新视觉.md」「跑 verify:visual」
- **发版前**：说「准备发 RC / 1.0.0 发版」— Agent 应加载 `lanpm-visual-audit` skill
- **改 CSS 时**：打开 `*.module.css` 时 `renderer-visual-tokens` 规则会自动附着

规范真源：`docs/04_交互与UI约定.md`、`视觉.md`、`todo.md` §视觉。
