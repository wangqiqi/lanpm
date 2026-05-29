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

**命令**：`npm run test` · `npm run test:watch` · `npm run test:coverage` · `npm run test:unit`

### 集成脚本 `scripts/verify-*.ts`

| 脚本 | 说明 | 状态 |
|------|------|------|
| `verify:shared` | 纯 shared 冒烟串联（suffix / preview / format / offline / manual / mentions / routes） | ✅ |
| `verify:preview-extensions` | 预览扩展名冒烟 | ✅ |
| `verify:format-file-type` | 文件类型展示标签冒烟 | ✅ |
| `verify:m7` | 全量回归（含 `npm run test`） | ✅ |
| `verify:project` | 项目健康（lint + test + search） | ✅ |
| `verify:task-sync` / `verify:file-sync` | P2P 同步双 Stub | ✅ |
| `verify:m2-integration` | 聊天 + 已读 + 任务闭环 | ✅ |

详见 `docs/10_测试体系说明.md`。

### 待补（可选增强）

- [ ] `task/ganttAdapter.test.ts` — 甘特日期与依赖条转换
- [ ] `cockpit/aiProviders.test.ts` — AI 预设与默认 provider
- [ ] `presence/display.test.ts` — 在线态 emoji/label
- [ ] `verify:shared` 纳入 `verify:project` 或 CI 预检
- [ ] Vitest 覆盖率阈值门禁（`coverage` 百分比下限）
