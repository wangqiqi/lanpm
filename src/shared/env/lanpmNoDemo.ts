/**
 * 开发版 mock / 演示数据开关（见 `shouldSeedMockCatalog` · `memberService`）。
 *
 * | 设置 | 效果 |
 * |------|------|
 * | `LANPM_NO_DEMO=1` | 不注入演示群；项目/职能群成员侧栏仅群内成员 |
 * | `LANPM_NO_DEMO=0` + `LANPM_DEMO=1`（`dev:demo`） | 演示群 + 侧栏 Alice/Bob/Carol |
 * | 未设（默认 `dev`） | 同 `LANPM_NO_DEMO=1`（部署态，无 mock） |
 * | `LANPM_DEMO=1` | 强制演示（截图流水线；可覆盖 NO_DEMO） |
 *
 * 命令：`npm run dev:no-demo` · `npm run dev:demo` · `npm run dev:fresh:no-demo`（零数据+无 mock）· `dev:dual-peer` 默认 NO_DEMO=1
 */
export function isLanpmNoDemoEnv(): boolean {
  return process.env.LANPM_NO_DEMO === '1'
}
