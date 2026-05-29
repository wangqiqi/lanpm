---
name: lanpm-visual-audit
description: >-
  Runs LanPM renderer visual consistency checks: npm run verify:visual,
  static CSS/token audit, updates 视觉.md, and tracks todo.md §视觉 phases.
  Use when the user asks for visual/UI consistency review, 视觉一致性, V-14b,
  verify:visual, theme audit, or before a major release (发版, RC, 1.0.0,
  release checklist) that touches src/renderer.
---

# LanPM 视觉一致性审计

## 何时执行

| 模式 | 触发 | 深度 |
|------|------|------|
| **门禁** | 发版 / RC / `verify:m7` 前 | 跑脚本 + 确认 `todo.md` 阶段 A |
| **全量审计** | 用户要求「视觉校验」「更新视觉.md」 | 静态扫描 + 更新 `视觉.md` |
| **修复后** | 改过 `src/renderer` 样式 | `verify:visual` + 相关 VIS-* 项 |

## SSOT（按顺序读）

1. [docs/04_交互与UI约定.md](../../../docs/04_交互与UI约定.md) — 布局 56/64/16、令牌、regionInteract
2. [视觉.md](../../../视觉.md) — 最近一次审计结论
3. [todo.md](../../../todo.md) §视觉一致性计划 — 待办 VIS-* / V-14b
4. [docs/05_测试与联调发布.md](../../../docs/05_测试与联调发布.md) §2 — V-14b 手验七页

## 工作流

### 1. 自动化门禁（必做）

```bash
cd /home/saida/workspace/lanpm   # 使用仓库绝对路径
npm run verify:visual
npm run verify:m7                # 发版前；含 visual
```

失败则修 `src/renderer` 或 `tests/static/verify-visual.ts`，勿跳过。

### 2. 静态补充扫描（全量审计时）

在 `src/renderer` 内 grep：

- 禁止：`#1677ff`、`rgba(22, 119, 255`
- 警惕硬编码：`#ff4d4f`、`#52c41a`、`#faad14`（应逐步迁入 `--lanpm-success/warning/danger`，见 VIS-01）
- 警惕 fallback：`var(--lanpm-*, rgba(0, 0, 0,`（暗色语义错误，见 VIS-02）
- 布局：TopBar `56px`、BottomNav `64px`、`MainLayout` `padding: 16px`

七页视图须引用令牌：`Chat`、`Board`、`Tree`、`Gantt`、`Files`、`Cockpit`、`Setup`（`verify-visual.ts` 已守卫）。

### 3. 人工项（不能代替）

**V-14b**：亮/暗主题下七页手验 + 本地截图 `{theme}_{page}.png`，**勿提交仓库**。引导用户按 `docs/05` §2.2 勾选。

### 4. 输出

| 场景 | 动作 |
|------|------|
| 全量审计 | 更新根目录 `视觉.md` 日期、§10 问题清单、结论；与 `todo.md` 状态对齐 |
| 仅门禁 | 汇报 `verify:visual` / `verify:m7` 结果 + 阶段 A 未完成项 |
| 修 VIS-* | 改代码后重跑 `verify:visual`；用户要求发版时再动 `CHANGELOG.md` |

## 设计约束（摘要）

- 颜色：业务 CSS 用 `var(--lanpm-*)`；Ant 主题在 `ThemeProvider.tsx` 与 `global.module.css` 同步
- 圆角：面板 **8px**、控件 **10px**（Ant）、模态 **12–14px**（见 VIS-04）
- 新 Tab/分段：复用 `RegionTabBar` / `ViewSegment` + `regionInteract.module.css`
- 新功能视图：必须 `ViewHeader` + `ViewToolbar` + `ViewLoadingCenter`/`ViewEmptyHint`

## 发版前检查清单

- [ ] `npm run verify:project && npm run verify:m7` 绿
- [ ] `todo.md` §视觉 **阶段 A**（VIS-01~03 + V-14b）已勾选或明确豁免
- [ ] 无新增禁止色；`视觉.md` 日期已更新（若做了全量审计）

## 勿做

- 不要提交 V-14b 截图到 git
- 不要为通过审计而削弱 `verify-visual.ts` 断言（应修 UI）
- 不要改 `archive/prototypes/` 冒充现行规范
