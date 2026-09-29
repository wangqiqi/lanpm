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

执行原则：真源 · `task-verify` 绿再 ✅ · 用户可见变更 → CHANGELOG；归档 → `.cursorGrowth/archive/`。**本文件是计划真源**；DSH PlanRun 镜像 `.dsh/growth/plan.md` 为本地副本（已 gitignore，勿当 SSOT）。

**Steering**：`SPRINT-DUAL-REAL-01` **已闭合**（2026-09-12）。真网 Win **192.168.20.12** ↔ Ubuntu **192.168.20.16** 手验：**步骤 1 ✅**（UDP 发现对端）；**步骤 2–3 未取得归档证据**（归档记步骤 2「须双向复测」· 步骤 3 ⬜，全仓无 10MB 通过记录）；步骤 **4–8 未测**。证据：`archive/20260912_124200_真网双机_步骤1-5_Win12-Ubuntu16.md` · `archive/20260912_131800_真网双机_步骤1-5_Win12-Ubuntu16.md`（最新一版结论：「部分通过 / 阻塞」）。新开 Sprint → **`/plan`**。

---

## ⚠️ 已知拓扑 · 双路由不同网段（2026-09-12）

**SSOT**：`docs/08_组网与跨网段排障.md`（检查单 · 双主路由 · Mihomo · 同 `20.x` 已验证可连 · `20.x`↔`31.x` ping 不通属拓扑问题）。

**手验结论**：同 **`192.168.20.x`** 可连；跨网段须 **ping 通** 再用跨网段 + 完整 IP + 码。

**Decision needed（下一 Sprint）**：① 同网段续测 §6.2 **步骤 2–8**（先补 2–3 证据） · ② 真双路由单立项（勿与 ① 混 Goal）。

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 / 备注 |
|------|------|-------------|
| **真网双机 §6.2 续测** | 步骤 **2–3**（消息双向 · 10MB SHA256）+ **4–5**（双设备在线态 · 断网 20s）+ **6–8**（手动节点 · 发现群 · 私聊） | 接 `SPRINT-DUAL-REAL-01` 收官；SSOT `docs/05` §6.2；**须同网段**（见上节拓扑） |
| **真双路由发现** | Win 无线路由器 ↔ Ubuntu 有线路由器；上级同出口、本机不同 `/24` | 自动发现预期失败；验收跨网段码+IP；互 ping 不通则改拓扑而非改广播 |
| ~~跨 namespace 三节点~~ **✅ 已完成** | 跨 namespace 自动化（原 Docker 三节点 · TEST-02 思路） | 已落地 `npm run verify:cross-subnet-namespaces`：Linux 非特权 netns，2 端点 + 1 路由，覆盖 `docs/08` §3.1/§3.2/§3.3；已并入 `verify:m7`。**Docker 版无需再做**（netns 无镜像/ABI 依赖，且环境不支持时显式 SKIP） |
| macOS 真机 netstat smoke | 只读路由 | 需 mac 真机；`parseMacOsNetstatRn` 已有 fixture 单测（`tests/unit/network/routeTableParse.test.ts`） |
| 幽灵群组 / 发现列表（A05） | no-demo 发现目录收敛 | **已定位：非缺陷** —— PRD §11.4.2「连接码打通对端发现目录」即列出对端本机所有 `autoDiscover` 群；手验里「多条来自 jwzhou」来自对端本机累积的群。广告过滤已抽 `src/shared/group/advertFilter.ts` + 单测；**是否收紧广播范围（如仅 createdBy=本人）属产品决定**，无 Active TASK 前不改语义 |

**推荐下一主题**：`SPRINT-DUAL-REAL-02` — 仅补 §6.2 剩余步骤（**先确认仍同 `/24`**）。双路由隔离单独立项，勿塞进同一 Goal。

**执行顺序**: （无 Active TASK；新开 Sprint 后由 `/plan` 写入）

---

## 手验速查（延续用）

| 项 | 值 |
|----|-----|
| 启动 | `npm run dev:deploy-test -- <peer>:43124` |
| 模板 | `.cursor/templates/dual_machine_handtest_TEMPLATE.md` |
| 自动化（非替代双机） | `npm run verify:dual-machine-playbook` · `verify:m6` |
| 拓扑 | `docs/08` §2 检查单 |
