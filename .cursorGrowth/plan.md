<!-- 工作副本：.cursorGrowth/plan.md -->

<!-- PLANNING: false -->

<!-- SPRINT: SPRINT-DUAL-REAL-01 -->

<!-- PLAN_APPROVED: yes -->

<!-- AUTONOMOUS: true -->

<!-- SPRINT_STATUS: active -->

<!-- ACTIVE: TASK-DUAL-H01 -->

<!-- NEXT: TASK-DUAL-H02 -->

<!-- LAST_DONE: TASK-DUAL-A04 -->

<!-- VERIFY: npm run verify:dual-machine-playbook && npm run verify:m6 && npm run typecheck && npm test && npm run verify:discover && npm run verify:discover-relay -->

<!-- MAX_LOOPS: 14 -->

<!-- VERSION_LINE: 1.106 -->

# Plan

执行原则：真双机手验 SSOT → `docs/05_测试与联调发布.md` §6 · 证据归档 → `.cursorGrowth/archive/`（`YYYYMMDD_HHMMSS_真网双机_说明.md`）；**先自动化门禁与部署态脚本，再人工 §6.2**；代码修复走 CHANGELOG · `/release` · Win 修完 **push** → Ubuntu **pull**。

**Steering（身份 · 候选）**：本机同一 `userData` 仅一个对外 userId → 候选 **`SPRINT-LOCAL-IDENTITY-01`**（不挡本 Sprint；发现群组幽灵见 **TASK-DUAL-A05**）。

**已交付（勿再列 TASK）**：Playbook（DUAL-01）· no-demo 成员/发现幽灵/TCP ESTAB（`05e0174`+`68fa1d0`）· Setup EBUSY / 会议 / 插件（04a–04d）· 本机已 `userdata:wipe` + `dev:deploy-test` 跑通（待 **A01** 入库）。

---

## Active sprint · SPRINT-DUAL-REAL-01

**Goal**：双机验证阶段以 **部署态（无 mock）** 为默认；**自动化可证的先绿**，再在 Win↔Ubuntu 完成 §6.2 手验与归档。

**Done when**：

- [ ] **L1 自动化**：`VERIFY` 行全绿 · 部署态脚本已提交推送 · `LANPM_DUAL_PEER` 探测可复现（对端在线时）
- [ ] **L2 手验**：§6.2 步骤 1–8 记入 `.cursorGrowth/archive/`（含 OS · commit · 防火墙）
- [ ] 手验 **P0** 已修或记已知限制；`docs/06_ROADMAP.md` §4 与 §6.0 证据边界诚实一致
- [ ] no-demo 双机：成员栏/发现/中文名/在线数 — 手验确认（自动化≠§6.2 通过）

**联调环境（手验归档须一致）**：

| 角色 | 设备 | 网络 | 启动（部署态） |
|------|------|------|----------------|
| **B（Ubuntu）** | 有线 | **`192.168.20.16`** | `npm run dev:deploy-test -- 192.168.20.12:43124` |
| **A（Windows）** | 同路由器 | **`192.168.20.12`** | `npm run dev:deploy-test -- 192.168.20.16:43124` |

- 清库：`npm run userdata:wipe`（两边各一次后走 Setup）
- 勿设 `LANPM_NETWORK=stub`；防火墙 **UDP 43123** · **TCP 43124**
- **同步点**：`git rev-parse HEAD` 两边一致（归档必记）

**跨机同步**：Win **commit + push** → Ubuntu `git pull --ff-only origin master` → 重启 dev。

**Out of scope**：CI 真双机 · macOS 第三端 · Docker 三节点 nightly · 10MB 外压测 · `dist:win`（除非决策打断）

**决策打断清单**：（手验形态 / P0 范围 / 归档位置 / 版本线 — 同前，略）

### L1 · 自动化（优先 `/run`）

| ID | Task | P | Status | Acceptance | Owns |
|----|------|---|--------|------------|------|
| TASK-DUAL-A01 | **提交推送**：mock 默认关 · `userdata:wipe` · `dev:deploy-test` · CHANGELOG | P0 | ✅ | `a6a3f70` on origin | `scripts/*` · `seedMockData` · `dev-run.mjs` · `package.json` · `CHANGELOG.md` |
| TASK-DUAL-A02 | **门禁全绿**：VERIFY 行 + `npm test` | P0 | ✅ | 2026-09-12 全绿 | — |
| TASK-DUAL-A03 | **局域网 TCP 探测** + 归档预检段更新 | P0 | ✅ | ESTAB `192.168.20.12:43124` | `.cursorGrowth/archive/*真网双机*` |
| TASK-DUAL-A04 | **文档**：`docs/05` §6.1 + README 双机部署态命令 | P1 | ✅ | 已 push | `docs/05` · `README.md` |
| TASK-DUAL-A05 | **发现群组幽灵**（可选）：缓存仅存活 peer / TTL | P2 | ⬜ | SPIKE 或 patch + `verify:discover` 绿 | `discoverGroupRegistry` · `discoverService` |

### L2 · 手验（自动化绿后再做）

| ID | Task | P | Status | Acceptance | Owns |
|----|------|---|--------|------------|------|
| TASK-DUAL-H01 | §6.2 步骤 **1–5** 并记录 | P0 | 🔧 | 归档逐步 ✅/❌；步骤 1 已 ✅ | archive |
| TASK-DUAL-H02 | §6.2 步骤 **6–8** 并记录 | P0 | ⬜ | 与 H01 同篇或续篇 | archive |
| TASK-DUAL-H03 | 手验 **P0** 缺陷修复 + pull 复测 | P0 | ⬜ | archive 含 commit · 复测步骤号 | `src/**` |
| TASK-DUAL-H04 | 手验后 **ROADMAP/05** + Sprint 收尾 | P1 | ⬜ | §4/§6.0 与手验一致；plan 删 Active | `docs/06_ROADMAP.md` |

**执行顺序**：

`TASK-DUAL-A01` → `A02` → `A03` → `A04` →（`A05` 按需）→ `H01` → `H02` → `H03` → `H04`

**手验草稿**：`.cursorGrowth/archive/20260912_131800_真网双机_步骤1-5_Win12-Ubuntu16.md`（**H01**：步骤 1 ✅ · 2 🔧 · 3–5 ⬜）。

**自动化 ≠ §6.2**：`verify:m6` loopback · `verify:dual-peer-link` 仅 TCP · playbook 静态守卫。

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 |
|------|------|------|
| **`SPRINT-LOCAL-IDENTITY-01`** | 本机唯一身份 + 注销 reuse_only | 用户立项 |
| Docker 三节点 nightly | 跨 namespace 自动化逼近真网 | TEST-02 |
| macOS 真机 netstat smoke | 只读路由 | — |
| UX P2 | 发现两步向导 | — |

### 待立项 · SPRINT-LOCAL-IDENTITY-01（摘要）

**Goal**：同一 `userData` 仅一个 userId；注销 reuse_only · `dev:fresh --wipe` = yes_wipe_new。

**决策（已确认）**：注销 = **reuse_only** · fresh wipe 例外。
