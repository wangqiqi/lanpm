---
name: lanpm-release
description: >-
  LanPM 两档发版：A 打版(频繁 rc+CHANGELOG+commit，不出二进制)；B 发布二进制(偶尔
  verify:release-gate + push v* tag)。触发：发版/打版/release vs 发布二进制/push release。
---

# LanPM 发版 Skill

## 两档模型（默认）

```text
  [日常，一天可几十次]          [偶尔，一天 0～1 次]
        档位 A 打版      ──►        档位 B 发布二进制
   CHANGELOG + rc + commit          release-gate + push v* tag
   verify:m7                       → CI 三平台安装包 (+ 可选 R2)
   不 push tag / 不出包
```

**禁止**：用户只说「发版 / release / 提交」就 push tag 或打 GitHub Release。

---

## 档位 A — 打版（默认）

### 触发

发版、打版、release、发版并提交、提交并打版、bump version、升 rc

### 步骤

1. `git status` / `git diff` / `git log -5`
2. **CHANGELOG** 最上方新节 + `### Tag`（记录拟用 tag 名，便于追溯）
3. **`package.json`**：`1.0.0-rc.N` → `N+1`
4. 门禁（日常）：

```bash
npm run verify:m7
```

5. 用户说「并提交」时：

```bash
git add …   # 不含 .lanpm/visual-screenshots/、密钥
git commit -m "chore(release): v1.0.0-rc.N — <摘要>"
```

6. **不要** `git push origin v…`；**不要** `electron-builder --publish`。默认**不打 tag**；若用户要本地 tag 备忘：

```bash
git tag -a v1.0.0-rc.N -m "…"   # 仅本地，不 push
```

### A 收尾汇报

- 新版本号、CHANGELOG 摘要、`verify:m7` 是否通过、是否已 commit
- 明确写：**未发布二进制**；若要出包请说「发布二进制」或「push release」

---

## 档位 B — 发布二进制（显式才做）

### 触发（必须出现其一）

发布二进制、发布安装包、release binary、push release、发版并发布二进制、发 binary

### 前置

- 当前 `package.json` / CHANGELOG 已是将要对外发布的 rc（通常刚做完 A）
- 用户确认一句：「将 push `v1.0.0-rc.N` 并构建三平台安装包，是否继续？」

### 步骤

1. 全量门禁（**仅 B 必跑**）：

```bash
npm run verify:release-gate
```

可选：`lanpm-visual-audit`、`lanpm-docs-code-audit`（发版模式）。

2. 确保 A 的 commit 已在当前分支（未提交则先完成 A）。

3. **触发 Release workflow**（构建 + 自动 Publish + 补打 git tag；**勿手点 Publish**）：

   **推荐**（先 push `master`，**勿先 push tag**）：

   ```text
   Actions → Release → Run workflow
     tag: v1.0.0-rc.N
     ref: master
     publish_only: false
   ```

   或 push tag（兼容旧流程，易遇 untagged draft，优先用 Run workflow）：

   ```bash
   git push origin HEAD
   git push origin v1.0.0-rc.N
   ```

4. 产物：Windows NSIS · macOS DMG · Linux AppImage + DEB（`electron-builder.yml`）。

   - `release.yml`：三平台 matrix 构建 → `softprops/action-gh-release` 上传
   - `sync-r2.yml`：**可选**（独立下载页 / R2）；默认不用配，在 GitHub Releases 下载安装包即可
   - CI 未就绪：本地 `npm run build && npx electron-builder --publish never` → `dist/`

5. R2 下载页：`.github/scripts/generate-r2-download-index.py`（`BASE_URL` 变量指向的域名）

### B 收尾汇报

- tag 是否已 push、CI / 本地包状态、R2 是否同步
- `docs/06` §2.6 手验提醒

---

## 对话对照表

| 用户说 | 档位 | 门禁 | Git | 二进制 |
|--------|------|------|-----|--------|
| 发版 / release / 打版 | A | `verify:m7` | 可选 commit | ❌ |
| 发版并提交 | A | `verify:m7` | commit | ❌ |
| 发布二进制 / push release | B | `verify:release-gate` | push `v*` tag | ✅ |
| 发版并提交并发布二进制 | A→B | m7 后 release-gate | commit 再 push tag | ✅ |

---

## 禁止

- 每次打版跑 `verify:release-gate`（除非用户明确要求或进入 B）
- 每次 commit 都 push `v*` tag
- 未过 B 门禁就 push tag 出包
- `git push --force`、改 git config、提交密钥与截图目录
