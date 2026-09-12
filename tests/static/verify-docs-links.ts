/**
 * AUTO-03 — docs/*.md 内部相对链接目标存在；website 公开页不得链仓库 `docs/`。
 * Run: npm run verify:docs-links
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const docsDir = join(root, 'docs')
const LINK_RE = /\[[^\]]*\]\((\.\/[^)#]+\.md)\)/g
/** docs 不得引用归档文件（持久化 SSOT 只链 docs/ 与 CHANGELOG） */
const ARCHIVE_FILE_REF_RE =
  /(?:^|[^\w])(?:\.cursorGrowth\/)?archive\/(?:\d{8}_|audit\/|todo\/|plan\/|review\/|milestone\/|prototypes\/|docs-meta\/)/gm

const broken: string[] = []
const archiveRefs: string[] = []

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
  ARCHIVE_FILE_REF_RE.lastIndex = 0
  while ((m = ARCHIVE_FILE_REF_RE.exec(src)) !== null) {
    archiveRefs.push(`${name}: ${m[0].trim()}`)
  }
}

assert.ok(broken.length === 0, `broken doc links:\n${broken.join('\n')}`)
assert.ok(
  archiveRefs.length === 0,
  `docs must not reference archived files (use docs sections or CHANGELOG):\n${archiveRefs.join('\n')}`
)

/** Published VitePress pages must be self-contained — no GitHub/repo `docs/` specs. */
const WEBSITE_INTERNAL_DOCS_RE =
  /(?:blob|tree)\/[^\s)'"`]+\/docs(?:\/|[)'"`\s]|$)|docs\/(?:\d{2}_[\w\u4e00-\u9fff.-]+|screenshots)\b/gi

function walkWebsiteSources(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'cache' || name === 'public') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      walkWebsiteSources(p, acc)
      continue
    }
    if (/\.(md|ts)$/.test(name) && name !== 'README.md') acc.push(p)
  }
  return acc
}

const websiteHits: string[] = []
const websiteRoot = join(root, 'website')
for (const filePath of walkWebsiteSources(websiteRoot)) {
  const rel = filePath.slice(root.length + 1)
  const src = readFileSync(filePath, 'utf8')
  WEBSITE_INTERNAL_DOCS_RE.lastIndex = 0
  let wm: RegExpExecArray | null
  while ((wm = WEBSITE_INTERNAL_DOCS_RE.exec(src)) !== null) {
    websiteHits.push(`${rel}: ${wm[0].trim()}`)
  }
}

assert.ok(
  websiteHits.length === 0,
  `website pages must not link unpublished docs/ specs:\n${websiteHits.join('\n')}`
)

console.log(`verify:docs-links OK (${readdirSync(docsDir).length} docs scanned, website self-contained)`)
