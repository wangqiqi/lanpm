import { expect, type Page } from '@playwright/test'

/** 等待主界面就绪（E2E 启动时主进程已 `completeSetup` 预置身份）。 */
export async function completeSetupWizard(page: Page): Promise<void> {
  await page.waitForLoadState('load', { timeout: 90_000 })

  const ready = page.locator(
    '[data-testid="topbar-discover"], [data-testid="setup-net-skip"], button:has-text("跳过")'
  )
  await expect(ready.first()).toBeVisible({ timeout: 120_000 })

  const setupSkip = page.getByTestId('setup-net-skip').or(page.getByRole('button', { name: '跳过' }))
  if (await setupSkip.isVisible().catch(() => false)) {
    await setupSkip.click()
    const nameInput = page.getByPlaceholder('必填')
    await nameInput.fill('E2ETest')
    await page.getByRole('button', { name: /继\s*续/ }).click()
  }

  const discover =
    page.getByTestId('topbar-discover').or(page.getByRole('button', { name: '发现' }))
  await expect(discover).toBeVisible({ timeout: 120_000 })
}

export function discoverDialog(page: Page) {
  return page.getByRole('dialog', { name: '发现' })
}

/** 关闭可能残留的 Ant Design Modal（取消 / 关闭按钮 / Escape）。 */
export async function dismissAllModals(page: Page): Promise<void> {
  for (let round = 0; round < 6; round++) {
    const dialog = page.getByRole('dialog').first()
    if (!(await dialog.isVisible().catch(() => false))) return

    const actionBtn = dialog.getByRole('button', {
      name: /取消|停止分享|Stop sharing/i
    })
    if (await actionBtn.isVisible().catch(() => false)) {
      await actionBtn.click()
      await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
      continue
    }

    const cancel = dialog.getByRole('button', { name: '取消' })
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click()
      await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
      continue
    }

    const closeBtn = page.locator('.ant-modal-wrap:visible .ant-modal-close').last()
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true })
      await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
      continue
    }

    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {})
  }
}

async function resetDiscoverPairingPanel(page: Page): Promise<void> {
  const dialog = discoverDialog(page)
  const actionBtn = dialog.getByRole('button', {
    name: /取消|停止分享|Stop sharing/i
  })
  if (await actionBtn.isVisible().catch(() => false)) {
    await actionBtn.click()
  }
}

export const DEMO_PROJECT_GROUP_ID = 'demo-project'

export type E2eTabView = 'chat' | 'board' | 'tree'

/** 直达示例项目群某底栏 Tab（依赖 E2E 启动时 `ensureSeedGroups` 注入 demo-project）。 */
export async function openDemoProjectView(page: Page, view: E2eTabView): Promise<void> {
  const hash = `#/g/${DEMO_PROJECT_GROUP_ID}/${view}`
  await page.evaluate((h) => {
    window.location.hash = h
  }, hash)
  await expect(page.getByTestId(`nav-tab-${view}`)).toHaveAttribute('aria-current', 'page', {
    timeout: 60_000
  })
}

export async function clickBottomNavTab(page: Page, view: E2eTabView): Promise<void> {
  await page.getByTestId(`nav-tab-${view}`).click()
  await expect(page.getByTestId(`nav-tab-${view}`)).toHaveAttribute('aria-current', 'page', {
    timeout: 30_000
  })
}

export async function openDiscoverModal(page: Page): Promise<void> {
  const dialog = discoverDialog(page)
  if (await dialog.isVisible().catch(() => false)) {
    await resetDiscoverPairingPanel(page)
    return
  }

  await dismissAllModals(page)
  const discover =
    page.getByTestId('topbar-discover').or(page.getByRole('button', { name: '发现' }))
  await discover.click()
  await expect(dialog).toBeVisible()
  await resetDiscoverPairingPanel(page)
}
