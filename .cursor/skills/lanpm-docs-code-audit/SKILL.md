---
name: lanpm-docs-code-audit
description: >-
  Compares LanPM docs (docs/01–06, README) against code and package.json;
  runs verify:docs-code and verify:p0. Use for 代码文档一致性, doc-code drift,
  文档与实现差异, 打版, 发布二进制, lanpm-release.
---

# LanPM 代码与文档一致性审计

## 与发版两档的关系

发版 SSOT：`.cursor/rules/lanpm-release.mdc` + `.cursor/skills/lanpm-release/SKILL.md`。

| 档位 | 本 skill 用法 |
|------|----------------|
| **A 打版**（频繁） | 可选 `verify:docs-code`（非 strict）；README/CHANGELOG rc 与 `package.json` 一致即可 |
| **B 发布二进制**（偶尔） | **发版门禁模式**：`verify:docs-code -- --strict` + `verify:p0`（亦包含在 `verify:release-gate`） |

## 何时执行

| 模式 | 触发 | 输出 |
|------|------|------|
| **机读** | `npm run verify:docs-code` | 控制台 + 归档 §1（脚本写入） |
| **全量审计** | 文档一致性 / 大版本规划 | `docs/06` §2.6 + 可选归档 §2 表 |
| **发版门禁** | B 档发布二进制 / `verify:release-gate` | `verify:docs-code -- --strict` + `verify:p0` |

## SSOT

1. [docs/00_文档导航.md](../../../docs/00_文档导航.md)
2. [docs/01_产品需求文档.md](../../../docs/01_产品需求文档.md)
3. [docs/04_交互与UI约定.md](../../../docs/04_交互与UI约定.md)
4. [docs/05_测试与联调发布.md](../../../docs/05_测试与联调发布.md)
5. [docs/06_验收与里程碑计划.md](../../../docs/06_验收与里程碑计划.md)
6. [docs/06 §2.6](../../../docs/06_验收与里程碑计划.md#26-手验待办ssot)

视觉专项用 `lanpm-visual-audit`，UI 规范以 `docs/04` 为准。

## 工作流

```bash
cd <仓库根目录>
npm run verify:docs-code
npm run verify:p0
npm run verify:docs-code -- --strict   # B 档发布二进制
npm run verify:release-gate            # B 档聚合（已含 docs-code --strict）
```

全量审计：§1 无 P0 后抽检 PRD P0、`docs/01` §1.3 vs 依赖树、`docs/06` §2.6 手验项、README/CHANGELOG RC 号。

## 输出

| 场景 | 动作 |
|------|------|
| 机读 | 跑脚本即可 |
| 全量 | **手验待办只写 `docs/06` §2.6**；差异表可写入 `archive/audit/docs-code/YYYYMMDD_HHMMSS_代码文档差异.md` |
| 修复 | 改代码或改 `docs/`，勿只删报告行 |

**A 打版**：CHANGELOG + rc → 可选本 skill 机读 → `verify:m7` → commit（不 push tag）。

**B 发布二进制**：先完成 A → `lanpm-visual-audit`（门禁）→ 本 skill（`--strict` + `verify:p0`）或直跑 `verify:release-gate` → push `v*` tag。

## 勿做

- 不要在 `docs/`、`.cursor/` 中链接 `archive/` 内文件
- 不要用旧归档覆盖 `verify:docs-code` 机读 §1
- 不要与视觉审计合并为单文件
