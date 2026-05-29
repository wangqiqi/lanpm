# LanPM Todo

> **未完成 SSOT**（已完成 → [archive/todo/](./archive/todo/)）  
> 发版前：`npm run verify:release-gate`

---

## UI/UX 审图（2026-05-29 · Agent · `.lanpm/visual-screenshots` 1440×900）

**总评：7/10 → ~7.5/10（Setup/侧栏/看板/文件 polish 后）** — 工程化、克制、可达 RC 视觉基线。

| 维度 | 结论 |
|------|------|
| 布局骨架（56/64/16、七页壳层） | ✅ 与 `docs/04` 一致 |
| 亮/暗主题区分 | ✅ 对比正常 |
| 语义色（accent / success / warning / danger） | ✅ 顶栏网络点、看板「高」、驾驶舱「风险」 |
| Ant 默认蓝 `#1677ff` | ✅ 未见残留 |
| **亮色甘特黑条** | ✅ **截图问题**（无头 `capturePage` 透明 SVG），**非实际 UI bug** |

### 分页评分

| 页面 | 亮/暗 | 评分 | 备注 |
|------|-------|------|------|
| Chat | ✅/✅ | 8/10 | 侧栏分区标题已加强 |
| Board | ✅/✅ | 8/10 | 卡片标题/ hover 已加强 |
| Tree | ✅/✅ | 7/10 | seed 数据下留白多 |
| Gantt | ✅/✅ | 8/10 | 亮截图黑条已澄清为截屏问题 |
| Files | ✅/✅ | 8/10 | 工具栏主次已分层 |
| Cockpit | ✅/✅ | 7/10 | 数据少时偏空 |
| Setup | ✅/✅ | 7/10 | CTA/表单/头像已 polish |

### 待办（按优先级）

| ID | 严重 | 项 | 状态 |
|----|------|-----|------|
| **UX-SETUP-CTA** | P0 | Setup「继续」按钮亮/暗 Primary 对比度 | [x] |
| **UX-SETUP-FORM** | P1 | Setup 输入框 focus 指示（行内 accent 条） | [x] |
| **UX-SETUP-AVATAR** | P1 | Setup 默认头像亮/暗均用 accent | [x] |
| **UX-CHAT-SIDEBAR** | P2 | 聊天侧栏分区标题与辅助文案对比度 | [x] |
| **UX-BOARD-DENSITY** | P2 | 看板卡片标题字号 + hover | [x] |
| **UX-FILES-TOOLBAR** | P2 | 文件页上传 vs 书签工具栏分层 | [x] |
| **UX-BRAND** | P2 | regionInteract hover 环 + Setup/看板 accent 锚点 | [x] |
| **UX-RESET** | — | 顶栏用户菜单「注销身份」回 Setup | [x] |
| **UX-DISCOVER** | — | 顶栏「发现」：群组加入 + 成员私聊 | [x] |

审图归档：[archive/review/20260529_173500_V14b设计还原度审图_rc37.md](archive/review/20260529_173500_V14b设计还原度审图_rc37.md)

---

## 数据产销闭环（2026-05-29 · 见 [数据.md](数据.md))

> CRUD / 同步 / 孤岛审计 SSOT → `数据.md`；产品策略 → `数据.md` **§11**。  
> **`数据.md` §9.1 为完整映射表**（与本文 `DATA-*` 一一对应）。§4.5 / §1 可接受项、post-RC 不列入。  
> 真网联调（`DOC-ACC-03`）前优先 **DATA-RR-REAL**。

### P0 — 真网断环（↔ 数据.md §4.1）

| ID | 任务 | 状态 |
|----|------|------|
| **DATA-RR-REAL** | 真网消费 `read_receipt`：`RealNetworkTransport.subscribeAll` 或按群/DM `subscribe` 注册 `readReceiptService`（与 Stub 行为一致） | [x] |
| **DATA-RR-VERIFY** | 验收：双机 `LANPM_NETWORK=real` 已读状态；扩展 `verify-read-receipt` 或 real 集成测 | [x] |

### P1 — 存储只增不减（↔ 数据.md §4.2）

| ID | 任务 | 状态 |
|----|------|------|
| **DATA-MSG-TTL** | `localRetentionDays` 默认 90、**7～365**；prune 超期 `messages` + 孤儿 `read_receipts` | [x] |
| **DATA-MSG-SCHEDULER** | 启动 + 每日自动 prune（§11.3，与 **DATA-MSG-TTL** 同策略） | [x] |
| **DATA-RETENTION-META** | `sync_meta` 统一：`localRetentionDays`（替代/对齐 `message_ttl_days`）；入站补拉 **固定 7 天**（**DATA-SYNC-7D**） | [x] |
| **DATA-MSG-LIMIT** | `listMessagesByGroup` LIMIT 200 与 DB 全量不一致：分页/「加载更早」或 prune 后一致（冷数据不可达） | [x] |
| **DATA-BADGE-TTL** | `countUnreadMessages` 仅计 **`localRetentionDays` 窗口内**消息 | [x] |
| **DATA-FILE-DELETE** | 删文件仅本机：删磁盘，**保留元数据**+「可重新下载」；IPC + `LanpmApi` | [x] |
| **DATA-XFER-PURGE** | `file_transfers` 历史保留策略（条数或 30 天 purge） | [x] |

### P1 — 业务逻辑孤岛（↔ 数据.md §4.3）

