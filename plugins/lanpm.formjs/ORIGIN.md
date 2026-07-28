# ORIGIN · lanpm.formjs

- Upstream: https://github.com/bpmn-io/form-js （MIT）
- Version: POC — **schema-compatible mini renderer**（本仓实现），未把 `@bpmn-io/form-js` 写入应用核心 `dependencies`
- License: MIT（上游）/ 本仓 POC UI AGPL 宿主侧
- Why not npm-only in core: 飞鸽 §7 / SPIKE — form-js 为**可购插件**，不进核心依赖树
- Local changes: demo schema 以 Host builtin `formJsDemoSchema.ts` 为 SSOT；UI 由 `FormJsPoc` 渲染；后续可替换为插件目录内完整 form-js 包
