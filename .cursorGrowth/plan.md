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



执行原则：真双机手验 SSOT → `docs/05_测试与联调发布.md` §6 · 证据归档 → `.cursorGrowth/archive/`（`YYYYMMDD_HHMMSS_真网双机_说明.md`）；**Windows 本机修复须同步到 Ubuntu**；代码修复走 CHANGELOG · `/release`。



**Steering（2026-09-12）**：Win `dev:fresh:no-demo` 手验暴露 **P0** — 进群后成员栏仅自己、会议退出摄像头不灭、paid 插件开关与许可证体验混淆。**暂停 §6.2 步骤 2–8**，先完成 `TASK-DUAL-04a`–`04d`，再续 `TASK-DUAL-02`/`03`。



---



## Active sprint · SPRINT-DUAL-REAL-01



**Goal**：在 **Windows + Ubuntu 真机**上完成 M6 局域网双机手验（§6.2），阻塞项修到可复现通过，并留下可对外引用的手验归档与 ROADMAP 证据更新。



**Done when**：



- [ ] §6.2 步骤 1–8 在 Win↔Ubuntu 上执行并记入归档（含环境：OS、commit、防火墙说明）

- [ ] 联调中发现的 **P0** 缺陷已修或记为已知限制（带 issue/归档说明）

- [ ] `npm run verify:dual-machine-playbook` · `npm run verify:m6` · `typecheck` 绿

- [ ] `docs/06_ROADMAP.md` §4 真网双机条目与 §6.0 证据边界一致

- [ ] 手验归档文件已写入 `.cursorGrowth/archive/`（模板见 05 §6.4）

- [ ] **no-demo 双机**：对方在成员栏可见（或文档化已知限制）；会议退出后摄像头/录制流释放；插件启停与 paid 许可证边界清晰



**联调环境（已登记 · 手验归档须一致）**：



| 角色 | 设备 | 网络 | 备注 |

|------|------|------|------|

| **B（Ubuntu 真机）** | 有线接路由器 | **`192.168.20.16`** | 手动节点 **`192.168.20.16:43124`** |

| **A（Windows 真机）** | 有线/无线同路由器 | **`192.168.20.12`** | `dev:dual-peer -- 192.168.20.16:43124` · 隔离测试 `dev:fresh:no-demo` |



- 勿设 `LANPM_NETWORK=stub`；防火墙 **UDP 43123** · **TCP 43124**。

- 同步点：手验归档记录 `git rev-parse HEAD`；Ubuntu `git pull` 同 SHA。



**Out of scope**：



- CI 内跑真双机；macOS 第三端；Docker 三节点 nightly

- 10MB 以外性能压测；会议 LiveKit 全矩阵部署（仅修客户端离开/设备释放）

- 应用商店 / 侧载签名流程改造



**决策打断清单**：



| 决策 | 默认 | 打断条件 |

|------|------|----------|

| 手验形态 | 两边 `npm run dev`（同 commit） | 必须用 release 安装包才算通过 |

| no-demo 成员语义 | `group_members` + 消息发送者 + 同群发现 peer | 要改回「全网 peer 进成员栏」 |

| 会议离开 | 统一释放 Lite+Pro+本地录制 | 要拆成两个独立离开按钮且不复用 |

| paid 插件 | 开关可写 `plugin-enabled.json`；无 license 时 UI 明确禁用能力 | 要默认开放 meeting 无 license |

| 修复下发 | **git push → Ubuntu pull** | LAN rsync 直传 |



| ID | Task | Priority | Status | Acceptance | Target | Owns |

|----|------|----------|--------|------------|--------|------|

| TASK-DUAL-01 | Playbook 守卫 + 双机环境核对 | P0 | ✅ | `verify:dual-machine-playbook` 绿 | `tests/static/verify-dual-machine-playbook.ts` · `docs/05` §6.1 | `docs/05_测试与联调发布.md` |

