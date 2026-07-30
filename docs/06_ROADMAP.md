# 06_ROADMAP

> **只保留未完成工作。** `docs/` 不存历史；已交付叙事见根目录 `CHANGELOG.md`。  
> 手验步骤见 [05_测试与联调发布.md](./05_测试与联调发布.md)。版本以 `package.json` / `CHANGELOG` 为准。  
> **进行中 Sprint** 以 `.cursorGrowth/plan.md` 为准（当前：**SPRINT-PAIR-02** ✅ · 路由表引导单播 · **1.43.0** 已交付）。

---

## 0. 进行中（执行面板在 Growth）

| Sprint | Goal | 文档 |
|--------|------|------|
| **SPRINT-PAIR-01** | 连接码 · `discover_relay`（hop≤2）· 入群申请/审批 · 群邀请码 | [配对码.md](./配对码.md) · `plan.md` |

**候选下一 Sprint**：SPRINT-PAIR-02（路由表单播）· SPRINT-PAIR-03（U 盘/CLI）· 见 `plan.md` 候选表。

---

## 1. P1 待做

| 模块 | 功能 | 备注 |
|------|------|------|
| **会议插件（可购）** | 语音 / 视频 / 屏幕共享 / 会议室 | **不进核心**；见 **§3**；对齐飞鸽 §7 / §8.2 |
| 思维导图 | 独立编辑器 | 可购插件候选 |
| 表情、书签浏览器导入导出 | 聊天/书签体验糖 | 低优先级（原 B6 体验） |
| **L3 多步编排** | 评估 + 拆解 + 汇总报告流水线 | L3a `healthCheck` 已交付 · `verify:ai-pipeline` · L3b 人审写库待立项 |
| 移动端 Web | PWA 基础版本 | 后置 |

---

## 2. P2 待做

| 模块 | 功能 |
|------|------|
| 会议 Pro 扩展 | 多人视频会议、录制、日程入会（同一可购包升级档） |
| 完整插件市场 | 发布/安装/更新 / 签名目录 / **离线许可证** |
| 原生移动 App | iOS + Android |
| WebRTC DataChannel | 可选；默认仍 TCP+UDP（见 [01](./01_产品需求文档.md) §1.3.1） |
| 群组发现增强 | **SPRINT-PAIR-01 进行中**：连接码 · 跨网段子网中继 · 入群治理；后续 SPRINT-PAIR-02 路由表单播 | 见 [配对码.md](./配对码.md) |
| 匿名群可持久化历史 | 可选；现状退出即失、无文件 Tab |

---

## 3. 可购会议插件（语音 / 视频 / 会议）· 产品拍板

> 对齐 [飞鸽飞秋.md](./飞鸽飞秋.md) §6.3 · §7.0 · §7.6 · §8.2 · §10。  
> **原则：** 基础聊天免费；音视频会议属小众/重资源 → **做成可购插件，不进核心**。  
> Lite/POC 可免费试用；完整 SFU 会议包收费。

### 3.1 收费与边界

| 规则 | 结论 |
|------|------|
| 核心聊天（文字 / 代码 / @ / 已读） | **永久免费**，永不拆卖 |
| 语音消息 / 1v1 语音 / 视频 / 投屏 / 会议室 | **不进核心** → 插件 `lanpm.meeting`（可购） |
| 未购 / 未启用 | 聊天「语音」入口保持占位或引导升级；不实现媒体主路径 |
| 信创 / 内网 | **离线许可证**；禁止强制公网商店才能用已购插件；旁路 SFU 默认可离线安装、数据不出公网 |

### 3.2 SKU（一包多档）

| 档位 | 能力 | 技术路径 | 收费 |
|------|------|----------|------|
| **Lite / POC** | 1v1～小房间语音 + 屏幕共享（约 2～4 人） | WebRTC **mesh** + Host 代理 `desktopCapturer`；信令经 `SyncEnvelope` | 可免费试用或低价 |
| **Pro** | 语音 + 视频 + 群组会议室 | 内网旁路 **LiveKit 自托管 SFU**（**首选**；Jitsi 为 Plan B） | **可购** |
| **Pro+（P2）** | 多人会议、录制、日程入会等 | 同一插件升级档 | 同授权或升级 SKU |

> 单一插件 id（如 `lanpm.meeting`）+ 能力档位；屏幕共享归入会议包。

### 3.3 与现有插件底座

