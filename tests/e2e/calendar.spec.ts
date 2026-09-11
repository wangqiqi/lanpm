import {
  test,
  expect,
  dismissAllModals,
  openDemoProjectCalendarWithEvents
} from './fixtures/electronApp.ts'

test.describe.configure({ mode: 'serial' })

test.describe('calendar E2E', () => {
  test.afterEach(async ({ appPage }) => {
    await dismissAllModals(appPage)
  })

  test('demo-project calendar shows mock scheduled events', async ({ appPage }) => {
    await openDemoProjectCalendarWithEvents(appPage)
    await expect(
      appPage.getByTestId('calendar-island-surface').getByText('M1 · 协作体验').first()
    ).toBeVisible()
  })

  test('click event opens task edit modal', async ({ appPage }) => {
    await openDemoProjectCalendarWithEvents(appPage)
    const surface = appPage.getByTestId('calendar-island-surface')
    await surface.locator('.fc-event').first().click({ timeout: 60_000 })
    const dialog = appPage.getByRole('dialog', { name: /编辑任务|Edit task/i })
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await expect(dialog.getByRole('textbox').first()).not.toHaveValue('')
  })

  test('drag event to another day saves schedule', async ({ appPage }) => {
    await openDemoProjectCalendarWithEvents(appPage)
    const surface = appPage.getByTestId('calendar-island-surface')
    const event = surface.locator('.fc-event').first()
    await expect(event).toBeVisible()

    const targetDay = surface.locator('.fc-daygrid-day:not(.fc-day-other)').nth(18)
    await expect(targetDay).toBeVisible()
    await event.dragTo(targetDay, { force: true })

    await expect(appPage.getByText(/日历排期已保存|Calendar schedule saved/i)).toBeVisible({
      timeout: 15_000
    })
  })
})
