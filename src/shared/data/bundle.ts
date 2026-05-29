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

export interface GroupBundleImportResult {
  messagesImported: number
  tasksImported: number
  filesImported: number
  skipped: number
}
