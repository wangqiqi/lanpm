# LanPM Mind Map Plugin

可购思维导图插件 `lanpm.mindmap`：Layer C 整页 Tab + `mind-elixir` 真库渲染，**不进**根 `package.json` 必选依赖。

## 安装 mind-elixir（可选）

Pro/真库 UI 依赖 `mind-elixir`：

```bash
npm install --prefix plugins/lanpm.mindmap
```

未安装时 Host 自动降级为 `MindmapStub`（任务列表只读占位），并提示上述命令。

## Manifest

- Layer C：`contributions.views[]` → `/g/:groupId/mindmap`
- Slot：`mindmap.toolbar`（整页 toolbar zone）
- Capability：`task.list`（只读 POC，不写库）

## 验收

- `npm run verify:contributions-views`
- `npm run verify:plugin-loader`（核心 deps 仍不得含 `mind-elixir`）
