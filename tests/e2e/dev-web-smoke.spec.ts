import {
  test,
  expect,
  completeSetupWizard,
  openDemoProjectView,
  dismissAllModals
} from './fixtures/browserDevWeb.ts'

test.describe.configure({ mode: 'serial' })

test.describe('dev:web browser stub smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await completeSetupWizard(page)
  })

  test.afterEach(async ({ page }) => {
    await dismissAllModals(page)
  })

  test('shell loads with discover entry in top bar', async ({ page }) => {
    await expect(page.getByTestId('topbar-discover')).toBeVisible()
  })

  test('demo-project chat island mounts under stub', async ({ page }) => {
    await openDemoProjectView(page, 'chat')
    await expect(page.getByTestId('chat-island-surface')).toBeVisible({ timeout: 60_000 })
  })
})
