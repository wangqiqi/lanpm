/** Relative session time for DM list rows (today → HH:mm, yesterday label, else date). */
export function formatSessionTime(
  iso: string,
  locale: string,
  labels: { today: string; yesterday: string }
): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayDiff = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86_400_000)

    if (dayDiff === 0) {
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    if (dayDiff === 1) return labels.yesterday
    return d.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' })
  } catch {
    return ''
  }
}
