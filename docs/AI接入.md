# AI 接入方案（讨论纪要 · SSOT）

> **状态**：设计讨论稿（2026-07-29）· 待 `/plan` 立项  
> **关联**：`docs/01` §12 · `docs/06_ROADMAP` §1（AI 自动化巡检）· `docs/飞鸽飞秋.md` §7/§9/§10 · `docs/MIT开源替代.md` §4.6  
> **实现入口**：`src/main/cockpit/cockpitService.ts` · `src/main/ai/aiConfigService.ts` · `src/renderer/src/views/CockpitView.tsx`

---

## 1. 定位：与 LAN PM 的关系

### 1.1 产品原则

| 规则 | 含义 |
|------|------|
| **PM 不依赖网** | 看板 / 任务树 / 甘特 / 日历 / 白板 / 文件 / 群组 P2P / 驾驶舱 KPI 均为本地规则与 SQLite |
| **AI 不依赖网** | 未配置、用户关闭、或无网络时 **零打扰**；入口可灰显或隐藏 |
| **有网才增强** | 流式对话、外呼润色、任务评审建议等 **可选** 走用户自配端点 |
| **扩展不绑中心服** | 不接公有 Agent 平台为默认路径；`baseUrl` + API Key 由用户/管理员配置（含内网兼容网关） |

**一句话**：协作数据在 LAN；AI 为 **可选联网扩展**，可随时关闭，不参与群组 P2P 同步协议。

与「LibreOffice 外挂预览」「可购会议插件」同一哲学：**本体无中心 · 增强能力可外呼或旁路**。

### 1.2 第一期 vs 第二期（拍板意向）

| 阶段 | 范围 |
|------|------|
| **第一期（LAN PM 主路径）** | 七大视图 + 驾驶舱规则 KPI + 本地周报/月报模板；**不依赖 AI 即产品完整**（见 `docs/00` M0–M5、`飞鸽` §10.2 第一波） |
| **第二期（AI 增强）** | 流式对话、单任务/批量评审、拆任务草案、定时巡检；多智能体编排可后置 |

**已拍板（2026-07-29）**：AI 助手 **内置免费**（`lanpm.ai-assistant` builtin + manifest，`pricing: free`）；**不做**第二期才收费的硬性门槛（高级 Agent 编排仍可后续 SKU）。

第一期已具备的 **P0 手动 AI**（驾驶舱三键 + API Key）保留，作为第二期流式助手的底座，不阻塞第一期发版叙事。

---

## 2. 现状：已接入什么、能点什么

### 2.1 配置与调用链

| 项 | 说明 |
|----|------|
| 配置存储 | `ai_config` 表 · `getAiConfig` / `saveAiConfig`（`src/main/ai/aiConfigService.ts`） |
| 厂商预设 | DeepSeek（默认）、通义、智谱、Moonshot、OpenAI、Anthropic、自定义（`src/shared/cockpit/aiProviders.ts`） |
| 外呼协议 | OpenAI 兼容 **`POST {baseUrl}/chat/completions`**（`cockpitService.callExternalAi`） |
| 脱敏策略 | `dataPolicy: desensitized-only`；任务标题、状态、进度、描述摘要（≤80 字）；**不含**聊天全文、文件内容 |

### 2.2 驾驶舱 UI（`/cockpit`）

| 按钮 | 行为 |
|------|------|
| **周报**（主 CTA） | 本地 Markdown +（已启用 API 时）追加「AI 建议」 |
| **月报** | 同上 |
| **AI 评估** | 跨项目脱敏任务摘要 + 本地规则 +（可选）外部评语 |
| **API Key** | `AiConfigModal`：厂商、baseUrl、model、启用开关、Key |
| **报表输出** | 生成后展示；支持 **复制报告**；**无**一键发群聊、**无**流式、**无**多轮对话 |

未配置 Key 或未 `enabled`：三键仍可用，结果为 **纯本地模板**（`usedExternalAi: false`）。

顶栏可带 `openAiConfig` 状态跳转驾驶舱并打开配置（`TopBar.tsx`）。

