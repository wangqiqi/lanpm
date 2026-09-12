<!-- 工作副本：.cursorGrowth/plan.md -->
<!-- PLANNING: false -->
<!-- SPRINT: SPRINT-DUAL-REAL-01 -->
<!-- PLAN_APPROVED: yes -->
<!-- AUTONOMOUS: true -->
<!-- SPRINT_STATUS: active -->
<!-- ACTIVE: TASK-DUAL-02 -->
<!-- NEXT: TASK-DUAL-03 -->
<!-- LAST_DONE: TASK-DUAL-01 -->
<!-- VERIFY: npm run verify:dual-machine-playbook && npm run verify:m6 && npm run typecheck -->
<!-- MAX_LOOPS: 14 -->
<!-- VERSION_LINE: 1.106 -->

# Plan

执行原则：真双机手验 SSOT → `docs/05_测试与联调发布.md` §6 · 证据归档 → `.cursorGrowth/archive/`（`YYYYMMDD_HHMMSS_真网双机_说明.md`）；**Windows 本机修复须同步到 Ubuntu**（见下「跨机同步」）；代码修复走 CHANGELOG · `/release`。

---

## Active sprint · SPRINT-DUAL-REAL-01

**Goal**：在 **Windows + Ubuntu 真机**上完成 M6 局域网双机手验（§6.2），阻塞项修到可复现通过，并留下可对外引用的手验归档与 ROADMAP 证据更新。

**Done when**：

- [ ] §6.2 步骤 1–8 在 Win↔Ubuntu 上执行并记入归档（含环境：OS、commit、防火墙说明）
- [ ] 联调中发现的 **P0** 缺陷已修或记为已知限制（带 issue/归档说明）
- [ ] `npm run verify:dual-machine-playbook` · `npm run verify:m6` · `typecheck` 绿
- [ ] `docs/06_ROADMAP.md` §4 真网双机条目与 §6.0 证据边界一致（有手验则更新延期表述，无则保持诚实）
- [ ] 手验归档文件已写入 `.cursorGrowth/archive/`（模板见 05 §6.4）

**联调环境（已登记 · 手验归档须一致）**：

| 角色 | 设备 | 网络 | 备注 |
|------|------|------|------|
| **B（Ubuntu 真机）** | 有线接路由器 | **`192.168.20.16`** | 手动添加节点填 **`192.168.20.16:43124`**（§6.2 步骤 6） |
| **A（Windows 真机）** | 有线/无线同路由器 | **`192.168.20.12`** | `dev:dual-peer -- 192.168.20.16:43124` |

- 勿设 `LANPM_NETWORK=stub`；防火墙放行 **UDP 43123**、**TCP 43124**（见 `docs/05` §6.1）。
- 两边 **同一 `git` commit** + `npm run dev`（默认决策）。**同步点**：`1d24dfb`（Win 已 merge `origin/master`；Ubuntu 请 `git pull`）。

**跨机同步（本机改代码 → Ubuntu 可拿到）**：

| 项 | 约定 |
|----|------|
| **真源** | 同一远程仓库；Windows（开发机）修完 **commit** 后 **push** |
| **Ubuntu** | `git fetch && git pull` 到 **同一 commit**（手验归档记录 `git rev-parse HEAD`） |
| **复测** | Ubuntu 侧 `npm run dev` 重启后再跑失败步骤；不得长期 Win/Ubuntu 代码分叉联调 |
| **归档** | 每次 P0 修复在 archive 记：**commit hash · 简述 · 复测步骤号** |
| **非代码** | 日志/截图放 archive 或 Growth；Ubuntu 通过 pull + 归档路径获取，不靠手拷未版本化目录 |

**Out of scope**：

- CI 内跑真双机（仍人工）
- macOS 第三端、Docker 三节点 nightly（留候选表）
- 10MB 文件以外的性能压测、会议/插件全矩阵
- Windows 安装包 `dist:win`（除非手验必须用安装包且阻塞 — 再决策）

**决策打断清单**：

| 决策 | 默认 | 打断条件 |
|------|------|----------|
| 手验形态 | 两边 `npm run dev`（同 commit） | 必须用 release 安装包才算通过 |
| P0 范围 | 发现/配对/加群/群聊/小文件/断线重连 | 要扩到任务 CRDT 全量或会议 |
| 归档位置 | `.cursorGrowth/archive/` 单篇手验记录 | 要入库 `docs/` 团队报告 |
| 版本线 | 有代码修复 → `1.106.x` patch | 要单开 minor Sprint |
| 修复下发 | **git push → Ubuntu pull** | 要 LAN 直传目录/rsync（须打断确认） |

| ID | Task | Priority | Status | Acceptance | Target | Owns |
|----|------|----------|--------|------------|--------|------|
| TASK-DUAL-01 | Playbook 守卫 + 双机环境核对（端口 43123/43124 · 非 stub） | P0 | ✅ | `verify:dual-machine-playbook` 绿；清单写入手验归档草稿 | `tests/static/verify-dual-machine-playbook.ts` · `docs/05` §6.1 | `docs/05_测试与联调发布.md`（§6 小节） |
| TASK-DUAL-02 | 执行 §6.2 步骤 1–5（发现·消息·10MB·在线态·断线）并记录 | P0 | ⬜ | 归档含逐步结果；失败有截图/日志指针 | 手验归档 | `.cursorGrowth/archive/*真网双机*` |
| TASK-DUAL-03 | 执行 §6.2 步骤 6–8（手动节点·发现进群·私聊）并记录 | P0 | ⬜ | 同上；与 TASK-DUAL-02 同一归档或续篇 | 手验归档 | `.cursorGrowth/archive/*真网双机*` |
| TASK-DUAL-04 | 联调 P0 缺陷修复（若有）+ **push 后 Ubuntu 可 pull 复测** | P0 | ⬜ | 复测步骤绿；`typecheck` 绿；archive 含 commit；Ubuntu 已 pull 同 SHA | `src/**`（按缺陷） | 按缺陷单开，不重叠 |
| TASK-DUAL-05 | ROADMAP/05 证据表述 + Sprint 归档摘要 | P1 | ⬜ | §4/§6.0 与手验结论一致；plan 删 Active | `docs/06_ROADMAP.md` · `docs/05` | `docs/06_ROADMAP.md` |

**执行顺序**: `TASK-DUAL-01` → `TASK-DUAL-02` → `TASK-DUAL-03` → `TASK-DUAL-04`（按需）→ `TASK-DUAL-05`

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 |
|------|------|------|
| macOS 真机 `netstat` nightly | 只读路由解析 smoke | TEST-02 ✅ |
| Docker 三节点 nightly | 高保真跨 namespace | TEST-02 设计 |
| UX P2 起步 | 默认进看板 · 发现两步向导（`优化.md` P2-1/4） | 本 Sprint 不挡 |
