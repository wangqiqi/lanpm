/**
 * 网络命名空间集成测试「单机探针」：在某个 netns 内起一个真实传输端点。
 *
 * 仅由 `tests/integration/verify-cross-subnet-namespaces.ts` 调用（`nsenter` 内执行），
 * 不是独立 verify 脚本；结论以 JSON 写到 `--json-out`，退出码：
 *   0 成功 · 2 host 未等到对端 · 3 join 失败 · 64 参数错误
 *
 * 用法（在目标 netns 内）：
 *   node --experimental-strip-types tests/integration/pairingNamespaceProbe.ts \
 *     --role host|join|udp-probe --label a --port 43124 [--peer-host 192.168.30.10]
 *     [--peer-port 43124] [--code-file /tmp/code.json] [--json-out /tmp/out.json]
 *     [--wait-ms 15000]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'
import type { DiscoveryPayload } from '../../src/shared/network/types'

type Role = 'host' | 'join' | 'udp-probe'

const EXIT = { ok: 0, hostTimeout: 2, joinFailed: 3, badArgs: 64 } as const

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2).replace(/-/g, '_')
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      out[key] = 'true'
      continue
    }
    out[key] = next
    i += 1
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const role = args.role as Role | undefined
const label = args.label ?? role ?? 'probe'
const port = Number(args.port ?? 43_124)
const waitMs = Number(args.wait_ms ?? args.waitMs ?? 15_000)
const codeFile = args.code_file ?? args.codeFile
const jsonOut = args.json_out ?? args.jsonOut

if (!role || !['host', 'join', 'udp-probe'].includes(role)) {
  console.error(`[probe] bad --role: ${String(role)}`)
  process.exit(EXIT.badArgs)
}

setDiscoverableGroupsProvider(() => [
  { groupId: 'ns-probe-group', name: '命名空间探针群', type: 'project' }
])

function writeResult(payload: Record<string, unknown>): void {
  const line = JSON.stringify({ role, label, ...payload })
  if (jsonOut) writeFileSync(jsonOut, `${line}\n`, 'utf8')
  console.log(`[probe] ${line}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeTransport(disableUdp: boolean): RealNetworkTransport {
  return new RealNetworkTransport({
    deviceId: `dev_ns_${label}`,
    userId: `user_ns_${label}`,
    displayName: `NS Probe ${label}`,
    listenPort: port,
    disableUdp
  })
}

if (role === 'udp-probe') {
  const transport = makeTransport(false)
  transport.start()
  await sleep(waitMs)
  const peers: DiscoveryPayload[] = await transport.discoverPeers().catch(() => [])
  writeResult({
    peers: peers.length,
    devices: peers.map((p) => p.deviceId),
    diagnostics: transport.getDiscoveryDiagnostics()
  })
  transport.stop()
  process.exit(EXIT.ok)
}

if (role === 'host') {
  if (!codeFile) {
    console.error('[probe] host requires --code-file')
    process.exit(EXIT.badArgs)
  }
  const transport = makeTransport(true)
  transport.start()
  const session = transport.startPairingSession()
  writeFileSync(
    codeFile,
    `${JSON.stringify({ code: session.code, codeDisplay: session.codeDisplay })}\n`,
    'utf8'
  )

  const deadline = Date.now() + waitMs
  while (Date.now() < deadline && transport.countReadyLinks() === 0) {
    await sleep(200)
  }
  const peers: DiscoveryPayload[] = await transport.discoverPeers().catch(() => [])
  const readyLinks = transport.countReadyLinks()
  writeResult({
    ok: readyLinks > 0 || peers.length > 0,
    readyLinks,
    liveLinks: transport.countLiveLinks(),
    discovered: peers.length,
    deviceIds: peers.map((p) => p.deviceId),
    code: session.code
  })
  transport.stop()
  process.exit(readyLinks > 0 || peers.length > 0 ? EXIT.ok : EXIT.hostTimeout)
}

// role === 'join'
const peerHost = args.peer_host ?? args.peerHost
const peerPort = Number(args.peer_port ?? args.peerPort ?? port)
if (!peerHost || !codeFile) {
  console.error('[probe] join requires --peer-host and --code-file')
  process.exit(EXIT.badArgs)
}

let code = ''
const codeDeadline = Date.now() + waitMs
while (Date.now() < codeDeadline && !code) {
  try {
    code = String(JSON.parse(readFileSync(codeFile, 'utf8')).code ?? '')
  } catch {
    await sleep(200)
  }
}
if (!code) {
  writeResult({ ok: false, reason: 'no_pairing_code' })
  process.exit(EXIT.joinFailed)
}

const transport = makeTransport(true)
transport.start()

let lastError = ''
let peer: DiscoveryPayload | null = null
const joinDeadline = Date.now() + waitMs
for (let attempt = 0; attempt < 3 && Date.now() < joinDeadline; attempt += 1) {
  try {
    peer = await transport.connectManualHostWithPairing(peerHost, peerPort, code)
    break
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error)
    await sleep(1_000)
  }
}

if (peer) {
  writeResult({
    ok: true,
    peerUserId: peer.userId,
    peerDeviceId: peer.deviceId,
    peerHost,
    peerPort,
    groups: peer.groups?.length ?? 0
  })
  transport.stop()
  process.exit(EXIT.ok)
}

writeResult({ ok: false, reason: lastError || 'pairing_failed', peerHost, peerPort })
transport.stop()
process.exit(EXIT.joinFailed)
