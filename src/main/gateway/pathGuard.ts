import path from 'node:path'

export class PathForbiddenError extends Error {
  constructor(message = 'PATH_FORBIDDEN') {
    super(message)
    this.name = 'PathForbiddenError'
  }
}

/** Resolve `rel` under `root`; reject traversal outside root. */
export function resolveSafePath(root: string, rel: string): string {
  const rootResolved = path.resolve(root)
  const trimmed = rel.replace(/^\/+/, '')
  const normalized = path.normalize(trimmed)
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new PathForbiddenError()
  }
  const full = path.resolve(rootResolved, normalized)
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) {
    throw new PathForbiddenError()
  }
  return full
}