### 2.3 尚未实现（PRD §12.3 与讨论缺口）

| 能力 | 状态 |
|------|------|
| 单任务「AI 审核/评审」 | 类型 `AiTaskAuditPayload` 已有；**任务详情无入口** |
| 流式多轮对话 | ❌ |
| 一键发送报告到群聊 | ❌（仅剪贴板复制） |
| 任务拆解并落库 | ❌（第二期 · 须人审） |
| AI 自动化巡检 / 阻塞推送 | ROADMAP P1 仍开 |

### 2.4 技术注意

- **Anthropic** 等若非 OpenAI 兼容 `baseUrl`，当前 `callExternalAi` 可能失败，需自定义兼容网关或第二期单独适配。
- 外呼仅在 **Electron 主进程**；浏览器 Stub（`dev:web`）为 mock，验收以 Electron 为准。

---

## 3. 目标能力（第二期 · 全入口 + 全自适应）

### 3.0 导航落点：顶栏 + 浮层，非底栏第八 Tab（已拍板 · 2026-07-29）

**决策**：采用 **方案 B — 顶栏全局「AI 助手」+ `AiAssistantShell`（Dock / Drawer / 全屏叠层）**；**不**在底部 Tab 增加第八视图（如 `/g/:groupId/assistant`）。

**一句话**：底栏七 Tab = **群内协作视图**（大家看同一份 P2P 数据）；AI = **个人外呼助手**（本地会话、不同步）。语义分离，主入口放 **顶栏**；Shell 内可 **一键全屏展开**（方案 B+C），仍 **不** 单独占底栏 Tab 位。

#### 与现有导航的关系

| 区域 | 作用域 | 产品语义 |
|------|--------|----------|
| 底栏 7 Tab | `/g/:groupId/*`（见 `BottomNav` · `AppView`） | 群内协作：聊天、看板、树、甘特、日历、白板、文件 |
| 顶栏驾驶舱 | `/cockpit` 全局 | 跨项目 KPI / 报表；此路由 **无底栏** |
| **顶栏 AI 助手** | 全局可开（任意群视图、驾驶舱均可） | 个人助手浮层；打开瞬间带 **当前群/跨项目上下文** |

```text
MainLayout
├── /g/:id/chat … files     ← 底栏七视图（协作）
├── /cockpit                ← 顶栏驾驶舱（跨项目）
└── AiAssistantShell        ← 顶栏浮层/Dock（个人 · 不进 Tab 列表 · 不进底栏路由）
```

#### 底栏第八 Tab：评估结论（**不采纳**）

| 优势 | 劣势（否决理由） |
|------|------------------|
| 发现性强，与聊天/看板同级 | 底栏已 7 项，窄屏标签拥挤或需横滑 |
| 全屏适合长对话 | Tab 强绑定 URL 群，用户易误解「AI 历史属于群、会同步给队友」 |
| 在项目群内 `#` 任务列表自然 | `/cockpit` 无底栏，跨项目问 AI 需另找入口，体验分裂 |
| | DM / 匿名 / 功能群底栏规则不一（`tabRules.ts`），第八 Tab 难统一 |
| | **协作视图 vs 个人工具** 混淆；与 §3.2「会话仅本地」冲突 |
| | 全屏 Tab 需离开看板/树，无法「边看任务边问」 |

**曝光折中（仍不占第八 Tab）**：顶栏固定 AI 图标（离线/未启用可灰显）· 驾驶舱 / 任务详情 **带上下文跳进同一 Shell** · （可选）聊天区顶栏次级快捷入口。

#### 顶栏入口与群组/项目绑定

**默认绑定「打开瞬间的上下文」；会话历史不交给群、不参与 P2P。**

