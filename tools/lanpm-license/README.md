# lanpm-license

内网离线插件许可证 CLI（C++17 · CMake · OpenSSL Ed25519）。

## 子命令

```bash
# 用户机器：采集指纹（无私钥）
./lanpm-license collect -o machine-request.json

# 内网签发：试用 90 天（默认 term=trial）
./lanpm-license issue --request machine-request.json \
  --plugin lanpm.formjs --plugin lanpm.meeting \
  --term trial --key /secure/issuer-private.pem -o license.json

# 内网签发：永久授权
./lanpm-license issue --request machine-request.json \
  --plugin lanpm.formjs --term perpetual --key /secure/issuer-private.pem -o license.json

# 验签调试
./lanpm-license verify license.json
```

## 构建

```bash
cd tools/lanpm-license
cmake -S . -B build
cmake --build build
```

依赖：OpenSSL 3+（`libssl-dev`）。

## 密钥

- 公钥内置 Host：`src/main/plugin/licenseKeys.ts`
- **私钥不得入库**；内网保管 `issuer-private.pem` 仅用于 `issue`

POC 测试密钥对与 `tests/unit/plugin/licenseCanonical.test.ts` 一致（仅开发/CI）。

## 授权策略

| 项 | 约定 |
|----|------|
| 粒度 | 整插件（`pluginId`） |
| 试用 | `--term trial` → 90 天 |
| 永久 | `--term perpetual` → 无 `expiresAt` |
| 机器 | 文件级 `machineId`，与 `collect` 一致 |

详见 `docs/07_插件与扩展.md` §19。
