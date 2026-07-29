import type { Database } from 'better-sqlite3'
import type {
  AiPipelinePresetId,
  AiPipelineRun,
  AiPipelineRunStatus,
  AiPipelineRunSummary,
  AiPipelineStepResult
} from '../../shared/ai/pipelineTypes.ts'

const PIPELINE_RETENTION = 20

interface PipelineRunRow {
  run_id: string
  user_id: string
  group_id: string
  preset_id: string
  status: string
  started_at: string
  finished_at: string | null
  steps_json: string
  final_markdown: string | null
  used_external_ai: number
  degraded: number
}

function parseSteps(json: string): AiPipelineStepResult[] {
  try {
    const parsed = JSON.parse(json) as AiPipelineStepResult[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function rowToRun(row: PipelineRunRow): AiPipelineRun {
  return {
    runId: row.run_id,
    userId: row.user_id,
    groupId: row.group_id,
    presetId: row.preset_id as AiPipelinePresetId,
    status: row.status as AiPipelineRunStatus,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    steps: parseSteps(row.steps_json),
    finalMarkdown: row.final_markdown,
    usedExternalAi: row.used_external_ai === 1,
    degraded: row.degraded === 1
  }
}

function rowToSummary(row: PipelineRunRow): AiPipelineRunSummary {
  return {
    runId: row.run_id,
    presetId: row.preset_id as AiPipelinePresetId,
    groupId: row.group_id,
    status: row.status as AiPipelineRunStatus,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    usedExternalAi: row.used_external_ai === 1,
    degraded: row.degraded === 1
  }
}

export function insertPipelineRun(db: Database, run: AiPipelineRun): void {
  db.prepare(
    `INSERT INTO ai_pipeline_runs (
      run_id, user_id, group_id, preset_id, status, started_at, finished_at,
      steps_json, final_markdown, used_external_ai, degraded
    ) VALUES (
      @runId, @userId, @groupId, @presetId, @status, @startedAt, @finishedAt,
      @stepsJson, @finalMarkdown, @usedExternalAi, @degraded
    )`
  ).run({
    runId: run.runId,
    userId: run.userId,
    groupId: run.groupId,
    presetId: run.presetId,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    stepsJson: JSON.stringify(run.steps),
    finalMarkdown: run.finalMarkdown,
    usedExternalAi: run.usedExternalAi ? 1 : 0,
    degraded: run.degraded ? 1 : 0
  })

  const stale = db
    .prepare(
      `SELECT run_id FROM ai_pipeline_runs
       WHERE user_id = @userId
       ORDER BY started_at DESC LIMIT -1 OFFSET @keep`
    )
    .all({ userId: run.userId, keep: PIPELINE_RETENTION }) as { run_id: string }[]
  for (const row of stale) {
    db.prepare(`DELETE FROM ai_pipeline_runs WHERE run_id = @runId`).run({ runId: row.run_id })
  }
}

export function updatePipelineRun(db: Database, run: AiPipelineRun): void {
  db.prepare(
    `UPDATE ai_pipeline_runs SET
      status = @status,
      finished_at = @finishedAt,
      steps_json = @stepsJson,
      final_markdown = @finalMarkdown,
      used_external_ai = @usedExternalAi,
      degraded = @degraded
     WHERE run_id = @runId`
  ).run({
    runId: run.runId,
    status: run.status,
    finishedAt: run.finishedAt,
    stepsJson: JSON.stringify(run.steps),
    finalMarkdown: run.finalMarkdown,
    usedExternalAi: run.usedExternalAi ? 1 : 0,
    degraded: run.degraded ? 1 : 0
  })
}

export function getPipelineRun(db: Database, userId: string, runId: string): AiPipelineRun | null {
  const row = db
    .prepare(`SELECT * FROM ai_pipeline_runs WHERE run_id = @runId AND user_id = @userId`)
    .get({ runId, userId }) as PipelineRunRow | undefined
  return row ? rowToRun(row) : null
}

export function listPipelineRuns(
  db: Database,
  userId: string,
  limit = 10
): AiPipelineRunSummary[] {
  const rows = db
    .prepare(
      `SELECT * FROM ai_pipeline_runs
       WHERE user_id = @userId
       ORDER BY started_at DESC LIMIT @limit`
    )
    .all({ userId, limit }) as PipelineRunRow[]
  return rows.map(rowToSummary)
}

export function getLatestPipelineRun(
  db: Database,
  userId: string,
  groupId?: string
): AiPipelineRun | null {
  const row = groupId
    ? (db
        .prepare(
          `SELECT * FROM ai_pipeline_runs
           WHERE user_id = @userId AND group_id = @groupId
           ORDER BY started_at DESC LIMIT 1`
        )
        .get({ userId, groupId }) as PipelineRunRow | undefined)
    : (db
        .prepare(
          `SELECT * FROM ai_pipeline_runs
           WHERE user_id = @userId
           ORDER BY started_at DESC LIMIT 1`
        )
        .get({ userId }) as PipelineRunRow | undefined)
  return row ? rowToRun(row) : null
}