```text
用户点顶栏「AI 助手」
        │
        ├─ 当前在 /g/项目A/board  → context.groupId = 项目A
        │                           # 联想、任务注入、脱敏摘要默认限 A
        │
        ├─ 当前在 /cockpit         → context = 跨项目（同驾驶舱 desensitize）
        │
        └─ 无活跃群 / 首页          → context 空或「上次群」（立项时定默认 + UI 文案）

本机 ai_thread
    userId（必）· groupId?（可选标签，筛「本项目相关 AI 记录」）
    不同步 P2P · 队友不可见
```

| 维度 | 是否绑定群 | 说明 |
|------|------------|------|
| `#` 任务联想列表 | ✅ 默认当前群 | 与 `ChatView` · `@shared/chat/taskRefs` 一致 |
| 注入模型的任务上下文 | ✅ 默认当前群 | 可手动 `#` 他群任务（若本地库可读） |
| 会话历史归属 | ❌ 不属群 | 每人各一份；`groupId` 仅作本地筛选/归档标签 |
| 用户切换顶栏群 | 上下文随群变 | UI 明确：**继续当前线程** 或 **按新 groupId 新开线程** |

实现上顶栏按钮读取 `navigationStore.activeGroupId` 或路由 `groupId`；**不等于** AI 挂在某个底栏 Tab 路由上。

### 3.1 统一壳：`AiAssistantShell`

**一个聊天壳、多种挂载**，避免驾驶舱 / 任务详情 / 顶栏各做一套 UI。

| 入口 | 形态 | 默认上下文 |
|------|------|------------|
| **顶栏** | 全局「AI 助手」→ Dock / Drawer / 全屏（**非底栏 Tab**） | 打开瞬间的当前群；驾驶舱为跨项目 |
| **驾驶舱** | 保留周报/月报/评估 + **「在助手中继续」** | 刚生成报告作为会话起点 |
| **任务详情** | `task.detail.section` 折叠区 + **「就此任务提问」** / **「AI 评审」** | `taskId`、标题、进度、验收项摘要 |
| **报表区** | **复制** · **发到群聊** · **在助手中继续** | 与驾驶舱共用会话模型 |

插件包：`plugins/lanpm.ai-assistant` — **内置免费**（`pricing: free` · Host **builtin registry** 挂载，与 `lanpm.example` / form-js POC 同模式；**不**要求用户单独安装才显示入口）。

### 3.2 会话与同步（已拍板）

| 规则 | 说明 |
|------|------|
| **存储** | 会话与消息 **仅本机 SQLite**（如 `ai_thread` / `ai_message`），按 **本机用户身份** 隔离 |
| **不同步 P2P** | **不参与**群组 `task_patch` / 聊天同步协议；每人各看各的 AI 历史 |
| **与协作数据边界** | 任务/聊天/文件仍走 LAN 同步；AI 记录是 **个人外呼助手痕迹**，不是群资产 |
| **发到群聊** | 用户主动 **「发到群聊」** 时，将选中回复/报告写入当前群聊天；消息带 **AI 来源标记**（见 §3.3） |

### 3.3 输入：`#` 引用任务（已拍板 · 与聊天框一致）

**可以，且应与群聊共用同一套交互与解析 SSOT。**

| 项 | 约定 |
|----|------|
| **交互** | Composer 支持 `#` + 联想列表（拼音/标题匹配），与 `ChatView` 相同提示文案习惯 |
| **代码复用** | `@shared/chat/taskRefs`：`extractTaskRefQuery` · `filterTasksByQuery` · `resolveTaskByTitleToken` · `splitTaskRefSegments` |
| **发给 AI 时** | Main 将 `#任务名` 解析为 `taskId`，向模型注入 **脱敏任务上下文**（标题、状态、进度、描述摘要等；规则同 `AiTaskAuditPayload`），**不**把整段群聊历史外发 |
| **发给群聊时** | 两种形态二选一或并存（立项定一种默认）：① 正文 Markdown + 前缀标记 `[AI 助手]`；② 含 `#任务名` 时拆 `task_ref` 卡片（与聊天一致） |
| **标记** | 群聊消息 `content` 增加可选字段或独立 `kind`（如 `ai_share` / `meta.source: 'ai-assistant'`），气泡展示 **「来自 AI 助手」** 角标，可点击跳回本地会话（仅发送者本机） |

