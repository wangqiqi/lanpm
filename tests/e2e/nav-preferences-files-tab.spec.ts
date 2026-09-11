import { test as base, expect, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import { seedFilesVisibleInBottomNav } from './fixtures/navPrefsSeed.ts'
import { closeElectronApp, launchLanpmElectron, prepareLanpmPage } from './fixtures/lanpmElectron.ts'
import { completeSetupWizard, DEMO_PROJECT_GROUP_ID } from './fixtures/setup.ts'

const test = base.extend<{ userDataDir: string; electronApp: ElectronApplication; appPage: Page }>({
  userDataDir: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
    async ({}, use) => {
      const dir = mkLanpmTemp('lanpm-e2e-nav-')
      seedFilesVisibleInBottomNav(dir)
      await use(dir)
      rmLanpmTemp(dir)
    },
    { scope: 'worker' }
  ],
  electronApp: [
    async ({ userDataDir }, use) => {
      const app = await launchLanpmElectron({ userDataDir, baseName: 'E2ENav' })
      try {
        await use(app)
      } finally {
        await closeElectronApp(app)
      }
    },
    { scope: 'worker' }
  ],
  appPage: [
    async ({ electronApp }, use) => {
      const page = await prepareLanpmPage(electronApp)
      await completeSetupWizard(page)
      await use(page)
    },
    { scope: 'worker' }
  ]
})

test.describe.configure({ mode: 'serial', timeout: 180_000 })

test.describe('nav preferences — files in bottom bar', () => {
  test('demo-project files island mounts via bottom nav tab', async ({ appPage }) => {
    await appPage.evaluate((groupId) => {
      window.location.hash = `#/g/${groupId}/chat`
    }, DEMO_PROJECT_GROUP_ID)

    const filesTab = appPage.getByTestId('nav-tab-files')
    await expect(filesTab).toBeVisible({ timeout: 60_000 })
    await filesTab.click()
    await expect(filesTab).toHaveAttribute('aria-current', 'page', { timeout: 30_000 })
    await expect(appPage.getByTestId('files-island-surface')).toBeVisible({ timeout: 60_000 })
  })
})
