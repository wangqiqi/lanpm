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

/** Per-entity totals / conflict hits (TASK-310–312). */
export interface GroupBundleEntityCounts {
  messages: number
  tasks: number
  files: number
  tags: number
  members: number
  checklists: number
  taskCrdt: number
  whiteboardCrdt: number
  whiteboardScene: number
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
  tagsImported: number
  membersImported: number
  checklistsImported: number
  taskCrdtImported: number
  whiteboardCrdtImported: number
  whiteboardSceneImported: number
  skipped: number
  overwritten: number
}

/** One task checklist + items in a bundle (TASK-311). */
export interface BundleChecklistPayload {
  checklist: import('../task/checklist').TaskChecklist
  items: import('../task/checklist').ChecklistItem[]
}

/** Base64 CRDT snapshot in JSON bundle (TASK-312). */
export interface BundleCrdtSnapshot {
  docId: string
  updateBlobB64: string
  updatedAt: string
}