从任务详情点「就此任务提问」时，Composer **预填 `#${task.title} `**，等价于用户手动 `#` 引用。

### 3.3.1 隐式上下文（SPRINT-AI-02 · Main 每次外呼注入）

用户界面**不展示**；写入 system prompt，遵守 `desensitized-only`。

| 层 | 字段 | 时机 |
|----|------|------|
| **系统** | 当前日期时间 · 时区 · ISO · locale · 网络在线 · 当前用户显示名 | 每条消息 |
| **场景** | 群名 · 群 KPI（进行中/完成/逾期/落后）· attention Top5 | 有 `groupId` |
| **场景** | `entrySource`（topbar/cockpit/task-detail/global）· `appView`（board/chat/…） | 每条消息 |
| **对象** | `#` 解析任务 + `context.taskId` 入口绑定任务 | 合并去重 |
| **对象** | 任务扩展：`scheduleHealth` · `daysUntilDeadline` · 负责人 · checklist 标题+done · 父任务标题 · tags | 对象层任务 |
| **显式** | `seedMarkdown`（驾驶舱报告）· 多轮历史 | 入口/线程 |

**禁止隐式注入**：群聊全文 · 文件内容 · API Key/密码 · 未授权他群任务全表 · 其他用户 AI 会话。

### 3.4 全自适应布局

对齐现有断点（`useMediaQuery` · `chat.module.css` / `CockpitView.module.css` 约 **900 / 960 / 1100px**）：

| 视口 | 布局模式 |
|------|----------|
| 宽屏 ≥1100px | 右侧 **Dock**（约 380–420px）或右推 Drawer |
| 中屏 900–1100px | Drawer 约 **85vw**，不挡底栏 |
| 窄屏 &lt;900px | **全屏 Sheet**，Composer 贴底；顶栏返回 |
| 任意宽度 | Shell 内 **「全屏展开」** 可选（等同 B+C，**不**新增 `/assistant` 底栏路由） |

| 区域 | 要点 |
|------|------|
| 消息列表 | `AiMessageRow`：用户/AI 头像 · 发送者 · `HH:mm`；**助手消息** `MarkdownView` 渲染（`react-markdown` + GFM）；复制下拉 **Markdown / 纯文本**；连续同角色紧凑排列；**多选** → 复制选中 / 发到群聊 |
| 快捷提示 | 全屏宽屏右侧 `promptRail`；Dock/Drawer/窄屏为 Composer 上方 `promptChips`；**点击即发送**（非填输入框） |
| Composer | 多行输入；**与群聊同构** `composerIsland` + `inputComposeRow`（TextArea + 分享图标钮 + 圆形发送）；窄屏仅图标 + `aria-label` |
| 群聊对齐 | 发到群聊的 AI 摘要与普通含 MD 语法的文本消息，在群聊 `ChatMessageText` 中同样走 `MarkdownView`（保留 `@` / `#任务`）；SSOT → `renderer/ui/MarkdownView.tsx` |
| 工具条 | 评审 / 拆任务 / 发群 → 窄屏收成 `Dropdown` |
| 主题 | 亮暗跟 `--lanpm-*`；**不**引入独立 shadcn 全站主题 |

### 3.5 有无网络：三层门禁

```text
ai_config.enabled？ ─否→ 隐藏或灰显 AI 入口；驾驶舱仅本地报表
        │
        ▼ 是
已配置 Key + baseUrl？ ─否→ 引导 API Key 配置
        │
        ▼ 是
在线？ ─否→ 提示「离线 · 仅本地规则」；禁用发送；已缓存会话只读
        │
        ▼ 是
流式对话 / 外呼评审 / 外呼润色
```

| 检测 | 建议实现 |
|------|----------|
| 粗在线 | `navigator.onLine` + `online` / `offline` 事件 |
| 端点可达 | 可选对 `baseUrl` 轻量探测；失败则降级，避免重试风暴 |
| 业务开关 | `ai_config.enabled` |
| 无网仍可用 | 驾驶舱 KPI、本地周报/月报模板、规则型需关注（与现网一致） |

