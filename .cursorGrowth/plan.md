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

## ⚠️ 已知拓扑 · 双路由不同网段（2026-09-12 用户记录）

**现象**：两台机器、两台路由器；Win **无线**、Ubuntu **有线直连**；上级出口是**同一局域网**，但双方**互相发现不了**。

**判定（产品预期，非「坏了」）**：上级同一出口 ≠ 同一 L2/L3 网段。两台路由器各自 NAT 时，常见是 `192.168.A.x` 与 `192.168.B.x`。UDP 自动发现（`43123` 广播）**只打本网段**，跨路由器广播默认到不了。PRD `docs/01` §11.4.3：同网段零配置；跨网段要 **6 位连接码 + 勾选跨网段 + IP/尾段**（或路由表引导 / 高级网段扫描），且 **两子网路由须可达**。

| 层 | 用户现场 | 对 LanPM 的含义 |
|----|----------|-----------------|
| 上级 / 出口 | 同一总网 | 出外网同一条；**不保证**互 ping |
| 本机接入 | 路由器 1 WiFi ↔ Win；路由器 2 有线 ↔ Ubuntu | 各路由器自己的 LAN |
| 发现 | 自动发现失败 | 符合「不同 `/24`、广播隔离」 |

**手验时先抄这两行（下次开测必填）**：

| 机 | 接入 | `ipconfig` / `ip -4 addr` | 默认网关 |
|----|------|---------------------------|----------|
| Win | 无线路由器 | （待填） | （待填） |
| Ubuntu | 有线路由器 | （待填） | （待填） |

能互 ping / TCP `43124` → 走跨网段配对（`docs/04` 发现页「跨网段」）。互 ping 不通 → 双 NAT 隔离，产品发现也打不穿；须改拓扑（第二台改 AP/桥接、关隔离、或两台挂同一 AP），**不是**再调 UDP 广播能修好的。

**Decision needed（下一 Sprint 拍板，勿混进 §6.2 续测）**：

1. **同网段续测**：把其中一台接到同一 AP / 同一交换机，再跑 §6.2 步骤 4–8。  
2. **真双路由手验**：保持现拓扑，验收跨网段连接码（Goal 单独写，勿与 1–3 同网段叙事混）。

---

## 下一 Sprint · 候选

| 候选 | Goal | 依赖 / 备注 |
|------|------|-------------|
| **真网双机 §6.2 续测** | 步骤 **4–5**（双设备在线态 · 断网 20s）+ **6–8**（手动节点 · 发现群 · 私聊） | 接 `SPRINT-DUAL-REAL-01` 收官；SSOT `docs/05` §6.2；**须同网段**（见上节拓扑） |
| **真双路由发现** | Win 无线路由器 ↔ Ubuntu 有线路由器；上级同出口、本机不同 `/24` | 自动发现预期失败；验收跨网段码+IP；互 ping 不通则改拓扑而非改广播 |
| Docker 三节点 nightly | 跨 namespace 自动化 | TEST-02 |
| macOS 真机 netstat smoke | 只读路由 | — |
| 幽灵群组 / 发现列表（A05） | no-demo 发现目录收敛 | 非阻塞 backlog |

**推荐下一主题**：`SPRINT-DUAL-REAL-02` — 仅补 §6.2 剩余步骤（**先确认仍同 `/24`**）。双路由隔离单独立项，勿塞进同一 Goal。

**执行顺序**: （无 Active TASK；新开 Sprint 后由 `/plan` 写入）

---

## 手验速查（延续用）

| 项 | 值 |
|----|-----|
| 启动 | `npm run dev:deploy-test -- <peer>:43124` |
| 模板 | `.cursor/templates/dual_machine_handtest_TEMPLATE.md` |
| 自动化（非替代双机） | `npm run verify:dual-machine-playbook` · `verify:m6` |
| 拓扑 | 自动发现 = 同一 `/24`；双路由见上文 ⚠️ |
