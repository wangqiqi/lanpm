/**
 * AUTO-03 — docs/*.md 内部相对链接目标存在。
 * Run: npm run verify:docs-links
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const docsDir = join(root, 'docs')
const LINK_RE = /\[[^\]]*\]\((\.\/[^)#]+\.md)\)/g

const broken: string[] = []

for (const name of readdirSync(docsDir).filter((f) => f.endsWith('.md'))) {
  const filePath = join(docsDir, name)
  const src = readFileSync(filePath, 'utf8')
  const base = dirname(filePath)
  LINK_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = LINK_RE.exec(src)) !== null) {
    const target = normalize(join(base, m[1]!))
    if (!existsSync(target)) broken.push(`${name} -> ${m[1]}`)
  }
}

assert.ok(broken.length === 0, `broken doc links:\n${broken.join('\n')}`)
console.log(`verify:docs-links OK (${readdirSync(docsDir).length} docs scanned)`)
