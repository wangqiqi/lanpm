---
name: lanpm-docs-code-audit
description: >-
  Compares LanPM docs (docs/01–06, README) against code and package.json;
  runs verify:docs-code and verify:p0. Use for 代码文档一致性, doc-code drift,
  文档与实现差异, or before major release alongside lanpm-visual-audit.
---

# LanPM 代码与文档一致性审计

## 何时执行

| 模式 | 触发 | 输出 |
|------|------|------|
| **机读** | `npm run verify:docs-code` | 控制台 + 归档 §1（脚本写入） |
| **全量审计** | 文档一致性 / 大版本发版 | `docs/06` §2.6 + 可选归档 §2 表 |
| **发版门禁** | RC / 1.0.0 | `verify:docs-code -- --strict` + `verify:p0` |

## SSOT

1. [docs/00_文档导航.md](../../../docs/00_文档导航.md)
2. [docs/01_产品需求文档.md](../../../docs/01_产品需求文档.md)
3. [docs/04_交互与UI约定.md](../../../docs/04_交互与UI约定.md)
4. [docs/05_测试与联调发布.md](../../../docs/05_测试与联调发布.md)
5. [docs/06_验收与里程碑计划.md](../../../docs/06_验收与里程碑计划.md)
6. [docs/06 §2.6](../../../docs/06_验收与里程碑计划.md#26-手验待办ssot)

视觉专项用 `lanpm-docs-code-audit`，UI 规范以 `docs/04` 为准。

## 工作流

```bash
cd /home/saida/workspace/lanpm
npm run verify:docs-code
npm run verify:p0
npm run verify:docs-code -- --strict   # 发版
```

全量审计：§1 无 P0 后抽检 PRD P0、`docs/01` §1.3 vs 依赖树、`docs/06` §2.6 手验项、README/CHANGELOG RC 号。

## 输出

| 场景 | 动作 |
|------|------|
| 机读 | 跑脚本即可 |
| 全量 | **手验待办只写 `docs/06` §2.6**；差异表可写入 `archive/audit/docs-code/YYYYMMDD_HHMMSS_代码文档差异.md` |
| 修复 | 改代码或改 `docs/`，勿只删报告行 |

发版顺序：`lanpm-visual-audit` → 本 skill → `verify:m7`。

## 勿做

- 不要在 `docs/`、`.cursor/` 中链接 `archive/` 内文件
- 不要用旧归档覆盖 `verify:docs-code` 机读 §1
- 不要与视觉审计合并为单文件
