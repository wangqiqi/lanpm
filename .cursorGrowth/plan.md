<!-- 工作副本：.cursorGrowth/plan.md -->

<!-- PLANNING: false -->

<!-- SPRINT: SPRINT-DUAL-REAL-01 -->

<!-- PLAN_APPROVED: yes -->

<!-- AUTONOMOUS: true -->

<!-- SPRINT_STATUS: active -->

<!-- ACTIVE: TASK-DUAL-02 -->

<!-- NEXT: TASK-DUAL-03 -->

<!-- LAST_DONE: TASK-DUAL-04d -->

<!-- VERIFY: npm run verify:dual-machine-playbook && npm run verify:m6 && npm run typecheck -->

<!-- MAX_LOOPS: 14 -->

<!-- VERSION_LINE: 1.106 -->

# Plan

执行原则：真双机手验 SSOT → `docs/05_测试与联调发布.md` §6 · 证据归档 → `.cursorGrowth/archive/`（`YYYYMMDD_HHMMSS_真网双机_说明.md`）；**Windows 本机修复须同步到 Ubuntu**（见下「跨机同步」）；代码修复走 CHANGELOG · `/release`。

**Steering（身份 · 候选）**：本机同一 `userData` 仅一个对外 userId；跨机用 baseName+后缀；注销后复用同一 userId；`dev:fresh --wipe` 例外。立项 → 候选 **`SPRINT-LOCAL-IDENTITY-01`**（不挡本 Sprint 手验）。

**已交付（勿再列 TASK）**：Playbook（DUAL-01）· no-demo 成员 / Setup EBUSY / 会议离开 / 插件 UX（04a–04d，`2df6d9c`+）· 双机 TCP 探测 Windows ESTAB（`2060e0b`）。

---

## Active sprint · SPRINT-DUAL-REAL-01

**Goal**：在 **Windows + Ubuntu 真机**上完成 M6 局域网双机手验（§6.2），阻塞项修到可复现通过，并留下可对外引用的手验归档与 ROADMAP 证据更新。

**Done when**：

- [ ] §6.2 步骤 1–8 在 Win↔Ubuntu 上执行并记入归档（含环境：OS、commit、防火墙说明）
- [ ] 联调中发现的 **P0** 缺陷已修或记为已知限制（带 issue/归档说明）
- [ ] `npm run verify:dual-machine-playbook` · `npm run verify:m6` · `typecheck` 绿
- [ ] `docs/06_ROADMAP.md` §4 真网双机条目与 §6.0 证据边界一致（有手验则更新延期表述，无则保持诚实）
- [ ] 手验归档已写入 `.cursorGrowth/archive/`（模板见 05 §6.4）
- [ ] no-demo 双机：对方在成员栏可见；会议退出释放设备；paid 插件边界清晰（04a–04d 已修，手验确认）

**联调环境（手验归档须一致）**：

| 角色 | 设备 | 网络 | 备注 |
|------|------|------|------|
| **B（Ubuntu 真机）** | 有线接路由器 | **`192.168.20.16`** | 手动节点 **`192.168.20.16:43124`**（§6.2 步骤 6） |
| **A（Windows 真机）** | 有线/无线同路由器 | **`192.168.20.12`** | `npm run dev:dual-peer -- 192.168.20.16:43124`；隔离自测可用 `dev:fresh:no-demo` |

- 勿设 `LANPM_NETWORK=stub`；防火墙 **UDP 43123** · **TCP 43124**（`docs/05` §6.1）。
- **同步点**：`2060e0b`（Win 当前 HEAD；Ubuntu `git fetch && git pull` 同 SHA；归档记 `git rev-parse HEAD`）。

**跨机同步（本机改代码 → Ubuntu 可拿到）**：

