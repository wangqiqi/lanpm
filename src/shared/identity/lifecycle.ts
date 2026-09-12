/**
 * 本机身份生命周期 SSOT（与主进程 `setup.ts` · `profilePaths.ts` 对齐）。
 *
 * | 操作 | 用户可见 | 数据 | userId | active_profile |
 * |------|----------|------|--------|----------------|
 * | **reuse_only**（注销） | 回到 Setup | 留在原 `profiles/<id>/lanpm.db` | 不变（库内用户行保留） | 清除 |
 * | **reactivate**（继续原身份） | 进入主界面 | 同库 | **同 userId** | 写回 |
 * | **new_user**（新建身份） | Setup 填表后新用户 | 新 `profiles/<newId>/` 空库 | **新 userId** | 绑定新 id |
 * | **wipe**（`userdata:wipe` / `dev:fresh --wipe`） | 等同首次安装 | 删除 userData 树 | — | — |
 *
 * 注销后根目录可存在 `identity_rebind_hint.json`（userId + deviceId），供 Setup 展示「继续原身份」。
 * `dev:fresh --wipe` ≠ 注销：前者清空目录，后者仅解除本机绑定。
 */
export type IdentityLifecycleAction = 'reuse_only' | 'reactivate' | 'new_user' | 'wipe'

export type SetupIntent = 'reactivate' | 'new_user'
