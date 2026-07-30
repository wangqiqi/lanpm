import { expect, type Page } from '@playwright/test'
import { discoverDialog, openDiscoverModal } from './setup.ts'

/** 分享连接码并返回纯数字码（6 位）。 */
export async function startSharingPairingCode(page: Page): Promise<string> {
  await openDiscoverModal(page)
  const dialog = discoverDialog(page)
  await dialog.getByTestId('discover-share-pairing').click()
  const codeEl = dialog.getByTestId('discover-pairing-code-display')
  await expect(codeEl).toBeVisible({ timeout: 20_000 })
  const raw = (await codeEl.innerText()).replace(/\s+/g, '')
  expect(raw).toMatch(/^\d{6}$/)
  return raw
}

/** B 端：查找连接码并连接。 */
export async function joinWithPairingCode(page: Page, code: string): Promise<void> {
  await openDiscoverModal(page)
  const dialog = discoverDialog(page)
  await dialog.getByTestId('discover-find-pairing').click()
  const input = dialog.getByPlaceholder(/847 293|e\.g\./i)
  await expect(input).toBeVisible()
  await input.fill(code)
  await dialog.getByTestId('discover-pairing-connect').click()
}

export async function expectPairingJoinSuccess(
  page: Page,
  peerDisplayName: string
): Promise<void> {
  await expect(
    page.getByRole('button', { name: peerDisplayName, exact: true })
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: /已连接|connected/i })).toBeVisible()
}
