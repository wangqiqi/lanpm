/** Sentinel for assignees without department; localize in renderer. */
export const COCKPIT_UNASSIGNED_DEPT = '__cockpit_unassigned__'

export function formatDeptForReport(department: string): string {
  return department === COCKPIT_UNASSIGNED_DEPT ? '未分配' : department
}
