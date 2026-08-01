import { test, expect, openDemoProjectView } from './fixtures/electronApp.ts'

test.describe.configure({ mode: 'serial' })

test.describe('extended view tab smoke E2E', () => {
  test('demo-project gantt and calendar islands mount via deep link', async ({ appPage }) => {
    await openDemoProjectView(appPage, 'gantt')
    await expect(appPage.getByTestId('gantt-island-surface')).toBeVisible({ timeout: 60_000 })

    await openDemoProjectView(appPage, 'calendar')
    await expect(appPage.getByTestId('calendar-island-surface')).toBeVisible({
      timeout: 60_000
    })
  })
})
