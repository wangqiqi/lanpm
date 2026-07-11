import type { ProjectDashboardItem, ProjectHealth } from './types'

const HEALTH_RANK: Record<ProjectHealth, number> = {
  delayed: 0,
  risk: 1,
  normal: 2
}

/** 领导视图：延期 → 风险 → 正常；同档进度升序（落后在前） */
export function sortCockpitProjects(
  projects: ProjectDashboardItem[]
): ProjectDashboardItem[] {
  return [...projects].sort((a, b) => {
    const byHealth = HEALTH_RANK[a.status] - HEALTH_RANK[b.status]
    if (byHealth !== 0) return byHealth
    return a.progressPercent - b.progressPercent
  })
}

export function countRiskProjects(projects: ProjectDashboardItem[]): number {
  return projects.filter((p) => p.status === 'risk').length
}
