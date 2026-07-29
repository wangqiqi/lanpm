#!/usr/bin/env node
/**
 * Copy light-theme visual captures → README assets/.
 * Run: npm run screenshots:sync-readme
 * Source: LANPM_VISUAL_CAPTURE_DIR or .lanpm/visual-screenshots (or --from-generated)
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fromGenerated = process.argv.includes('--from-generated')

const sourceDir = fromGenerated
  ? join(root, 'docs/screenshots/generated')
  : (process.env.LANPM_VISUAL_CAPTURE_DIR ?? join(root, '.lanpm/visual-screenshots'))

const assetsDir = join(root, 'assets')

/** light_{slug}.png → assets filename (README 门面) */
const MAP = {
  'light_chat.png': 'chat.png',
  'light_board.png': 'kanban.png',
  'light_tree.png': 'task-tree.png',
  'light_gantt.png': 'gantt.png',
  'light_files.png': 'file.png',
  'light_calendar.png': 'calendar.png',
  'light_whiteboard.png': 'whiteboard.png',
  'light_cockpit.png': 'cockpit.png'
}

if (!existsSync(sourceDir)) {
  console.error(`screenshots:sync-readme: missing source dir ${sourceDir}`)
  console.error('Run: npm run screenshots:capture')
  process.exit(1)
}

mkdirSync(assetsDir, { recursive: true })

for (const [srcName, destName] of Object.entries(MAP)) {
  const src = join(sourceDir, srcName)
  if (!existsSync(src)) {
    console.error(`screenshots:sync-readme: missing ${srcName} in ${sourceDir}`)
    process.exit(1)
  }
  const dest = join(assetsDir, destName)
  copyFileSync(src, dest)
  console.log(`  ${srcName} → assets/${destName}`)
}

console.log(`screenshots:sync-readme OK (${Object.keys(MAP).length} files from ${sourceDir})`)
