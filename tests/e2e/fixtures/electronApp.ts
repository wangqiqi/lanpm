/**
 * Playwright Electron fixture — isolated userData + real network (worker-scoped).
 */
import { test as base, expect, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import { mkLanpmTemp, rmLanpmTemp } from '../../lanpmTemp.ts'
import { completeSetupWizard, openDiscoverModal, discoverDialog, dismissAllModals } from './setup.ts'
import { closeElectronApp, launchLanpmElectron, prepareLanpmPage } from './lanpmElectron.ts'

export type ElectronFixtures = {
  userDataDir: string
  electronApp: ElectronApplication
  appPage: Page
}

export const test = base.extend<ElectronFixtures>({
  userDataDir: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
    async ({}, use) => {
      const dir = mkLanpmTemp('lanpm-e2e-')
      await use(dir)
      rmLanpmTemp(dir)
    },
    { scope: 'worker' }
  ],
  electronApp: [
    async ({ userDataDir }, use) => {
      let app: ElectronApplication | null = null
      let lastErr: unknown
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          app = await launchLanpmElectron({ userDataDir, baseName: 'E2ETest' })
          break
        } catch (err) {
          lastErr = err
        }
      }
      if (!app) throw lastErr ?? new Error('electron launch failed')

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

export { expect }
export { completeSetupWizard, openDiscoverModal, discoverDialog, dismissAllModals }
