# SPRINT-SETUP-NET · Setup 组网说明步

- **版本**：v1.45.0
- **日期**：2026-07-30
- **Goal**：首次 Setup 在身份表单前增加局域网组网教育步（交换机 / 路由器 / 热点），降低配对失败客服成本。

## 交付物

| 项 | 路径 |
|----|------|
| 组网步组件 | `src/renderer/src/features/setup/NetworkPrereqStep.tsx` |
| 两步向导 | `src/renderer/src/features/setup/SetupWizard.tsx` |
| 样式 | `src/renderer/src/features/setup/SetupWizard.module.css` |
| i18n | `setup.net*` ×11（zh-CN / en-US） |
| 静态验收 | `tests/static/verify-setup-net.ts` · `npm run verify:setup-net` |
| 文档 | `docs/配对码.md` §10 · `docs/04_交互与UI约定.md` §1.7 |

## 决策（已闭合）

- 步骤顺序：**网络 → 身份**
- 跳过：仅进入身份步，不持久化「不再提示」
- 图示：内联 SVG，不做真实网络检测

## 验收

- `verify:setup-net` ✅
- `verify:i18n-keys` ✅
- `typecheck` ✅
- `verify:release-gate` ✅（发版时）
