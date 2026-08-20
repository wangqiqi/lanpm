# LanPM Meeting Plugin

可购会议插件 `lanpm.meeting`：Lite mesh（2～4 人）+ Pro LiveKit 自托管 SFU。

## Pro 旁路部署（离线）

1. 将 `deploy/` 复制到内网可访问主机。
2. 复制 `deploy/.env.example` → `deploy/.env`，设置 `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`（Secret ≥ 32 字符）。
3. 编辑 `deploy/livekit.yaml` 中 `keys` 与 `.env` 一致。
4. 启动：

```bash
cd deploy
docker compose up -d
```

5. 在 LanPM **Profile → 会议旁路** 填写：
   - **URL**：`ws://<旁路主机>:7880`（或 `wss://` 若已配 TLS）
   - **API Key** / **API Secret**（与 compose 一致）

**禁止**默认连接公有 SFU。

## 可选：livekit-client

Pro 入会 UI 依赖 `livekit-client`（**不进**根 `package.json` 必选依赖）：

```bash
npm install --prefix plugins/lanpm.meeting
```

根目录 `optionalDependencies` 也会在 `npm install` 时尝试安装。

## 验收

- `npm run verify:meeting-livekit-pro`
- `npm run verify:meeting-mesh-poc`（Lite 不回归）
