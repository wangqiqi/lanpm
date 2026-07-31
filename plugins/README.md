# `plugins/` — 官方 / 示例插件包

Host（main）从本目录发现 `*/plugin.json`。

| 目录 | id | 说明 |
|------|-----|------|
| `lanpm.example/` | `lanpm.example` | 免费 stub，验证 Slot |
| `lanpm.formjs/` | `lanpm.formjs` | 可购 form-js POC（schema 兼容；不进核心 deps） |

启用态：`userData/plugin-enabled.json`（默认启用）。

Renderer UI 由 Host **builtin registry** 按 `id` 挂载（安全：不执行插件目录任意 JS）。

开发者文档：**`docs/插件开发.md`**（Slot · Capability · manifest · **§3.5 Tab 视图宿主** · 生态规划）。
