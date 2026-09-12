# `plugins/` — 官方 / 示例插件包

Host（main）从本目录发现 `*/plugin.json`。

| 目录 | id | 说明 |
|------|-----|------|
| `lanpm.backup/` | `lanpm.backup` | 群备份（`profile.data.backup` · **默认开启**） |
| `lanpm.meeting/` | `lanpm.meeting` | 会议（`chat.toolbar.media` · 默认关闭） |

官方扩展均为 **`pricing: free`**。API 样例 manifest：`tests/fixtures/lanpm.example.plugin.json`（不随安装包分发）。

启用态：`userData/plugin-enabled.json`（默认启用）。

Renderer UI 由 Host **builtin registry** 按 `id` 挂载（安全：不执行插件目录任意 JS）。

开发者文档：**`docs/07_插件与扩展.md`**（上编 Slot/Capability · 中编离线分发 · 下编运维协作）。
