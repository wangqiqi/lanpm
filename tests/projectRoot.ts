import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 仓库根目录（lanpm/） */
export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
