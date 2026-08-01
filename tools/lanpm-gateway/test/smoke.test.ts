import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { loadConfig } from '../src/config.ts'
import { listenGateway } from '../src/server.ts'

test('list → put → get roundtrip', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'lanpm-gw-'))
  const port = 18000 + Math.floor(Math.random() * 1000)
  const prev = { ...process.env }
  process.env.LANPM_GATEWAY_ROOT = tmp
  process.env.LANPM_GATEWAY_HOST = '127.0.0.1'
  process.env.LANPM_GATEWAY_PORT = String(port)

  const config = loadConfig()
  const gw = await listenGateway(config)

  try {
    const base = `http://127.0.0.1:${port}`
    const payload = Buffer.from('hello-ops-spike')
    const auth = { Authorization: `Bearer ${config.token}` }

    const putRes = await fetch(`${base}/api/v1/files/inbound/demo.bin`, {
      method: 'PUT',
      body: payload,
      headers: auth
    })
    assert.equal(putRes.status, 201)

    const listRes = await fetch(`${base}/api/v1/list?dir=inbound`, { headers: auth })
    assert.equal(listRes.status, 200)
    const listJson = (await listRes.json()) as { entries: { name: string }[] }
    assert.ok(listJson.entries.some((e) => e.name === 'demo.bin'))

    const getRes = await fetch(`${base}/api/v1/files/inbound/demo.bin`, { headers: auth })
    assert.equal(getRes.status, 200)
    const got = Buffer.from(await getRes.arrayBuffer())
    assert.deepEqual(got, payload)

    const forbidden = await fetch(`${base}/api/v1/files/${encodeURIComponent('../../outside.txt')}`, {
      headers: auth
    })
    assert.equal(forbidden.status, 403)
  } finally {
    await gw.close()
    process.env = prev
    await fs.rm(tmp, { recursive: true, force: true })
  }
})

test('rejects non-localhost host config', () => {
  const prev = process.env.LANPM_GATEWAY_HOST
  process.env.LANPM_GATEWAY_HOST = '0.0.0.0'
  assert.throws(() => loadConfig())
  process.env.LANPM_GATEWAY_HOST = prev
})
