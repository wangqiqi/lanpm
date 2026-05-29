---
name: lanpm-docs-code-audit
description: >-
  Compares LanPM docs (docs/01–06, README) against code and package.json;
  runs verify:docs-code and verify:p0, updates 代码文档差异.md. Use for
  代码文档一致性, doc-code drift, 文档与实现差异, or before major release
  alongside lanpm-visual-audit.
---

# LanPM 代码与文档一致性审计

## 何时执行

| 模式 | 触发 | 输出 |
|------|------|------|
| **机读更新** | `npm run verify:docs-code` | 刷新 `代码文档差异.md` §1 |
| **全量审计** | 用户要求文档一致性 / 大版本发版 | **必须**更新 `代码文档差异.md` §1+§2 |
| **发版门禁** | RC / 1.0.0 前 | `verify:docs-code -- --strict` + `verify:p0` |

## SSOT

1. [代码文档差异.md](../../../代码文档差异.md) — **本审计主输出**
2. [docs/00_文档导航.md](../../../docs/00_文档导航.md) — 索引
3. [docs/01_产品需求文档.md](../../../docs/01_产品需求文档.md) — PRD / RC 现状
4. [docs/04_交互与UI约定.md](../../../docs/04_交互与UI约定.md) — UI（细节见 `视觉.md`）
5. [docs/05_测试与联调发布.md](../../../docs/05_测试与联调发布.md) — verify 命令表
6. [docs/06_验收与里程碑计划.md](../../../docs/06_验收与里程碑计划.md) — 发布门禁

视觉专项输出 **[视觉.md](../../../视觉.md)**，由 `lanpm-visual-audit` 维护，勿与本报告混写。

## 工作流

### 1. 自动化（必做）

```bash
cd /home/saida/workspace/lanpm
npm run verify:docs-code              # 写入/更新 代码文档差异.md §1
npm run verify:p0                     # docs-links、rc-reality 等
```

发版门禁：

```bash
npm run verify:docs-code -- --strict
```

### 2. 全量审计（Agent 补充 §2）

在 §1 无 P0 后，抽检并**写入 `代码文档差异.md` §2 表格**：

- PRD P0 功能是否在 `src/` 有对应实现（非仅类型/注释）
- `docs/01` §1.3 post-RC 表述 vs `package.json` dependencies
- `docs/06` 未勾选项 vs `todo.md` 实际状态
- README / CHANGELOG / `docs/01` RC 号是否一致（§1 已覆盖部分）

可参考归档：[archive/20260529_095839_实现文档一致性评估_评估.md](../../../archive/20260529_095839_实现文档一致性评估_评估.md)

### 3. 输出规则

| 场景 | 动作 |
|------|------|
| 仅跑脚本 | 更新 `代码文档差异.md` §1 + 生成日期；控制台摘要 |
| 全量审计 | §1 机读 + **§2 人工/Agent 表** + §3 分工说明保持完整 |
| 修复差异 | 优先改代码或改文档之一；**勿**只删报告行 |

## 与视觉审计的配合

发版前建议顺序：

1. `lanpm-visual-audit` → **`视觉.md`**
2. `lanpm-docs-code-audit` → **`代码文档差异.md`**
3. `npm run verify:m7`

## 勿做

- 不要把 PRD 全文复制进报告；用表格列差异点
- 不要用 `archive/` 内容覆盖 §1 机读结果
- 不要将 `代码文档差异.md` 与 `视觉.md` 合并为单文件
