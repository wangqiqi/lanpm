# LanPM Todo

> **原则**：能自动化的不手做。发布前最低门禁：`npm run verify:project` + `npm run verify:m7`（**92** 单元用例 + P0 守卫 + M0–M7 集成）。

---

## 手验（真环境 / 人工仍不可完全替代）

| 项 | 可减轻的自动化 | 状态 |
|----|----------------|------|
| 三平台冒烟 | **AUTO-18** CI 矩阵 | [ ] |
| 性能手测填表 | **AUTO-15** m7-perf 消息分页 P95 ✅ | [ ] |
| 局域网双机真网联调 | **AUTO-10** dual-stub ✅ + 一台真机抽检 | [ ] |
| V-14b 亮/暗截图 | 人工 · 步骤见 §视觉 阶段 A | [ ] |
| I18N-05 英文 UI 走查 | **AUTO-02** i18n-keys ✅ + **AUTO-03** docs ✅ | [ ] |
| 发布 1.0.0 | verify:project + verify:m7 全绿 + §视觉 阶段 A | [ ] |

---

## 视觉一致性计划

> **审计**：[视觉.md](./视觉.md)（2026-05-29）  
> **基线**：V-01~V-13 ✅ · V-14a / **AUTO-17** `verify:visual` ✅  
> **发版前最低**：完成 **阶段 A** 全部 + **V-14b** 手验截图。  
> **Cursor**：`.cursor/skills/lanpm-visual-audit`（发版 / 主动「视觉检测」）· `.cursor/rules/renderer-visual-tokens.mdc`

### 阶段 A — 发版阻断（P2，建议 1 个 PR）

| ID | 任务 | 涉及文件 | 验收 | 状态 |
|----|------|----------|------|------|
| VIS-01 | 语义令牌 `--lanpm-success` / `--lanpm-warning` / `--lanpm-danger`（亮暗）；TopBar 网络点、看板拖放错误改引用 | `global.module.css`、`TopBar.module.css`、`board.module.css` | 无孤立 Ant hex；`verify:visual` 通过 | [ ] |
| VIS-02 | 去掉 `var(--lanpm-*, rgba(0,0,0,*))` 暗色错误 fallback | `chat/*.module.css`、`board.module.css`、`files.module.css` | 暗色次要文案正常 | [ ] |
| VIS-03 | 阴影 `--lanpm-shadow-sm` / `--lanpm-shadow-md`；气泡/菜单/Setup 统一 | `global.module.css`、相关 feature CSS | 亮暗 elevation 一致 | [ ] |
| V-14b | 亮/暗七页手验 + 截图 `{theme}_{page}.png`（本地归档，勿提交） | — | [05](./docs/05_测试与联调发布.md) §2.2 · [06](./docs/06_验收与里程碑计划.md) §2.5 | [ ] |

```bash
npm run verify:visual && npm run verify:m7   # 阶段 A 每步后
npm run dev                                   # V-14b 手验
```

### 阶段 B — 文档与启动路径（P3）

| ID | 任务 | 涉及文件 | 状态 |
|----|------|----------|------|
| VIS-04 | 圆角三级写入 `docs/04` §1：8=面板 / 10=控件 / 12–14=模态 | `docs/04_交互与UI约定.md` | [ ] |
| VIS-05 | 崩溃/预 React 错误页跟随 `data-theme` | `RootErrorBoundary.tsx`、`main.tsx` | [ ] |
| VIS-06 | `App.module.css` 顶栏边框改 `var(--lanpm-bar-border)` | `App.module.css` | [ ] |

### 阶段 C — 可选 / 自动化（P4+）

| ID | 任务 | 关联 | 状态 |
|----|------|------|------|
| VIS-07 | 字体令牌 4 档，新样式优先引用 | 可延后 v1.0.x | [ ] |
| AUTO-20 | 截图回归（Playwright/Electron，依赖 **AUTO-19**） | 减轻后续 V-14b | [ ] |

### 已完成（勿重复开项）

| ID | 说明 |
|----|------|
| V-01~V-13 | 令牌、ViewHeader/Toolbar/State、56/64/16、regionInteract |
| V-14a | `verify:visual` 纳入 `verify:m7` |
| AUTO-17 | 扩展 visual（七页引用 + 暗色 token 静态守卫） |

### 推荐执行顺序

1. VIS-01 → VIS-02 → VIS-03（单 PR）  
2. 扩展 `verify-visual.ts` 禁语义色硬编码（可并入 VIS-01）  
3. V-14b 手验  
4. VIS-04~06  
5. VIS-07 / AUTO-20（v1.1）

---

## 测试体系（已完成 ✅）

### 单元 `tests/unit/` · `npm run test` — 22 文件 / 92 用例

详见 `docs/05_测试与联调发布.md` §1.1。

### 集成 / 静态 / 编排 `tests/`

| 命令 | 说明 | 状态 |
|------|------|------|
| `verify:p0` | P0 一致性守卫 8 项串联 | ✅ |
| `verify:shared` | 纯 shared 冒烟 7 步 | ✅ |
| `verify:project` | p0 + lint + test + shared + search + **build** | ✅ |
| `verify:m7` | 全量回归 | ✅ |
| `verify:dual-stub` | 单机双 Stub 联调 | ✅ |
| `verify:peer-registry` | peer TTL 清理 | ✅ |

---

## 自动化增强计划

### P0 — 一致性守卫 ✅

| ID | 脚本 | 状态 |
|----|------|------|
| AUTO-01 | `verify:ipc-contract` | ✅ |
| AUTO-02 | `verify:i18n-keys` | ✅ |
| AUTO-03 | `verify:docs-links` | ✅ |
| AUTO-04 | 扩展 `verify:project`（README/docs/06 版本） | ✅ |
| AUTO-05 | `verify:rc-reality` | ✅ |

### P1 — 完整性守卫

| ID | 脚本 | 状态 |
|----|------|------|
| AUTO-06 | `verify:schema-repo` | ✅ |
| AUTO-07 | `verify:stub-parity` | ✅ |
| AUTO-08 | `verify:router-views` | ✅ |
| AUTO-09 | `verify:sync-handlers` | ✅ |
| AUTO-10 | `verify:dual-stub` → `verify:m2` | ✅ |
| AUTO-11 | `build` → `verify:project` | ✅ |

### P2 — 稳定性 / 边界 ✅

| ID | 任务 | 状态 |
|----|------|------|
| AUTO-13 | 离线队列集成测试 `verify:offline-sync-integration` | ✅ |
| AUTO-14 | `verify:file-concurrency` | ✅ |
| AUTO-15 | 扩展 `verify:m7-perf` | ✅ |
| AUTO-16 | `verify:coverage` 阈值门禁 | ✅ |
| AUTO-17 | 扩展 `verify:visual`（七页 + 暗色 token） | ✅ |

### P3 — 进阶（待做）

| ID | 任务 | 状态 |
|----|------|------|
| AUTO-18 | CI 三平台矩阵 | [ ] |
| AUTO-19 | Electron 无头 smoke | [ ] |
| AUTO-20 | 截图回归 | [ ] |

---

## 维护

- 新增 IPC → 更新 `channels.ts`，跑 `verify:ipc-contract`
- 新增 i18n key → 同步 zh/en，跑 `verify:i18n-keys`
- 改 UI 色/圆角 → 对照 [视觉.md](./视觉.md) 与 `docs/04`；跑 `verify:visual`
- 发版前：`npm run verify:project && npm run verify:m7` + §视觉 阶段 A
