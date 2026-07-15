/**
 * AUTO-07 — browserLanpmStub 与 preload 的 LanpmApi 命名空间/方法对齐。
 * Run: npm run verify:stub-parity
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

function normalizeLines(source: string): string {
  return source.replace(/\r\n/g, '\n')
}

function extractApiShape(
  source: string,
  startMarker: string,
  nsIndent: number,
  methodIndent: number
): Record<string, string[]> {
  const normalized = normalizeLines(source)
  const start = normalized.indexOf(startMarker)
  assert.ok(start >= 0, `marker not found: ${startMarker}`)
  const slice = normalized.slice(start)
  const top: Record<string, string[]> = { _root: [] }
  const nsRe = new RegExp(`^\\s{${nsIndent}}(\\w+):\\s*\\{`, 'gm')
  const methodRe = new RegExp(`^\\s{${methodIndent}}(\\w+):`, 'gm')
  const rootRe = new RegExp(`^\\s{${nsIndent}}(\\w+):\\s*(?:\\(|async|\\S)`, 'gm')

  let m: RegExpExecArray | null
  const namespaces: { name: string; index: number }[] = []
  while ((m = nsRe.exec(slice)) !== null) {
    namespaces.push({ name: m[1]!, index: m.index })
  }
  for (let i = 0; i < namespaces.length; i++) {
    const ns = namespaces[i]!
    const end = namespaces[i + 1]?.index ?? slice.length
    const block = slice.slice(ns.index, end)
    methodRe.lastIndex = 0
    top[ns.name] = [...block.matchAll(methodRe)].map((x) => x[1]!)
  }
  rootRe.lastIndex = 0
  while ((m = rootRe.exec(slice)) !== null) {
    const name = m[1]!
    if (!top[name]) top._root!.push(name)
  }
  return top
}

const preloadSrc = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
const stubSrc = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')

const preloadShape = extractApiShape(preloadSrc, 'const api: LanpmApi = {', 2, 4)
const stubShape = extractApiShape(stubSrc, "return {\n    platform: 'browser'", 4, 6)

const skipNs = new Set(['versions'])
const skipMethod = (name: string) => name.startsWith('on')

for (const ns of Object.keys(preloadShape)) {
  if (ns === '_root' || skipNs.has(ns)) continue
  assert.ok(stubShape[ns], `stub missing namespace: ${ns}`)
  for (const method of preloadShape[ns] ?? []) {
    if (skipMethod(method)) continue
    assert.ok(stubShape[ns]?.includes(method), `stub.${ns}.${method} missing`)
  }
}

for (const method of preloadShape._root ?? []) {
  if (method === 'platform') continue
  assert.ok(stubShape._root?.includes(method), `stub missing root method: ${method}`)
}

console.log(`verify:stub-parity OK (${Object.keys(preloadShape).length - 1} namespaces)`)
