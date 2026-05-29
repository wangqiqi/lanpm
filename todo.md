# LanPM Todo

> **未完成 SSOT**（已完成 → [archive/todo/](./archive/todo/)）  
> 发版前：`npm run verify:release-gate`

---

## P2 发版阻断

| ID | 任务 | 状态 |
|----|------|------|
| **V-14b-HOV** | 顶栏/底栏/分段鼠标 hover（`RegionButton` / `ViewSegment`） | [ ] |
| **VIS-08** | V-14b 总勾选（HOV 完成后） | [ ] |
| **DOC-02** | `docs/06` §2.5 人工验收项勾选 | [ ] |

```bash
npm run verify:release-gate
```

审图（D/L/SEM/GNT 已完成）：[archive/review/20260529_173500_V14b设计还原度审图_rc37.md](archive/review/20260529_173500_V14b设计还原度审图_rc37.md)

---

## 手验（真环境）

| ID | 任务 | 状态 |
|----|------|------|
| DOC-ACC-02 | 三平台真机 UI 抽检 | [ ] |
| DOC-ACC-03 | 双机局域网真网联调 | [ ] |
| — | 性能手测（冷启动/内存/Tab P95）填 `docs/06` §2.4 | [ ] |
| DOC-ACC-04 | I18N 英文 UI 长文案折行 | [ ] |
| — | 发布 **1.0.0** | [ ] |

---

## 跟踪（非阻断）

| 项 | 说明 |
|----|------|
| 圆角治理 | 新模块遵守 `docs/04` §1.3 |
| post-RC | [docs/08](docs/08_post-RC规划与已知限制.md) |

---

## 维护

- IPC → `channels.ts` + `verify:ipc-contract`
- i18n → zh/en + `verify:i18n-keys`
- UI → `docs/04` + `verify:visual`
