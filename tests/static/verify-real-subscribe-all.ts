/**
 * DATA-RR-REAL — RealNetworkTransport 须提供 subscribeAll（与 Stub 对齐）
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const src = readFileSync(
  join(projectRoot, 'src/main/network/real/RealNetworkTransport.ts'),
  'utf8'
)

assert.match(src, /subscribeAll\(/, 'RealNetworkTransport.subscribeAll missing')
assert.match(src, /globalHandlers/, 'RealNetworkTransport.globalHandlers missing')

console.log('verify:real-subscribe-all OK')
