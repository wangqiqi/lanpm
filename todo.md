# LanPM Todo

## 手验（非自动化）

- [ ] 三平台冒烟（Win / macOS / Linux）
- [ ] 性能手测填表（冷启动 / 内存 / Tab P95）
- [ ] 局域网双机真网联调
- [ ] 发布 1.0.0
- [ ] V-14b 亮/暗手验截图
- [ ] I18N-05 英文 UI 全页走查

---

## 测试体系（自动化）

### 单元测试 `tests/unit/` · `npm run test`

| 域 | 文件 | shared 模块 | 状态 |
|----|------|-------------|------|
| chat | `mentions.test.ts` | `@shared/chat/mentions` | ✅ |
| chat | `taskCommand.test.ts` | `@shared/chat/taskCommand` | ✅ |
| chat | `offlineSync.test.ts` | `@shared/chat/offlineSync` | ✅ |
| chat | `dmSession.test.ts` | `@shared/chat/dmSession` | ✅ |
| chat | `detectLanguage.test.ts` | `@shared/chat/detectLanguage` | ✅ |
| chat | `readReceipt.test.ts` | `@shared/chat/readReceipt` | ✅ |
| navigation | `tabRules.test.ts` | `@shared/navigation/tabRules` | ✅ |
| file | `previewExtensions.test.ts` | `@shared/file/previewExtensions` | ✅ |
| file | `sync.test.ts` | `@shared/file/sync` | ✅ |
| file | `bookmarks.test.ts` | `@shared/file/bookmarks` | ✅ |
| file | `formatFileType.test.ts` | `@shared/file/formatFileType` | ✅ |
| file | `inferCategory.test.ts` | `@shared/file/types` | ✅ |
| task | `progress.test.ts` | `@shared/task/progress` | ✅ |
| task | `validation.test.ts` | `@shared/task/validation` | ✅ |
| task | `kanban.test.ts` | `@shared/task/kanban` | ✅ |
| presence | `aggregate.test.ts` | `@shared/presence/aggregate` | ✅ |
| group | `guards.test.ts` | `@shared/group/guards` | ✅ |
| network | `manualPeer.test.ts` | `@shared/network/manualPeer` | ✅ |
| identity | `idGen.test.ts` | `@shared/identity/idGen` | ✅ |
| task | `ganttAdapter.test.ts` | `@shared/task/ganttAdapter` | ✅ |
| cockpit | `aiProviders.test.ts` | `@shared/cockpit/aiProviders` | ✅ |
| presence | `display.test.ts` | `@shared/presence/display` | ✅ |

**命令**：`npm run test` · `npm run test:watch` · `npm run test:coverage` · `npm run test:unit`

### 集成 / 静态 / 编排 `tests/`

| 目录 | 说明 | 示例 |
|------|------|------|
| `tests/static/` | 无 DB 冒烟、静态守卫 | `verify-visual.ts` · `verify-routes.ts` · `verify-m3.ts` |
| `tests/integration/` | Stub + SQLite / 网络 | `verify-chat.ts` · `verify-task-sync.ts` |
| `tests/runners/` | 多步编排 | `verify-m7.ts` · `verify-shared.ts` · `verify-project.ts` |

| 脚本 | 说明 | 状态 |
|------|------|------|
| `verify:shared` | 纯 shared 冒烟串联 | ✅ |
| `verify:m7` | 全量回归（含 `npm run test`） | ✅ |
| `verify:project` | 项目健康（lint + test + shared + search） | ✅ |
| `verify:task-sync` / `verify:file-sync` | P2P 同步双 Stub | ✅ |
| `verify:m2-integration` | 聊天 + 已读 + 任务闭环 | ✅ |

`scripts/` 仅保留构建/Native 工具（`ensure-native-deps` · `run-electron-node` · `build-icons`）。

详见 `docs/05_测试与联调发布.md` §1。

### 待补（可选增强）

- [ ] Vitest 覆盖率阈值门禁（`coverage` 百分比下限）
