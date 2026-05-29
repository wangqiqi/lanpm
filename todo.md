# LanPM Todo

> 发布前推荐：`npm run verify:release-gate`（或 `verify:project` + `verify:m7` + 截图）。

---

## P2 发版阻断

| ID | 任务 | 来源 | 状态 |
|----|------|------|------|
| **V-14b** | 亮/暗截图人工 + 鼠标 HOV | `docs/05` §2.2 · `docs/06` §2.5 | [ ] |
| **DOC-02** | 06 人工项勾选（自动化清单已写入 §2.5） | `docs/06` DOC-02 表 | [ ] |
| **DOC-ACC-01** | V-14b 与 06 §2.5 拆项对齐 | `docs/06` | [x] |

```bash
npm run verify:release-gate
# 等价分步见 docs/05 §1.3
```

---

## V-14b 手验（截图 + 人工）

> 七页亮/暗 → `.lanpm/visual-screenshots/{theme}_{page}.png`（**勿提交**）。

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| AUTO-20 | 14 PNG + 亮暗 MD5 + 甘特种子 | `verify:visual-screenshots` | [x] |
| V-14b-SEM | 语义色（红/绿/黄） | `verify:visual` 静态 ✅；主观一眼可选 | [x] |
| V-14b-GNT | 甘特时间轴/任务条 | AUTO-20 种子 + 暗色无白条 ✅ | [x] |
| V-14b-D | 暗色七页人工核对 | `dark_*.png` | [ ] |
| V-14b-L | 亮色七页人工核对 | `light_*.png` | [ ] |
| V-14b-HOV | RegionButton / ViewSegment hover | 须真机鼠标 | [ ] |
| VIS-08 | V-14b 总勾选 | 与 D/L/HOV 同步 | [ ] |

---

## 手验（`docs/06` · 真环境）

| ID | 任务 | 自动化 | 状态 |
|----|------|--------|------|
| DOC-ACC-02 | 三平台冒烟 | CI `verify:m7` 矩阵 ✅；真机 UI | [ ] |
| DOC-ACC-03 | 双机真网联调 | `verify:dual-stub` ✅ | [ ] |
| — | 性能手测 | m7-perf 三行已填 `06` §2.4 | [ ] |
| DOC-ACC-04 | I18N-05 英文 UI | `verify:i18n-en` ✅；折行人工 | [ ] |
| — | 发布 1.0.0 | V-14b + DOC-02 人工项 | [ ] |

---

## 视觉 — 非阻断（P3~P4）

| ID | 任务 | 状态 |
|----|------|------|
| VIS-07b | 七页业务 CSS 字号 → `--lanpm-font-*` | [x] |
| — | 圆角混用治理 | 遵守 `docs/04` §1.3 |
| — | RootErrorBoundary 硬编码色 | [x] |

---

## 文档 backlog（非 P2）

| ID | 任务 | 状态 |
|----|------|------|
| DOC-TECH-02 / DOC-F-05 / DOC-F-02 | post-RC | → [docs/08](./docs/08_post-RC规划与已知限制.md) |
| DOC-F-03 | 看板删除 vs PRD | [x] |
| DOC-F-04 | Profile 面板 | [x] `verify:profile-panel` |

---

## 维护

- IPC → `channels.ts` + `verify:ipc-contract`
- i18n → zh/en + `verify:i18n-keys`
- UI → `docs/04` + `verify:visual`
- 发版 → `verify:release-gate` 或 `verify:project` + `verify:m7` + V-14b 人工
