<!-- 工作副本：.cursorGrowth/plan.md -->

<!-- PLANNING: false -->

<!-- SPRINT: (none) -->

<!-- PLAN_APPROVED: no -->

<!-- AUTONOMOUS: false -->

<!-- SPRINT_STATUS: closed -->

<!-- ACTIVE: (none) -->

<!-- NEXT: (none) -->

<!-- LAST_DONE: TASK-DUAL-H04 -->

<!-- VERIFY: npm run verify:dual-machine-playbook && npm run verify:m6 && npm run typecheck -->

<!-- MAX_LOOPS: 10 -->

<!-- VERSION_LINE: 1.106 -->

# Plan

执行原则：真源 · `task-verify` 绿再 ✅ · 用户可见变更 → CHANGELOG；归档 → `.cursorGrowth/archive/`。

**Steering**：`SPRINT-DUAL-REAL-01` **已闭合**（2026-09-12）。真网 Win **192.168.20.12** ↔ Ubuntu **192.168.20.16** 手验 **§6.2 步骤 1–3 ✅**（含 **10MB** 文件）；步骤 **4–8 未测**（用户暂缓 4–5，6–8 顺延）。证据：`archive/20260912_121830_真网双机_步骤1-5_Win12-Ubuntu16.md` · `archive/sprint/20260912_220600_SPRINT-DUAL-REAL-01_真网手验收官.md`。新开 Sprint → **`/plan`**。

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 / 备注 |
|------|------|-------------|
| **真网双机 §6.2 续测** | 步骤 **4–5**（双设备在线态 · 断网 20s）+ **6–8**（手动节点 · 发现群 · 私聊） | 接 `SPRINT-DUAL-REAL-01` 收官；SSOT `docs/05` §6.2 |
| Docker 三节点 nightly | 跨 namespace 自动化 | TEST-02 |
| macOS 真机 netstat smoke | 只读路由 | — |
| 幽灵群组 / 发现列表（A05） | no-demo 发现目录收敛 | 非阻塞 backlog |

**推荐下一主题**：`SPRINT-DUAL-REAL-02` — 仅补 §6.2 剩余步骤，Goal 勿与 1–3 重复叙事。

**执行顺序**: （无 Active TASK；新开 Sprint 后由 `/plan` 写入）

---

## 手验速查（延续用）

| 项 | 值 |
|----|-----|
| 启动 | `npm run dev:deploy-test -- <peer>:43124` |
| 模板 | `.cursor/templates/dual_machine_handtest_TEMPLATE.md` |
| 自动化（非替代双机） | `npm run verify:dual-machine-playbook` · `verify:m6` |
