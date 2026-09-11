/**
 * Playwright Chromium × `npm run dev:web`（`browserLanpmStub` · `LANPM_BROWSER_DEV=1`）。
 * 配置：`playwright.dev-web.config.ts`（webServer + `LANPM_E2E_DEV_WEB=1` 固定 5173）。
 * 手开预览且端口避让时见 `docs/05` §1.2.8（`.lanpm/dev.url`）；自动化不依赖 Electron 主进程。
 */
import { test as base, expect } from '@playwright/test'
import {
  completeSetupWizard,
  openDemoProjectView,
  dismissAllModals
} from './setup.ts'

export const test = base

export { expect, completeSetupWizard, openDemoProjectView, dismissAllModals }
