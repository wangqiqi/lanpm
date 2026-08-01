import fs from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import type { GatewayConfig } from './config.ts'
import { PathForbiddenError, resolveSafePath } from './pathGuard.ts'

export type GatewayServer = {
  server: http.Server
  close: () => Promise<void>
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function checkAuth(req: http.IncomingMessage, token: string | null): boolean {
  if (!token) return true
  const header = req.headers.authorization ?? ''
  return header === `Bearer ${token}`
}

async function readBody(req: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (total > maxBytes) {
      throw new Error('PAYLOAD_TOO_LARGE')
    }
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

export function createGatewayServer(config: GatewayConfig): GatewayServer {
  const root = path.resolve(config.root)

  const server = http.createServer(async (req, res) => {
    try {
      if (!checkAuth(req, config.token)) {
        sendJson(res, 401, { error: 'UNAUTHORIZED' })
        return
      }

      const url = new URL(req.url ?? '/', `http://${config.host}`)
      const pathname = url.pathname

      if (req.method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'GET' && pathname === '/api/v1/list') {
        const dirRel = url.searchParams.get('dir') ?? ''
        const dirAbs = resolveSafePath(root, dirRel)
        const st = await fs.stat(dirAbs).catch(() => null)
        if (!st?.isDirectory()) {
          sendJson(res, 404, { error: 'NOT_FOUND' })
          return
        }
        const names = await fs.readdir(dirAbs)
        const entries = await Promise.all(
          names.map(async (name) => {
            const full = path.join(dirAbs, name)
            const entryStat = await fs.stat(full)
            return {
              name,
              type: entryStat.isDirectory() ? 'dir' : 'file',
              size: entryStat.isFile() ? entryStat.size : undefined
            }
          })
        )
        sendJson(res, 200, { dir: dirRel, entries })
        return
      }

      const filesPrefix = '/api/v1/files/'
      if (pathname.startsWith(filesPrefix)) {
        const rel = decodeURIComponent(pathname.slice(filesPrefix.length))
        const fileAbs = resolveSafePath(root, rel)

        if (req.method === 'GET') {
          if (!existsSync(fileAbs)) {
            sendJson(res, 404, { error: 'NOT_FOUND' })
            return
          }
          const st = await fs.stat(fileAbs)
          if (!st.isFile()) {
            sendJson(res, 400, { error: 'NOT_A_FILE' })
            return
          }
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(st.size)
          })
          createReadStream(fileAbs).pipe(res)
          return
        }

        if (req.method === 'PUT') {
          const body = await readBody(req, config.maxBytes)
          await fs.mkdir(path.dirname(fileAbs), { recursive: true })
          await fs.writeFile(fileAbs, body)
          sendJson(res, 201, { path: rel, bytes: body.length })
          return
        }
      }

      sendJson(res, 404, { error: 'NOT_FOUND' })
    } catch (err) {
      if (err instanceof PathForbiddenError) {
        sendJson(res, 403, { error: 'PATH_FORBIDDEN' })
        return
      }
      if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(res, 413, { error: 'PAYLOAD_TOO_LARGE' })
        return
      }
      sendJson(res, 500, { error: 'INTERNAL' })
    }
  })

  return {
    server,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
  }
}

export async function listenGateway(config: GatewayConfig): Promise<GatewayServer> {
  const gw = createGatewayServer(config)
  await new Promise<void>((resolve, reject) => {
    gw.server.once('error', reject)
    gw.server.listen(config.port, config.host, () => resolve())
  })
  return gw
}
