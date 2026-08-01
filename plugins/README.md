# `plugins/` — 官方 / 示例插件包

Host（main）从本目录发现 `*/plugin.json`。

| 目录 | id | 说明 |
|------|-----|------|
| `lanpm.example/` | `lanpm.example` | 免费 stub，验证 Slot |
| `lanpm.formjs/` | `lanpm.formjs` | 可购 form-js POC（schema 兼容；不进核心 deps） |
| `lanpm.meeting/` | `lanpm.meeting` | 可购会议 stub（`chat.toolbar.media` · 媒体 capability；默认关闭） |

启用态：`userData/plugin-enabled.json`（默认启用）。

Renderer UI 由 Host **builtin registry** 按 `id` 挂载（安全：不执行插件目录任意 JS）。

开发者文档：**`docs/07_插件与扩展.md`**（上编 Slot/Capability · 中编离线分发 · 下编运维协作）。
