<!-- 工作副本：.cursorGrowth/plan.md -->

<!-- PLANNING: false -->

<!-- SPRINT: SPRINT-DUAL-REAL-01 -->

<!-- PLAN_APPROVED: yes -->

<!-- AUTONOMOUS: true -->

<!-- SPRINT_STATUS: active -->

<!-- ACTIVE: TASK-DUAL-H01 -->

<!-- NEXT: TASK-DUAL-H02 -->

<!-- LAST_DONE: TASK-DWIZ-05 -->

<!-- VERIFY: npm run verify:dual-machine-playbook && npm run verify:m6 && npm run typecheck && npm test && npm run verify:discover && npm run verify:discover-relay -->

<!-- MAX_LOOPS: 10 -->

<!-- VERSION_LINE: 1.106 -->

# Plan

执行原则：真源 · `task-verify` 绿再 ✅ · 用户可见变更 → CHANGELOG；归档 → `.cursorGrowth/archive/`。

**Steering**：`SPRINT-DISCOVER-WIZARD-01` 已闭合。当前 Active：**真网双机 §6.2 手验证据**（Win **192.168.20.12** ↔ Ubuntu **192.168.20.16**）。

---

## Active sprint · SPRINT-DUAL-REAL-01

**Goal**：真网双机 M6 联调能力 — 部署态（`dev:deploy-test` · `LANPM_NO_DEMO=1`）跑通 `docs/05` §6.2 八步（消息 · 大文件 · 断线 · 手动节点 · 发现群/私聊）；loopback/playbook **不**算已测真网。

**Done when**：

- P0 `TASK-DUAL-H01`–`H04` 全 ✅（无未关闭 P0 缺陷）
- §6.2 步骤 1–8 在 Growth `archive/` 有勾选结论（通过 / 部分通过 + P0 清单）
- plan `VERIFY` 命令全绿
- Sprint 摘要写入 `archive/sprint/`；用户可见结论同步 `CHANGELOG.md` `[Unreleased]`

**Out of scope**：

- Docker 三节点 nightly · macOS netstat smoke（留候选表）
- 幽灵群组目录治理（`TASK-DUAL-A05`）— 非阻塞可记 backlog
- **`/release` 打 tag / merge**（Sprint 出口，单独指令）

**决策打断清单**（真网手验须用户在环）：

- A/B 机不可用、LAN IP 变更或防火墙未放行 43123/43124
- §6.2 某步失败：是否升格 P0（H03 修码）vs 记入 backlog
- 是否在本 Sprint 并入 `TASK-DUAL-A05` 幽灵群修复

| ID | Task | Priority | Status | Acceptance | Target | Owns |
|----|------|----------|--------|------------|--------|------|
| TASK-DUAL-H01 | §6.2 步骤 **1–5** 手验收尾 | P0 | 🔧 | 更新 `archive/20260912_131800_真网双机_步骤1-5_Win12-Ubuntu16.md`（或新时间戳副本）：1–5 均为 ✅ 或明确失败项；步骤 2 双向加密无报错；`npm run verify:dual-machine-playbook` | `docs/05` §6.2 · 手验 | `.cursorGrowth/archive/*步骤1-5*` |
| TASK-DUAL-H02 | §6.2 步骤 **6–8**（手动节点 · 发现群 · 私聊） | P0 | ⬜ | 归档续篇（同文件或 `…_步骤6-8_…`）6–8 ✅；playbook 仍绿 | 手验 · 发现 UI | `.cursorGrowth/archive/*真网双机*`（H02 段） |
| TASK-DUAL-H03 | 手验 **P0** 缺陷修复与复测 | P0 | ⬜ | 每条 P0 有最小 code fix + 相关 `verify:*`/单测绿；失败步骤复测 ✅；无 P0 则标 ✅ 并注明「无代码变更」 | `src/` 按需 | 按缺陷文件（不重叠并行） |
| TASK-DUAL-H04 | Sprint 收口 · 证据叙事 | P0 | ⬜ | `archive/sprint/YYYYMMDD_*_SPRINT-DUAL-REAL-01_*.md`；CHANGELOG `[Unreleased]` 真网手验结论；plan `VERIFY` 全绿 | CHANGELOG · archive | `.cursorGrowth/archive/sprint/` · `CHANGELOG.md` |

**执行顺序**: `TASK-DUAL-H01` → `TASK-DUAL-H02` → `TASK-DUAL-H03` → `TASK-DUAL-H04`

**手验 SSOT**：`.cursor/templates/dual_machine_handtest_TEMPLATE.md` · 启动 `npm run dev:deploy-test -- <peer>:43124`

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 |
|------|------|------|
| Docker 三节点 nightly | 跨 namespace 自动化 | TEST-02 |
| macOS 真机 netstat smoke | 只读路由 | — |
| 幽灵群组 / 发现列表（A05） | no-demo 发现目录收敛 | 可选接 H03 决策 |
