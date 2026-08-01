import {
  test,
  expect,
  openDemoProjectView,
  clickBottomNavTab
} from './fixtures/electronApp.ts'

test.describe.configure({ mode: 'serial' })

const VIEW_SURFACES = {
  chat: 'chat-island-surface',
  board: 'board-column-island',
  tree: 'tree-island-surface'
} as const

test.describe('group view tab smoke E2E', () => {
  test('demo-project chat, board, tree islands mount', async ({ appPage }) => {
    await openDemoProjectView(appPage, 'chat')
    await expect(appPage.getByTestId(VIEW_SURFACES.chat)).toBeVisible({ timeout: 60_000 })

    await clickBottomNavTab(appPage, 'board')
    await expect(appPage.getByTestId(VIEW_SURFACES.board).first()).toBeVisible({
      timeout: 60_000
    })

    await clickBottomNavTab(appPage, 'tree')
    await expect(appPage.getByTestId(VIEW_SURFACES.tree)).toBeVisible({ timeout: 60_000 })
  })
})
