import {
  test,
  expect,
  openCollaborationDrawer,
  waitForCollabPanelReady
} from './fixtures/electronApp.ts'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

test.describe('chat collaboration drawer smoke E2E', () => {
  test('files, whiteboard, mindmap panels mount in drawer', async ({ appPage }) => {
    await openCollaborationDrawer(appPage, 'files')
    await waitForCollabPanelReady(appPage, 'files')
    await expect(appPage.locator('.ant-drawer-open').getByTestId('files-island-surface')).toBeVisible({
      timeout: 60_000
    })

    await openCollaborationDrawer(appPage, 'whiteboard')
    await waitForCollabPanelReady(appPage, 'whiteboard')

    await openCollaborationDrawer(appPage, 'mindmap')
    await waitForCollabPanelReady(appPage, 'mindmap')
  })

  test('composer collab buttons open drawer', async ({ appPage }) => {
    await openCollaborationDrawer(appPage, 'files')
    await appPage.locator('.ant-drawer-open .ant-drawer-close').click()
    await expect(appPage.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 15_000 })

    await appPage.getByTestId('collab-open-files').click()
    await waitForCollabPanelReady(appPage, 'files')
  })
})