| 已有 | 会议插件还需（SPIKE-374–376 已拍板） |
|------|--------------------------------------|
| `plugins/` 发现 · `pricing: free \| paid` · Profile 启停 · Slot / Host 能力白名单 | **新增** `chat.toolbar.media` Slot · `PluginGroupSlot`（无 taskId）· 媒体 capability（`media.signal.*` · `media.captureDesktop` · `media.room.state`）· **离线许可证真正拦功能**（当前 `paid` 仅为展示） |
| 安全红线：禁插件直连 DB / `ipcMain` | 维持；媒体经 Host 代理；**builtin registry** 注册 `lanpm.meeting`；LiveKit SDK **不进**核心 `dependencies` |

### 3.4 架构注意（无中心 vs SFU）

| 方案 | 适用 | 说明 |
|------|------|------|
| A. 旁路服务插件 | **正式 Pro 会议** | 群组内一台机器或内网小主机跑 LiveKit/Jitsi；客户端插件连接 |
| B. 小房间 mesh | Lite / POC | WebRTC mesh（2～4 人），无独立 SFU |

**禁止**默认连接公有 `meet.jit.si` / LiveKit Cloud。

### 3.5 落地节奏

| 序 | 项 | 阶段 | 状态 |
|----|-----|------|------|
| 1 | **SPIKE-会议插件**（SPIKE-374–376）：Lite mesh vs LiveKit 旁路 · `chat.toolbar.media` · Presence 侧车 | 立项前 | **SPIKE 已交付** · `npm run verify:meeting-spike` |
| 2 | Host 扩展 + `lanpm.meeting` stub：`PluginGroupSlot` · 媒体 capability · 聊天 `voiceComingSoon` → Slot/升级 CTA | P1 | 下一 Sprint |
| 3 | Lite mesh POC（2～4 人 · 投屏代理） | P1 | 待 2 |
| 4 | Pro LiveKit 旁路 + 离线 compose 模板 | P1～P2 | 待 3 |
| 5 | 离线许可证（内网可购） | P1～P2 | 可与插件市场并行 |
| 6 | 插件市场安装/更新 | P2 · M8 | 待 |

验收锚点：`verify:meeting-spike`（SPIKE）· `verify:meeting-plugin`（实现 Sprint，待补）。

**下一实现 Sprint Goal（一句话）**：扩展 Host 媒体 Slot/capability + `plugins/lanpm.meeting` manifest/registry stub，并将聊天 `voice` 面板接到 `chat.toolbar.media`（Lite mesh 信令/投屏代理可 stub）。

---

## 4. 手验待补（延期 · 非阻断）

> 发版自动化：`npm run verify:release-gate`。真机项曾在正式发布时显式接受风险；有设备再补。

| 项 | 现状 |
|----|------|
| Win/mac/Linux **真机 UI** 七页肉眼 | 自动化 CI 三 OS × `verify:m7` 已闭合；真机延期 |
| **真网**双机（发现 → 加群/私聊/已读） | `verify:dual-stub` 已闭合；真网延期 |
| 冷启动 / 空闲·聊天内存 / Tab P95 手测 | `verify:m7-perf` 部分自动化；生产包真机延期 |
| 英文长文案折行肉眼 | `verify:i18n-en` 无 CJK；全页折行延期 |

方法见 [05](./05_测试与联调发布.md) §2 / §5 / §6。

---

## 5. 候选队列（建议序）

| 候选 | 说明 | 备注 |
|------|------|------|
| **SPIKE-会议插件** | mesh vs LiveKit；`lanpm.meeting` 可购 SKU | **§3** · SPIKE 已交付 |
| 插件市场 SPIKE | 侧载/目录/签名 / **离线许可证** | P2 |
| 思维导图 | 可购插件 | P1 |
| PWA | 移动端 Web | 后置 |
| 真机手验补测 | §4 延期项 | 有设备再开 |
| WebRTC DataChannel | 可选 | 非默认路径 |

---

## 6. 文档指针

| 内容 | 位置 |
|------|------|
| 已交付对外说明 | 根目录 `CHANGELOG.md` |
| 跨平台矩阵 | [05](./05_测试与联调发布.md) §1.4 |
| 测试与联调 | [05_测试与联调发布.md](./05_测试与联调发布.md) |
| 竞品与收费 | [飞鸽飞秋.md](./飞鸽飞秋.md) |
| Sprint 执行 | `.cursorGrowth/plan.md`（本地） |
