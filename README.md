# LanPM

局域网项目管理系统 — 以苹果风格 UI 为目标的单页原型。

## 快速开始

在浏览器中直接打开原型：

```bash
# 任选其一
xdg-open index.html    # Linux
open index.html        # macOS
start index.html       # Windows
```

或使用本地静态服务（推荐，避免部分 API 受 file:// 限制）：

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 仓库结构

| 文件 | 说明 |
|------|------|
| `index.html` | 当前主原型（HTML + CSS + JS 单文件） |
| `plan.md` | 重构与功能扩展计划 |
| `CHANGELOG.md` | 版本与变更记录 |

## 路线图

详见 [plan.md](./plan.md)：顶部栏、紧凑布局、底部四视角（聊天 / 看板 / 任务树 / 甘特图）及看板拖拽等。

## 版本

当前基线：`v0.1.0-prototype`（见 [CHANGELOG.md](./CHANGELOG.md)）
