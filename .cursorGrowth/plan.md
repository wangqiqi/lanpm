<!-- 工作副本：.cursorGrowth/plan.md -->

<!-- PLANNING: false -->

<!-- SPRINT: (none) -->

<!-- PLAN_APPROVED: yes -->

<!-- AUTONOMOUS: true -->

<!-- SPRINT_STATUS: closed -->

<!-- ACTIVE: (none) -->

<!-- NEXT: (none) -->

<!-- LAST_DONE: TASK-DWIZ-05 -->

<!-- VERIFY: npm run typecheck && npm test && npm run verify:discover && npm run verify:i18n-en -->

<!-- MAX_LOOPS: 10 -->

<!-- VERSION_LINE: 1.106 -->

# Plan

执行原则：真源 · `task-verify` 绿再 ✅ · 用户可见变更 → CHANGELOG；归档 → `.cursorGrowth/archive/`。

**Steering**：`SPRINT-DISCOVER-WIZARD-01` 已闭合（归档 `archive/sprint/20260912_143400_SPRINT-DISCOVER-WIZARD-01_发现向导加固.md`）。**`SPRINT-DUAL-REAL-01`** 仍暂停于 `H01` 🔧。

无 Active Sprint。新开 → `/plan`。

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 |
|------|------|------|
| **`SPRINT-DUAL-REAL-01` 续跑** | H01–H04 手验与归档 | 可与成员栏验证 |
| Docker 三节点 nightly | 跨 namespace 自动化 | TEST-02 |
| macOS 真机 netstat smoke | 只读路由 | — |

### 暂停 · SPRINT-DUAL-REAL-01（背景）

**L2 手验**：`TASK-DUAL-H01` 🔧 · H02–H04 ⬜ · 草稿 `archive/20260912_131800_真网双机_步骤1-5_Win12-Ubuntu16.md`

**VERIFY（双机）**：`npm run verify:dual-machine-playbook && npm run verify:m6 && npm run typecheck && npm test && npm run verify:discover && npm run verify:discover-relay`
