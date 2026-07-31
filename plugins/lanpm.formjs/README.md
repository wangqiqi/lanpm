# LanPM Form-js Plugin

可购表单插件 `lanpm.formjs`：`@bpmn-io/form-js` 真库渲染，**不进**根 `package.json` 必选依赖。

## 安装 form-js（可选）

Pro/真库 UI 依赖 `@bpmn-io/form-js`：

```bash
npm install --prefix plugins/lanpm.formjs
```

未安装时 Host 自动降级为内置 POC 手写渲染器，并提示上述命令。

## Schema

- SSOT：`demo-schema.json`（`labelKey` → Host i18n 解析为 form-js `label`）
- Slot：`task.detail.section`（任务详情「扩展（插件）」）

## 验收

- `npm run verify:formjs-plugin`
- `npm run verify:plugin-loader`（核心 deps 仍不得含 `@bpmn-io/form-js`）
