import { expect, type Page } from '@playwright/test'
import { discoverDialog, openDiscoverModal } from './setup.ts'

const IPV4_RE = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/

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

export type HostShareEndpoint = {
  ip?: string
  tail?: string
}

/** 从 Host 分享屏读取本机 IP / 尾段（需已处于 share 模式）。 */
export async function readHostShareEndpoint(page: Page): Promise<HostShareEndpoint> {
  const dialog = discoverDialog(page)
  const meta = dialog.getByTestId('discover-pairing-share-meta')
  await expect(meta).toBeVisible({ timeout: 10_000 })
  const text = await meta.innerText()
  const ipMatch = text.match(IPV4_RE)
  const tailMatch = text.match(/尾码\s*(\d{1,3})|tail\s*(\d{1,3})/i)
  return {
    ip: ipMatch?.[1],
    tail: tailMatch?.[1] ?? tailMatch?.[2]
  }
}

export type CrossSubnetJoinOptions = {
  /** 高级区 host / 尾段；省略则仅勾选跨网段 + 码（路由引导 lookup） */
  unicastHost?: string
}

async function selectJoinRole(dialog: ReturnType<typeof discoverDialog>): Promise<void> {
  const role = dialog.getByTestId('discover-pairing-role')
  await role.getByText(/加入|Join/i).click()
  await expect(dialog.getByTestId('discover-pairing-code-input')).toBeVisible()
}

async function fillFindPairingCode(dialog: ReturnType<typeof discoverDialog>, code: string): Promise<void> {
  const input = dialog.getByTestId('discover-pairing-code-input')
  await expect(input).toBeVisible()
  await input.fill(code)
}

async function expandAdvancedHost(dialog: ReturnType<typeof discoverDialog>): Promise<void> {
  const crossSubnet = dialog.getByTestId('discover-pairing-cross-subnet')
  if (!(await crossSubnet.isChecked())) {
    await crossSubnet.check()
  }
  await expect(dialog.getByTestId('discover-pairing-unicast-host')).toBeVisible()
}

/** B 端：查找连接码并连接（同子网，不勾选跨网段）。 */
export async function joinWithPairingCode(page: Page, code: string): Promise<void> {
  await openDiscoverModal(page)
  const dialog = discoverDialog(page)
  await selectJoinRole(dialog)
  await fillFindPairingCode(dialog, code)
  await dialog.getByTestId('discover-pairing-connect').click()
}

/** B 端：跨网段加入（勾选 crossSubnet，可选高级 host/尾段）。 */
export async function joinWithPairingCodeCrossSubnet(
  page: Page,
  code: string,
  options: CrossSubnetJoinOptions = {}
): Promise<void> {
  await openDiscoverModal(page)
  const dialog = discoverDialog(page)
  await selectJoinRole(dialog)
  const crossSubnet = dialog.getByTestId('discover-pairing-cross-subnet')
  await crossSubnet.check()
  await expect(crossSubnet).toBeChecked()

  if (options.unicastHost) {
    await expandAdvancedHost(dialog)
    await dialog.getByTestId('discover-pairing-unicast-host').fill(options.unicastHost)
  }

  await fillFindPairingCode(dialog, code)
  await dialog.getByTestId('discover-pairing-connect').click()
}

export async function expectPairingJoinSuccess(
  page: Page,
  peerDisplayName: string
): Promise<void> {
  const escaped = peerDisplayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await expect(
    page.getByText(new RegExp(`已连接\\s*${escaped}|Connected to\\s*${escaped}`, 'i'))
  ).toBeVisible({ timeout: 30_000 })
}
