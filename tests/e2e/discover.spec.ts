import {
  test,
  expect,
  openDiscoverModal,
  discoverDialog,
  dismissAllModals
} from './fixtures/electronApp.ts'

test.describe.configure({ mode: 'serial' })

test.describe('discover modal E2E', () => {
  test.afterEach(async ({ appPage }) => {
    await dismissAllModals(appPage)
  })

  test('opens discover modal from top bar', async ({ appPage }) => {
    await openDiscoverModal(appPage)
    const dialog = discoverDialog(appPage)
    await expect(dialog.getByTestId('discover-share-pairing')).toBeVisible()
    await expect(dialog.getByTestId('discover-pairing-role')).toBeVisible()
    await expect(dialog.getByTestId('discover-codes-explainer')).toBeVisible()
  })

  test('share pairing code shows formatted code', async ({ appPage }) => {
    await openDiscoverModal(appPage)
    const dialog = discoverDialog(appPage)
    await dialog.getByTestId('discover-share-pairing').click()
    const code = dialog.getByTestId('discover-pairing-code-display')
    await expect(code).toBeVisible({ timeout: 15_000 })
    await expect(code).toHaveText(/\d{3}\s\d{3}/)
    await expect(dialog.getByTestId('discover-copy-pairing-info')).toBeVisible()
    await dialog.getByRole('button', { name: /停止分享|Stop sharing/i }).click()
    await expect(dialog.getByTestId('discover-share-pairing')).toBeVisible()
  })

  test('find pairing form and cross-subnet toggle', async ({ appPage }) => {
    await openDiscoverModal(appPage)
    const dialog = discoverDialog(appPage)
    await dialog.getByTestId('discover-pairing-role').getByText(/加入|Join/i).click()
    const input = dialog.getByPlaceholder('例如 847 293')
    await expect(input).toBeVisible()
    await input.fill('123456')
    await expect(input).toHaveValue('123456')

    const crossSubnet = dialog.getByRole('checkbox', { name: /跨网段|different subnet/i })
    await expect(crossSubnet).toBeVisible()
    await crossSubnet.check()
    await expect(crossSubnet).toBeChecked()
    await expect(dialog.getByTestId('discover-pairing-unicast-host')).toBeVisible()
  })

  test('network help modal opens and closes', async ({ appPage }) => {
    await openDiscoverModal(appPage)
    const dialog = discoverDialog(appPage)
    await dialog.getByTestId('discover-net-help-link').click()
    const help = appPage.getByRole('dialog', { name: /局域网组网说明|Local network/i })
    await expect(help).toBeVisible()
    await expect(help.getByText(/局域网组网说明|组网|subnet/i)).toBeVisible()
    await appPage.keyboard.press('Escape')
    await expect(help).toBeHidden()
  })
})
