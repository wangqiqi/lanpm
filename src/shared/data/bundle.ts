export type BundleConflictMode = 'skip' | 'new_id' | 'overwrite'

export interface GroupBundleExportOptions {
  groupId: string
  password: string
  includeFileBodies?: boolean
  outputPath: string
}

export interface GroupBundleImportOptions {
  password: string
  inputPath: string
  conflictMode: BundleConflictMode
}

/** Per-entity totals / conflict hits for messages · tasks · files (TASK-310). */
export interface GroupBundleEntityCounts {
  messages: number
  tasks: number
  files: number
}

/** Dry-run preview before import (TASK-310). */
export interface GroupBundlePreviewResult {
  groupId: string
  exportedAt: string
  totals: GroupBundleEntityCounts
  /** Rows whose id already exists in local DB. */
  conflicts: GroupBundleEntityCounts
}

export interface GroupBundleImportResult {
  messagesImported: number
  tasksImported: number
  filesImported: number
  skipped: number
  overwritten: number
}
