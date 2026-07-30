/**
 * Playwright dual-Electron fixture — host + joiner (worker-scoped).
 */
import { test as base, expect, type Page } from '@playwright/test'
import type { ElectronApplication } from 'playwright'
import { mkLanpmTemp, rmLanpmTemp } from '../../lanpmTemp.ts'
import { completeSetupWizard, dismissAllModals } from './setup.ts'
import {
  closeElectronApp,
  launchLanpmElectron,
  prepareLanpmPage
} from './lanpmElectron.ts'

export type DualElectronFixtures = {
  hostUserDataDir: string
  joinerUserDataDir: string
  hostApp: ElectronApplication
  joinerApp: ElectronApplication
  hostPage: Page
  joinerPage: Page
}

export const test = base.extend<DualElectronFixtures>({
  hostUserDataDir: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
    async ({}, use) => {
      const dir = mkLanpmTemp('lanpm-e2e-host-')
      await use(dir)
      rmLanpmTemp(dir)
    },
    { scope: 'worker' }
  ],
  joinerUserDataDir: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
    async ({}, use) => {
      const dir = mkLanpmTemp('lanpm-e2e-joiner-')
      await use(dir)
      rmLanpmTemp(dir)
    },
    { scope: 'worker' }
  ],
  hostApp: [
    async ({ hostUserDataDir }, use) => {
      const app = await launchLanpmElectron({
        userDataDir: hostUserDataDir,
        baseName: 'E2EHost'
      })
      try {
        await use(app)
      } finally {
        await closeElectronApp(app)
      }
    },
    { scope: 'worker' }
  ],
  joinerApp: [
    async ({ joinerUserDataDir, hostApp }, use) => {
      void hostApp
      const app = await launchLanpmElectron({
        userDataDir: joinerUserDataDir,
        baseName: 'E2EJoiner'
      })
      try {
        await use(app)
      } finally {
        await closeElectronApp(app)
      }
    },
    { scope: 'worker' }
  ],
  hostPage: [
    async ({ hostApp }, use) => {
      const page = await prepareLanpmPage(hostApp)
      await completeSetupWizard(page)
      await use(page)
    },
    { scope: 'worker' }
  ],
  joinerPage: [
    async ({ joinerApp }, use) => {
      const page = await prepareLanpmPage(joinerApp)
      await completeSetupWizard(page)
      await use(page)
    },
    { scope: 'worker' }
  ]
})

export { expect }
export { dismissAllModals }