| 项 | 约定 |
|----|------|
| **真源** | 同一远程仓库；Windows 修完 **commit** 后 **push** |
| **Ubuntu** | `git fetch && git pull` 到 **同一 commit** |
| **复测** | Ubuntu `npm run dev` 重启后再跑失败步骤；禁止 Win/Ubuntu 长期分叉联调 |
| **归档** | 每次 P0 修复记：**commit · 简述 · 复测步骤号** |
| **非代码** | 日志/截图放 archive；Ubuntu 靠 pull + 归档路径，不手拷未版本化目录 |

**Out of scope**：

- CI 内跑真双机（仍人工）
- macOS 第三端、Docker 三节点 nightly（留候选表）
- 10MB 以外性能压测、会议/插件全矩阵
- Windows 安装包 `dist:win`（除非手验必须用安装包 — 再决策）

**决策打断清单**：

| 决策 | 默认 | 打断条件 |
|------|------|----------|
| 手验形态 | 两边 `npm run dev`（同 commit） | 必须用 release 安装包才算通过 |
| P0 范围 | 发现/配对/加群/群聊/小文件/断线重连 | 扩到任务 CRDT 全量或会议全矩阵 |
| 归档位置 | `.cursorGrowth/archive/` 单篇或续篇 | 要入库 `docs/` 团队报告 |
| 版本线 | 有代码修复 → `1.106.x` patch | 单开 minor Sprint |
| 修复下发 | **git push → Ubuntu pull** | LAN rsync 直传（须确认） |

| ID | Task | Priority | Status | Acceptance | Target | Owns |
|----|------|----------|--------|------------|--------|------|
| TASK-DUAL-02 | 执行 §6.2 步骤 1–5（发现·消息·10MB·在线态·断线）并记录 | P0 | 🔧 | 归档含逐步结果；失败有截图/日志指针 | 手验归档 | `.cursorGrowth/archive/*真网双机*` |
| TASK-DUAL-03 | 执行 §6.2 步骤 6–8（手动节点·发现进群·私聊）并记录 | P0 | ⬜ | 与 02 同一归档或续篇 | 手验归档 | `.cursorGrowth/archive/*真网双机*` |
| TASK-DUAL-04 | 联调 P0 缺陷（若有）+ **push 后 Ubuntu pull 复测** | P0 | ⬜ | 复测绿；`typecheck` 绿；archive 含 commit | `src/**`（按缺陷） | 按缺陷单开 |
| TASK-DUAL-05 | ROADMAP/05 证据 + Sprint 归档摘要 | P1 | ⬜ | §4/§6.0 与手验一致；plan 删 Active | `docs/06_ROADMAP.md` · `docs/05` | `docs/06_ROADMAP.md` |

**执行顺序**: `TASK-DUAL-02` → `TASK-DUAL-03` → `TASK-DUAL-04`（按需）→ `TASK-DUAL-05`

**手验归档（ACTIVE）**：`.cursorGrowth/archive/20260912_124200_真网双机_步骤1-5_Win12-Ubuntu16.md`（预检绿 · 步骤 **1 ✅** · **2–5 ⬜** → 做完再勾 DUAL-02）。

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 |
|------|------|------|
| **`SPRINT-LOCAL-IDENTITY-01`** | 本机唯一身份 + 退出/重启残留（注销 reuse_only · fresh wipe 例外） | 用户确认立项 |
| `dev:fresh:no-demo` 入 README | 零数据自测一行说明 | — |
| macOS 真机 `netstat` nightly | 只读路由 smoke | TEST-02 ✅ |
| Docker 三节点 nightly | 跨 namespace | TEST-02 设计 |
| UX P2 起步 | 默认进看板 · 发现两步向导 | 本 Sprint 不挡 |

### 待立项 · SPRINT-LOCAL-IDENTITY-01（摘要）

**Goal**：同一 `userData` 根目录仅一个 userId；注销后只能恢复/复用，禁止再 `completeSetup` 出新用户。

**执行顺序**: `SPIKE-IDENTITY-01` → `TASK-IDENTITY-01` … `05`（详表立项时再展开）。

**决策（已确认）**：注销 = **reuse_only** · `dev:fresh --wipe` = **yes_wipe_new**