| TASK-DUAL-04a | **no-demo 成员**：收/发消息写 `group_members`；列表合并消息发送者+同群 peer；**新消息后刷新成员** | P0 | ✅ | `dev:fresh:no-demo` 双机：聊天有对方则成员栏可见；`typecheck` 绿；可选单测 | `src/main/chat/memberService.ts` · `chatService.ts` · `offlineSyncService.ts` · `ChatView.tsx` | 上列路径 |

| TASK-DUAL-04b | **Setup 保存**：`completeSetup` 前 close DB 再迁 profile（Windows EBUSY） | P0 | ✅ | `dev:fresh:no-demo` 向导「继续」成功；无 EBUSY rename | `src/main/ipc/identity.ts` · `storage/profilePaths.ts` | 上列路径 |

| TASK-DUAL-04c | **会议退出**：统一离开释放 Pro 摄像头/麦、Lite mesh、**本地录制** `getUserMedia` 流 | P0 | ✅ | 开摄像头或录制后点离开，系统摄像头灯灭；`typecheck` 绿 | `MeetingToolbar.tsx` · `useMeetingLiveKit.ts` · `useMeetingMesh.ts` · `useMeetingRecording.ts` | 上列路径 |

| TASK-DUAL-04d | **插件启停**：paid 无 license 时 Profile/槽位明确提示（非静默半可用）；`lanpm.example` free 路径回归 | P1 | ✅ | 开关 meeting 无 license 见 CTA 非报错；example 仍可发演示消息 | `PluginsPanel.tsx` · `MeetingToolbar.tsx` · `discover.ts`（仅文案/UX） | `src/renderer/src/features/profile/` · `plugin/builtins/` |

| TASK-DUAL-02 | 执行 §6.2 步骤 1–5 并记录 | P0 | ⬜ | 依赖 04a–04c；归档含逐步结果 | 手验归档 | `.cursorGrowth/archive/*真网双机*` |

| TASK-DUAL-03 | 执行 §6.2 步骤 6–8 并记录 | P0 | ⬜ | 同上 | 手验归档 | `.cursorGrowth/archive/*真网双机*` |

| TASK-DUAL-04 | 联调其余 P0 + push → Ubuntu pull 复测 | P0 | ⬜ | 复测绿；archive 含 commit | `src/**`（按缺陷） | 按缺陷单开 |

| TASK-DUAL-05 | ROADMAP/05 证据 + Sprint 归档摘要 | P1 | ⬜ | §4/§6.0 一致；plan 删 Active | `docs/06_ROADMAP.md` | `docs/06_ROADMAP.md` |



**执行顺序**: `TASK-DUAL-01` ✅ → `TASK-DUAL-04a` → `TASK-DUAL-04b` → `TASK-DUAL-04c` → `TASK-DUAL-04d` → `TASK-DUAL-02` → `TASK-DUAL-03` → `TASK-DUAL-04`（按需）→ `TASK-DUAL-05`



**调查摘要（04a–04d 依据）**：



- **成员**：`LANPM_NO_DEMO=1` 只读 `group_members`；加入群仅写自己；聊天不同步成员；前端仅切群时 `loadMembers`。

- **Setup**：`identity:completeSetup` 在 DB 打开时 `rename` profile → Windows `EBUSY`（04b 部分已在工作区，需 verify 后 ✅）。

- **会议**：Lite「离开」不调 `leaveProRoom`；录制流离开不关；Pro 未先 `setCameraEnabled(false)`。

- **插件**：`lanpm.meeting` 等为 **paid**，开关≠许可证；属 UX 澄清非必改后端。



---



## 下一 Sprint · 候选



| 候选 | Goal | 依赖 |

|------|------|------|

| `dev:fresh:no-demo` 文档入 README | 零数据自测命令一行说明 | 04a–04b ✅ |

| macOS 真机 `netstat` nightly | 只读路由 smoke | TEST-02 ✅ |

| Docker 三节点 nightly | 跨 namespace | TEST-02 设计 |

| UX P2 起步 | 默认进看板 · 发现两步向导 | 本 Sprint 不挡 |


