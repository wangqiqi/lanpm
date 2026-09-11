# 快速开始

**环境：** Node.js 20+、npm 10+、Git。

```bash
git clone https://github.com/wangqiqi/lanpm.git
cd lanpm
chmod +x onekey_run.sh    # Unix 首次
./onekey_run.sh start     # 或 npm install && npm run dev
```

| 系统 | 命令 |
|------|------|
| Windows CMD | `onekey_run.bat start` |
| PowerShell | `.\onekey_run.ps1 start` |
| Git Bash / WSL | `./onekey_run.sh start` |

首次启动会跑简短配置向导，然后打开演示群 `#/g/demo-project/chat`。

**导航提示：** 甘特、日历、**文件** 等视图默认不在底栏；在 **头像 → 个人资料 → 导航与视图** 中开启。**白板** 仅能通过聊天协作抽屉或地址栏深链打开（不能作为底栏 Tab）。

## 本地验收

```bash
npm run lint && npm run typecheck && npm run test
npm run verify:p0
```

**注意：** 验收以 **Electron**（`npm run dev`）为准，不是浏览器 stub（`npm run dev:web`）。更多命令见 [参与贡献](/zh/guide/contributing#常用验收)。

## 安装包

预编译安装包见 [GitHub Releases](https://github.com/wangqiqi/lanpm/releases)，按系统与架构选择。

## 下一步

- [核心能力](/zh/guide/features)
- [参与贡献](/zh/guide/contributing)
- [工程文档](https://github.com/wangqiqi/lanpm/tree/master/docs)
