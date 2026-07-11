import { normalizeLinkedFileIds } from './linkedFiles.ts'

/** Merge a file id into task.linkedFileIds (deduped). */
export function mergeLinkedFileId(
  existing: string[] | undefined,
  fileId: string
): string[] {
  return normalizeLinkedFileIds([...(existing ?? []), fileId])
}
