# lanpm-gateway

**SPIKE-OPS-001** — 最小 HTTP 文件网关原型（目录列表 + 单文件上传/下载）。

真源：`docs/07_插件与扩展.md` §38 · spec：`.cursorGrowth/specs/012-ops-gateway-spike/spec.md`

## 快速开始

```bash
cd tools/lanpm-gateway
export LANPM_GATEWAY_ROOT=./data
npm start
# 另开终端
curl -s http://127.0.0.1:8787/health
curl -s 'http://127.0.0.1:8787/api/v1/list?dir='
curl -X PUT --data-binary @./README.md http://127.0.0.1:8787/api/v1/files/inbound/README.md
curl -s http://127.0.0.1:8787/api/v1/files/inbound/README.md
```

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `LANPM_GATEWAY_ROOT` | `./data` | 白名单根目录 |
| `LANPM_GATEWAY_HOST` | `127.0.0.1` | SPIKE 仅允许 localhost |
| `LANPM_GATEWAY_PORT` | `8787` | 监听端口 |
| `LANPM_GATEWAY_TOKEN` | — | 可选 `Authorization: Bearer` |
| `LANPM_GATEWAY_MAX_BYTES` | `67108864` | 单文件上传上限 |

## API

| Method | Path | 说明 |
|--------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/v1/list?dir=` | 单层目录列表 |
| PUT | `/api/v1/files/<rel>` | 上传（raw body） |
| GET | `/api/v1/files/<rel>` | 下载 |

## 测试

```bash
npm test
```

仓库根目录：`npm run verify:ops-gateway-spike`

## 边界

- 不接 LanPM 插件 / P2P / `lanpm-agent`
- 无分片断点续传（Phase 1 再评估）
