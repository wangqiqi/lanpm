import { normalizeLinkedFileIds } from './linkedFiles.ts'

/** Merge a file id into task.linkedFileIds (deduped). */
export function mergeLinkedFileId(
  existing: string[] | undefined,
  fileId: string
): string[] {
  return normalizeLinkedFileIds([...(existing ?? []), fileId])
}

/** Remove a file id from task.linkedFileIds (returns [] when empty). */
export function removeLinkedFileId(
  existing: string[] | undefined,
  fileId: string
): string[] {
  const target = fileId.trim()
  if (!target) return normalizeLinkedFileIds(existing ?? [])
  return normalizeLinkedFileIds((existing ?? []).filter((id) => id !== target))
}
