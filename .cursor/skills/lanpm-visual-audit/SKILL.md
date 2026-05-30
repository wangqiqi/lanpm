---
name: lanpm-visual-audit
description: >-
  Runs LanPM renderer visual consistency checks: npm run verify:visual,
  static CSS/token audit, and tracks docs/06 §2.6. Use for visual/UI consistency,
  视觉一致性, V-14b, verify:visual, theme audit, 打版, 发布二进制.
---

# LanPM 视觉一致性审计

## 与发版两档的关系

发版 SSOT：`.cursor/rules/lanpm-release.mdc` + `.cursor/skills/lanpm-release/SKILL.md`。

| 档位 | 何时用本 skill | 深度 |
|------|----------------|------|
| **A 打版**（频繁） | 改过 `src/renderer` 样式后打版 / `verify:m7` 前 | `verify:visual`；大 UI 改动再扫 §2.6 |
| **B 发布二进制**（偶尔） | `verify:release-gate` / 出安装包前 | **门禁模式**全做 + `docs/06` §2.6 / V-14b |

A 档**不要**每次打版跑全量归档审计；B 档必须视觉门禁通过后再 push `v*` tag。

## 何时执行

| 模式 | 触发 | 深度 |
|------|------|------|
| **门禁** | B 档发布二进制 / `verify:release-gate` / RC 出包 | `verify:visual` + `docs/06` §2.6 未完成项 |
| **打版自检** | A 档打版、改过 renderer 样式 | `verify:visual`（`verify:m7` 已含部分检查） |
| **全量审计** | 用户要求视觉校验 / 更新报告 | 静态扫描 + 可选写入归档（见下） |
| **修复后** | 改过 `src/renderer` 样式 | `verify:visual` + 相关 VIS-* |

## SSOT

1. [docs/04_交互与UI约定.md](../../../docs/04_交互与UI约定.md)
2. [docs/06 §2.6](../../../docs/06_验收与里程碑计划.md#26-手验待办ssot)
3. [docs/05_测试与联调发布.md](../../../docs/05_测试与联调发布.md) §2 — V-14b

## 工作流

```bash
cd <仓库根目录>
npm run verify:visual
npm run verify:m7                # A 档打版（日常）
npm run verify:release-gate      # B 档发布二进制（含 verify:visual）
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

## 发版检查清单

**A 打版**（commit、不出二进制）：

- [ ] `verify:visual`（若本轮改过 renderer）
- [ ] `verify:m7` 绿

**B 发布二进制**（push `v*` tag 前）：

- [ ] 已完成当次 A 或等价 rc commit
- [ ] `verify:release-gate` 绿（内含 visual / project / m7）
- [ ] `docs/06` §2.6 / V-14b / VIS-* 已处理或注明豁免
- [ ] 无新增禁止色

## 勿做

- 不提交 V-14b 截图
- 不削弱 `verify-visual.ts` 断言
- 不把 `archive/prototypes/` 当现行规范
