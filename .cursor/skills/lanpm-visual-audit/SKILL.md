---
name: lanpm-visual-audit
description: >-
  Runs LanPM renderer visual consistency checks: npm run verify:visual,
  static CSS/token audit, and tracks docs/06 §2.6. Use for visual/UI consistency,
  视觉一致性, V-14b, verify:visual, theme audit, or before major release.
---

# LanPM 视觉一致性审计

## 何时执行

| 模式 | 触发 | 深度 |
|------|------|------|
| **门禁** | 发版 / RC / `verify:m7` 前 | `verify:visual` + `docs/06` §2.6 未完成项 |
| **全量审计** | 用户要求视觉校验 / 更新报告 | 静态扫描 + 可选写入归档（见下） |
| **修复后** | 改过 `src/renderer` 样式 | `verify:visual` + 相关 VIS-* |

## SSOT

1. [docs/04_交互与UI约定.md](../../../docs/04_交互与UI约定.md)
2. [docs/06 §2.6](../../../docs/06_验收与里程碑计划.md#26-手验待办ssot)
3. [docs/05_测试与联调发布.md](../../../docs/05_测试与联调发布.md) §2 — V-14b

## 工作流

```bash
cd /home/saida/workspace/lanpm
npm run verify:visual
npm run verify:m7                # 发版前
```

全量审计时在 `src/renderer` grep：禁止 `#1677ff`；警惕 Ant 语义色硬编码与 `var(--lanpm-*, rgba(0,0,0,*)` fallback。

**V-14b**：亮/暗七页手验，`{theme}_{page}.png` 存 `.lanpm/visual-screenshots/`，勿提交 git。见 `docs/05` §2.2。

## 输出

| 场景 | 动作 |
|------|------|
| 门禁 | 汇报脚本结果 + `docs/06` §2.6 勾选建议 |
| 全量审计 | 待办只更新 `docs/06` §2.6；若需留档，新建 `archive/audit/visual/YYYYMMDD_HHMMSS_视觉一致性校验.md`（勿在 `docs/`、`.cursor/` 中加链接） |
| 修 VIS-* | 改代码后重跑 `verify:visual` |

文档差异用 `lanpm-docs-code-audit`（`docs/01–06` + `verify:docs-code`）。

## 发版前

- [ ] `verify:project` && `verify:m7` 绿
- [ ] `docs/06` §2.6 / V-14b / VIS-* 已处理或注明豁免
- [ ] 无新增禁止色

## 勿做

- 不提交 V-14b 截图
- 不削弱 `verify-visual.ts` 断言
- 不把 `archive/prototypes/` 当现行规范
