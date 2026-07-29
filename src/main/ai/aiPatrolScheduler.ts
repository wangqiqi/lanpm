import type { Database } from 'better-sqlite3'
import type { AiPatrolReport, AiPatrolRunSummary } from '../../shared/ai/patrolTypes.ts'
import { runAiPatrol } from './aiPatrolService.ts'
import { getAiConfig } from './aiConfigService.ts'
import { showDesktopNotification } from '../desktopNotification.ts'

const PATROL_RETENTION = 20
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000
const DEFAULT_INTERVAL_HOURS = 24

let patrolTimer: ReturnType<typeof setInterval> | null = null
let firstRunTimer: ReturnType<typeof setTimeout> | null = null
let dbRef: Database | null = null
let running = false

interface PatrolRunRow {
  run_id: string
  started_at: string
  finished_at: string
  finding_count: number
  summary: string
  used_external_ai: number
  findings_json: string
}

function rowToSummary(row: PatrolRunRow): AiPatrolRunSummary {
  return {
    runId: row.run_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    findingCount: row.finding_count,
    summary: row.summary,
    usedExternalAi: row.used_external_ai === 1
  }
}

export function insertPatrolRun(db: Database, report: AiPatrolReport): void {
  db.prepare(
    `INSERT INTO ai_patrol_runs (
      run_id, started_at, finished_at, finding_count, summary, used_external_ai, findings_json
    ) VALUES (
      @runId, @startedAt, @finishedAt, @findingCount, @summary, @usedExternalAi, @findingsJson
    )`
  ).run({
    runId: report.runId,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    findingCount: report.findings.length,
    summary: report.summary.slice(0, 2000),
    usedExternalAi: report.usedExternalAi ? 1 : 0,
    findingsJson: JSON.stringify(report.findings)
  })

  const stale = db
    .prepare(
      `SELECT run_id FROM ai_patrol_runs ORDER BY started_at DESC LIMIT -1 OFFSET @keep`
    )
    .all({ keep: PATROL_RETENTION }) as { run_id: string }[]
  for (const row of stale) {
    db.prepare(`DELETE FROM ai_patrol_runs WHERE run_id = @runId`).run({ runId: row.run_id })
  }
}

export function listPatrolRuns(db: Database, limit = 10): AiPatrolRunSummary[] {
  const rows = db
    .prepare(
      `SELECT run_id, started_at, finished_at, finding_count, summary, used_external_ai
       FROM ai_patrol_runs ORDER BY started_at DESC LIMIT @limit`
    )
    .all({ limit }) as PatrolRunRow[]
  return rows.map(rowToSummary)
}

export function getLatestPatrolRun(db: Database): AiPatrolReport | null {
  const row = db
    .prepare(`SELECT * FROM ai_patrol_runs ORDER BY started_at DESC LIMIT 1`)
    .get() as PatrolRunRow | undefined
  if (!row) return null
  let findings: AiPatrolReport['findings'] = []
  try {
    findings = JSON.parse(row.findings_json) as AiPatrolReport['findings']
  } catch {
    findings = []
  }
  return {
    runId: row.run_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    findings,
    summary: row.summary,
    usedExternalAi: row.used_external_ai === 1
  }
}

async function executePatrol(): Promise<void> {
  if (!dbRef || running) return
  const config = getAiConfig(dbRef)
  if (!config?.patrolEnabled) return

  running = true
  try {
    const report = await runAiPatrol(dbRef)
    insertPatrolRun(dbRef, report)
    if (report.findings.length > 0) {
      showDesktopNotification(
        'LanPM 任务巡检',
        report.summary.slice(0, 200)
      )
    }
  } catch (err) {
    console.error('[ai-patrol] run failed:', err)
  } finally {
    running = false
  }
}

function scheduleInterval(db: Database): void {
  if (patrolTimer) {
    clearInterval(patrolTimer)
    patrolTimer = null
  }
  const config = getAiConfig(db)
  const hours = config?.patrolIntervalHours ?? DEFAULT_INTERVAL_HOURS
  const ms = Math.max(1, hours) * 60 * 60 * 1000
  patrolTimer = setInterval(() => {
    void executePatrol()
  }, ms)
}

export function initAiPatrolScheduler(db: Database): void {
  dbRef = db
  if (firstRunTimer) {
    clearTimeout(firstRunTimer)
    firstRunTimer = null
  }
  scheduleInterval(db)
  firstRunTimer = setTimeout(() => {
    void executePatrol()
    firstRunTimer = null
  }, FIRST_RUN_DELAY_MS)
}

export function refreshAiPatrolScheduler(db: Database): void {
  dbRef = db
  scheduleInterval(db)
}

export function shutdownAiPatrolScheduler(): void {
  if (patrolTimer) {
    clearInterval(patrolTimer)
    patrolTimer = null
  }
  if (firstRunTimer) {
    clearTimeout(firstRunTimer)
    firstRunTimer = null
  }
  dbRef = null
}

/** Manual trigger for tests / future UI */
export async function triggerPatrolNow(db: Database): Promise<AiPatrolReport> {
  const report = await runAiPatrol(db)
  insertPatrolRun(db, report)
  if (report.findings.length > 0) {
    showDesktopNotification('LanPM 任务巡检', report.summary.slice(0, 200))
  }
  return report
}
