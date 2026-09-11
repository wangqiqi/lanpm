import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  builderDistDir,
  packageMainAbs,
  viteOutPreload,
  viteOutRenderer
} from '../scripts/lanpm-artifact-paths.mjs'

/** 仓库根目录（lanpm/） */
export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const electronMainJs = packageMainAbs(projectRoot)
export const electronRendererHtml = join(viteOutRenderer(projectRoot), 'index.html')
export const electronPreloadJs = join(viteOutPreload(projectRoot), 'index.js')
export const electronBuilderDistDir = builderDistDir(projectRoot)
