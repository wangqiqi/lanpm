import { parseHostPort } from '../src/shared/network/manualPeer.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

const ok = parseHostPort('192.168.1.10:43124')
assert(ok.host === '192.168.1.10' && ok.port === 43_124, 'parse host:port')

let threw = false
try {
  parseHostPort('bad')
} catch {
  threw = true
}
assert(threw, 'reject bad input')

console.log('verify:network-manual OK')