| ID | 任务 | 状态 |
|----|------|------|
| **DATA-TASK-CASCADE** | 删父任务：确认框无默认，二选一级联删/子任务上浮；清理 `task_dependencies`；`task_patch` 同步 | [x] |
| **DATA-TASK-TREE** | 树视图兜底：父已删子任务挂 `__root__`（`TaskTreeView.buildTreeData`） | [x] |
| **DATA-FILE-PENDING** | `REMOTE_PENDING` 超时：未 pull 元数据标记失败或「放弃下载」 | [x] |
| **DATA-DM-OFFLINE** | `requestOfflineSync` 纳入 DM（`messages` 去重 `dm:%` 或 Main 活跃 DM meta） | [x] |
| **DATA-DM-DUAL** | DM 双轨：`dmStore`（localStorage）与 `messages` 会话列表对齐；非法/过期 session 清理 | [x] |
| **DATA-DM-DOC** | `docs/03` 补充：DM 无 `groups` 行、消息走 `messages`、补拉 7 天 | [x] |
| **DATA-DOCS-LIFECYCLE** | `docs/03` 增「数据生命周期」：§11 双时间窗、清理、导出、多 profile（总章） | [x] |
| **DATA-GROUP-NODEL** | `groups` / 非匿名 `group_members` 无退群删记录：产品定稿 leave/隐藏群策略 | [x] |
| **DATA-PROFILE-DIR** | 多账号：`userData/profiles/{userId}/`；注销不删目录；切换账号换 profile（§11.6） | [x] |
| **DATA-PROFILE-MIGRATE** | 旧版单库 `userData` → `profiles/{userId}/` 一次性迁移 | [x] |
| **DATA-RESET-ID** | `resetIdentity` 仅解绑当前 profile，不 wipe 目录（与 **DATA-PROFILE-DIR** 一致） | [x] |
| **DATA-GK-META** | 退群/删群时删除 `sync_meta` 中 `group_key_version:*` / `group_key_rotated_at:*` | [x] |

### P2 — 协议 / 实现空转（↔ 数据.md §4.4）

| ID | 任务 | 状态 |
|----|------|------|
| **DATA-XFER-SIM** | `runChunkedUpload` 本机 `fromDevice=toDevice` 模拟进度：与真 `file_chunk` 语义对齐或文档/UX 标明「本地队列」 | [x] |
| **DATA-CHATSTORE-EVICT** | `chatStore.messagesByGroup` 访问过的群消息内存 eviction（或随 prune 失效缓存） | [x] |
| **DATA-SCHEMA-FK** | 补业务 DELETE 路径或评估 `ON DELETE CASCADE`（当前 `foreign_keys` 无级联） | [x] |
| **DATA-STUB-BUS** | Stub `bus.jsonl` 轮转或 truncate | [x] |
| — | `task_crdt` / `member_event`：保持 post-RC，未实现前勿发送（见 `docs/06` §6） | — |

### P1 — 产品策略落地（↔ 数据.md §11）

| ID | 任务 | 状态 |
|----|------|------|
| **DATA-SETTINGS** | 设置·数据与存储：保留默认 90、自定义 **7～365**、占用展示、阈值提醒、补拉 7 天只读说明 | [x] |
| **DATA-CLEAN-UX** | 「立即清理」多级确认 + 勾选：**聊天 / 文件 / 传输 / 任务垃圾**（§11.2、§11.9） | [x] |
| **DATA-CLEAR-GROUP** | 单群清空两档：早于保留期 / 本机全部（仅本机，不广播） | [x] |
| **DATA-BUNDLE-IO** | 单群加密导出+导入；导出可选「含文件本体」（默认关）；冲突：跳过/新 ID/覆盖 | [x] |
| **DATA-SYNC-7D** | `syncWindowDays=7` 固定；`offlineSync`/`requestOfflineSync` 与 §11.1 文案一致 | [x] |

---

## P2 发版阻断

| ID | 任务 | 状态 |
|----|------|------|
| **V-14b-HOV** | 顶栏/底栏/分段鼠标 hover（`RegionButton` / `ViewSegment`）— 静态 `verify:visual` ✅；**建议** `npm run dev` 肉眼复验 | [x] |
| **VIS-08** | V-14b 总勾选（HOV 完成后） | [x] |
| **DOC-02** | `docs/06` §2.5 人工验收项勾选（自动化项已勾；手验见 §手验） | [x] |

```bash
npm run verify:release-gate
```

---

## 手验（真环境）

| ID | 任务 | 状态 |
|----|------|------|
| DOC-ACC-02 | 三平台真机 UI 抽检 | [ ] |
| DOC-ACC-03 | 双机局域网真网联调（含 **发现 → 加群 / 私聊**；已读回执见 **DATA-RR-REAL**） | [ ] |
| — | 性能手测（冷启动/内存/Tab P95）填 `docs/06` §2.4 | [ ] |
| DOC-ACC-04 | I18N 英文 UI 长文案折行 | [ ] |
| — | 发布 **1.0.0** | [ ] |

---

## 跟踪（非阻断）

| 项 | 说明 |
|----|------|
| 圆角治理 | 新模块遵守 `docs/04` §1.3 |
| post-RC | [docs/06 §6](docs/06_验收与里程碑计划.md#6-v11--post-rc-候选非-p2-阻断) |

---

## 维护

- IPC → `channels.ts` + `verify:ipc-contract`
- i18n → zh/en + `verify:i18n-keys`
- UI → `docs/04` + `verify:visual`