---

## 4. 开源选型（MIT / 宽松 · 可集成）

选型纪律见 `docs/MIT开源替代.md`：**npm 薄适配优先** · 禁 GPL 进依赖 · 关键逻辑在 Host。

### 4.1 推荐组合

| 层 | 项目 | 授权 | 在 LanPM 中的角色 |
|----|------|------|-------------------|
| **流式引擎** | [Vercel AI SDK](https://github.com/vercel/ai) `ai` | MIT | 主进程 `streamText` / `generateObject`（拆任务、评审 JSON） |
| **聊天 UI** | [assistant-ui](https://github.com/assistant-ui/assistant-ui) `@assistant-ui/react` | MIT | Thread / Message / Composer primitives；皮肤用 Ant Design + CSS Modules |
| **结构化输出** | Zod | MIT | 与 `generateObject` / `Output.object` 配合 |
| **轻量备选 UI** | [react-ai-stream](https://github.com/trimooo/react-ai-stream) | MIT | 自建 IPC→类 SSE 桥时可用 `@react-ai-stream/ui` |
| **快速 POC** | [deep-chat](https://github.com/OvidijusParsiunas/deep-chat) | MIT | 仅原型；**生产禁止 `directConnection` 把 Key 放 Renderer** |

### 4.2 第二期再考虑

| 项目 | 授权 | 用途 |
|------|------|------|
| [open-multi-agent](https://github.com/open-multi-agent/open-multi-agent) | MIT | Goal → Task DAG · 多角色编排 |
| LangGraph.js | Apache-2.0 | 显式图 · 可复现流水线 |

### 4.3 不建议

- 浏览器直连厂商 API（Key 暴露、违背脱敏集中治理）
- 绑定公有 Agent SaaS 为默认路径
- `@cognipeer/chat-ui` 等强依赖自家 agent-server 的 UI 包
- GPL 系整包聊天壳进核心依赖

---

## 5. 架构草图

### 5.1 进程与数据流

```text
Renderer                          Main (Node / Electron)
────────                          ─────────────────────
AiAssistantShell                  aiConfigService（已有）
  assistant-ui Thread      ←→     streamText / generateObject（ai SDK）
  离线门禁 / 自适应 layout          脱敏 assemblePrompt(context)
                                  OpenAI-compatible fetch(baseUrl)
IPC: ai:streamChat                Key 解密仅 main
  ← chunk / done / error          可选：ai_thread / ai_message（SQLite 本地）
```

**推荐传输**：IPC 分片（`webContents.send('ai:chunk')`），不默认起 loopback HTTP 服务。

### 5.2 插件与 Host 能力（待扩展）

现有 Slot（`src/shared/plugin/types.ts`）：`task.detail.section` · `topbar.menu` · `profile.tab` 等。

建议新增 Slot（立项时定名）：

- `cockpit.ai.action` 或驾驶舱内嵌区
- 顶栏「AI 助手」可走 `topbar.menu` 或核心内置

建议新增 Capability（**仅 Host 实现** · 插件经 `invokeCapability`）：

| Capability | 说明 |
|------------|------|
| `ai.streamChat` | 流式多轮（脱敏后外呼） |
| `ai.completeStructured` | 评审 / 拆任务 JSON（Zod 校验） |
| `ai.getThread` / `ai.saveThread` | 会话持久化（**仅本机** · **不同步 P2P**） |
| `chat.sendMarkdown` | 报告/回复 **发到群聊**（带 AI 来源标记 + 可选 `#` task_ref） |

安全红线不变：插件 **禁止** 直连 `ipcMain` / SQLite（`PLUGIN_SECURITY_RULES`）。

### 5.3 与现有驾驶舱三键的关系

| 现有 | 升级后 |
|------|--------|
| 周报 / 月报 / AI 评估（一次性） | **保留**；生成后 **「在助手中继续」** |
| 复制报告 | 增加 **发到群聊** |
| 无对话 | Shell 内 **流式多轮** |
| 无单任务评审 | 任务详情 **「AI 评审」** → 结构化结果 + 可选展开对话 |

**拆子任务落库**：第二期 · 必须 **预览 + 人审** 后 `insert`，禁止静默改 CRDT。

### 5.4 A4 实现（SPRINT-AI-03 · v1.37.0）

| 能力 | 实现 |
|------|------|
| 子任务提案 | `ai:proposeSubtasks` · `shared/ai/subtaskSchemas.ts`（Zod）· `aiSubtaskService` |
| 人审落库 | `SubtaskPreviewModal` · `ai:confirmSubtasks` → `createGroupTask(parentTaskId)` |
| 定时巡检 | `aiPatrolService` + `aiPatrolScheduler`（默认 24h · 启动延迟 5min） |
| 通知与记录 | `showDesktopNotification` · SQLite `ai_patrol_runs` · 驾驶舱摘要 |
| 配置 | `ai_config.patrol_enabled` · `patrol_interval_hours` · `AiConfigModal` |
| 验收 | `verify:ai-subtask` · `verify:ai-patrol` · `verify:ai-endpoint-probe` |

### 5.5 A4+ 端点探测（SPRINT-AI-04 · v1.38.0）

| 能力 | 实现 |
|------|------|
| 探测 | `GET {baseUrl}/models` · 超时 5s · 5xx/网络/超时 → 不可达 |
| 缓存 | 成功 5min · 失败 2min · 内存 TTL |
| 门禁 | `AiGateStatus.endpointReachable` · `canStream` 须探测成功 |
| 调度 | 启动 30s 后首次探 · 保存配置后立即探 · `ai:probeEndpoint` |
| UI | 配置页「测试连接」· 助手 `ai.gateEndpointUnreachable` |

### 5.6 A4++ 助手拆分与巡检续读（SPRINT-AI-03+ · v1.39.0）

| 能力 | 实现 |
|------|------|
| 巡检续读 | `formatPatrolSeedMarkdown` · 驾驶舱巡检 Panel「在助手中继续」· `reportKind: 'patrol'` |
| 助手拆分 | `resolveAssistantTaskId` · 助手头栏「AI 拆分」· 复用 `SubtaskPreviewModal` |
| 快捷提示 | `splitSubtasks` · `patrolFollowUp` preset |
| 验收 | `verify:ai-assistant-patrol-subtask` |

---

## 6. 智能体与 PM 工作覆盖（讨论结论）

### 6.1 三层分工

| 层 | 负责 | 技术 |
|----|------|------|
| **L1 规则** | 进度跟踪、延期/风险、驾驶舱 KPI、需关注任务 | 已有 `scheduleHealth` · `attentionTasks` · **不靠 LLM** |
| **L2 LLM 建议** | 评审文案、周报润色、拆任务 **草案** | `generateObject` / 流式对话 · **人审后落库** |
| **L3 多步编排** | 评估 + 拆解 + 汇总报告流水线 | 第二期 · open-multi-agent / LangGraph |

### 6.2 「LAN PM 工作是否齐全」（不含 AI）

按 `飞鸽` §7.3 / §10.2 **第一波免费主路径**：**已齐**（M0–M5、`verify:m7` 自动化闭合）。  
高级排程、敏捷包、会议 SFU、思维导图等为 **可购 / P1–P2**，非第一期缺口。

### 6.3 L3 编排调研结论（SPRINT-AI-05 SPIKE · 2026-07-29）

**拍板**：首条 L3 采用 **自建轻量状态机**（`aiPipelineRunner`）+ **复用**现有 L2 步骤（`reviewTask` · `proposeSubtasks` · 群概况规则），**不**默认引入 LangGraph.js / open-multi-agent 进核心依赖。

| 项 | 结论 |
|----|------|
| L2 就绪度 | 流式 · 评审 · 拆分子任务 · 巡检已具备；缺统一 runner 与 `ai_pipeline_runs` |
| 首条预设 | **项目健康检查**（只读）：规则 attention → LLM 风险摘要 → Markdown 报告 |
| 入口 | 驾驶舱一键 + 助手续读（非后台 daemon） |
| 人审 | 凡写库步骤须 UI 确认（`SubtaskPreviewModal` 模式） |
| 后续 Sprint | `SPRINT-AI-06` · TASK-AI-070–077（见 SPIKE 归档） |
| 验收锚点 | `verify:ai-orchestration-spike`（文档 · 无编排框架 deps） |

详表与对比 → `.cursorGrowth/archive/20260729_164100_SPRINT-AI-05_多智能体编排SPIKE.md`

---

## 7. 落地分期（建议 Sprint）

| Sprint | 交付 | 自适应 |
|--------|------|--------|
| **A1** | IPC 流式 + `AiAssistantShell` + 顶栏 Drawer + 离线门禁 | drawer / fullscreen |
| **A2** | 驾驶舱「继续对话」+ 报告 **发群聊** + 会话本地 SQLite | 同壳 |
| **A3** | 任务详情 Slot + 单任务评审 + 宽屏 dock | dock / drawer / fullscreen |
| **A4**（二期） | 拆子任务预览落库、定时巡检、高级编排 SKU（**助手本体仍免费**） | — |

预估 **>5 TASK** → 须 `/plan` 写入 `plan.md` 并获确认后再编码。

### 7.1 验收锚点（立项时补脚本名）

- `verify:ai-offline-gate` — 无网 / 未启用时不外呼
- `verify:ai-stream-ipc` — 主进程 mock 流式分片
- `verify:ai-desensitize` — prompt 不含禁止字段
- 纳入 `verify:p0` 或任务级 `task-verify`（发布时与 `docs/05` 对齐）

---

## 8. 已拍板项（2026-07-29）

| # | 决策 | 说明 |
|---|------|------|
| 1 | **内置免费** | `lanpm.ai-assistant` · `pricing: free` · builtin registry；顶栏/驾驶舱/任务详情入口默认可用 |
| 2 | **会话仅本地、不同步** | SQLite 按本机用户存；**不进**群组 P2P；每人各一份历史 |
| 3 | **可发到群聊并标记** | 用户主动发送；群聊气泡标「AI 助手」；可选 `#` → `task_ref` |
| 4 | **Composer 支持 `#` 任务** | 与群聊共用 `taskRefs` 解析；发给 AI 时附带脱敏任务上下文 |
| 5 | **UI 栈** | `assistant-ui` primitives + Ant Design / `--lanpm-*` 皮肤（待 A1 实现） |
| 6 | **端点探测** | 可选 · 失败则离线降级（待 A1 实现） |
| 7 | **导航落点** | **顶栏 + Dock/Drawer/全屏 Shell**；**不做**底栏第八 Tab |
| 8 | **上下文绑定** | 打开时默认当前 `groupId`；会话本地个人所有；切群时继续或新开线程 |

---

## 9. 文档与引用纪律

- 实现状态以 `CHANGELOG.md` 为准；**未完成**以 `docs/06_ROADMAP.md` 为准。
- 本文件为 **AI 接入讨论 SSOT**；立项后差异在 `plan.md`（本地）与 CHANGELOG 同步。
- 不在 rules/skills 正文堆外网 URL 作操作 SSOT；选型出处可记 `docs/MIT开源替代.md` §4.6 增量。

---

## 10. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-29 | 初稿：驾驶舱现状、第二期流式全入口、开源选型、离线门禁、架构与 Sprint 建议 |
| 2026-07-29 | 拍板：内置免费 · 会话本地不同步 · 发群标记 · `#` 引用任务（复用 `taskRefs`） |
| 2026-07-29 | SPRINT-AI-02：隐式上下文分层（系统/场景/对象）写入 §3.3.1 |
| 2026-07-29 | 拍板：顶栏+浮层/Dock，非底栏第八 Tab；上下文默认绑当前群、历史个人本地 |
