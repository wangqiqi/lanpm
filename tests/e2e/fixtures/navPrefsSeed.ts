import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NavPreferencesDocument } from '../../../src/shared/navigation/navPreferences.ts'

/** 写入 E2E 隔离 userData，须在 `launchLanpmElectron` 之前调用。 */
export function writeE2eNavPreferencesDocument(
  userDataDir: string,
  doc: NavPreferencesDocument
): void {
  mkdirSync(userDataDir, { recursive: true })
  writeFileSync(join(userDataDir, 'nav-preferences.json'), JSON.stringify(doc, null, 2), 'utf8')
}

/** 在底栏显示「文件」Tab（白板仍仅抽屉/深链，见 NEVER_BOTTOM_NAV_VIEWS）。 */
export function seedFilesVisibleInBottomNav(userDataDir: string): void {
  writeE2eNavPreferencesDocument(userDataDir, {
    global: {
      hiddenViews: ['gantt', 'calendar', 'whiteboard'],
      order: ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files'],
      hiddenContributedRoutes: ['mindmap'],
      contributedOrder: []
    },
    byGroup: {}
  })
}
