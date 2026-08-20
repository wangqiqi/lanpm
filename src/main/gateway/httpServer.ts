import { readFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import type { GatewayConfig } from './config.ts'
import { assertLocalhostHost } from './config.ts'
import { listGatewayDir, readGatewayFile, writeGatewayFile } from './fileStore.ts'
import { PathForbiddenError } from './pathGuard.ts'
import { appendGatewayAudit } from '../ops/gatewayAuditStore.ts'
import { spawnTerminalSession } from './terminalSession.ts'
import { DEFAULT_GATEWAY_PATHS, type GatewayPaths } from '../../shared/ops/paths.ts'
import { gatewayTokenMatches, readBearerToken } from './authToken.ts'

export type GatewayServer = {
  server: http.Server
  close: () => Promise<void>
}

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'web')

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function checkAuth(req: http.IncomingMessage, token: string): boolean {
  const provided = readBearerToken(req.headers)
  if (!provided) return false
  return gatewayTokenMatches(provided, token)
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

function gatewayPaths(config: GatewayConfig): GatewayPaths {
  return {
    root: config.root,
    inboundDir: DEFAULT_GATEWAY_PATHS.inboundDir,
    outboundPaths: { ...DEFAULT_GATEWAY_PATHS.outboundPaths },
    maxBytes: config.maxBytes
  }
}

function readWebPage(name: 'files.html' | 'terminal.html'): string {
  return readFileSync(path.join(webDir, name), 'utf8')
}

export function createGatewayServer(config: GatewayConfig): GatewayServer {
  assertLocalhostHost(config.host)
  const paths = gatewayPaths(config)

  const wss = new WebSocketServer({ noServer: true })

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

      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(readWebPage('files.html'))
        return
      }

      if (req.method === 'GET' && pathname === '/terminal') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(readWebPage('terminal.html'))
        return
      }

      if (req.method === 'GET' && pathname === '/api/v1/list') {
        const dirRel = url.searchParams.get('dir') ?? ''
        const entries = await listGatewayDir(paths, dirRel)
        appendGatewayAudit('file_list', dirRel || '/', req.socket.remoteAddress)
        sendJson(res, 200, { dir: dirRel, entries })
        return
      }

      const filesPrefix = '/api/v1/files/'
      if (pathname.startsWith(filesPrefix)) {
        const rel = decodeURIComponent(pathname.slice(filesPrefix.length))

        if (req.method === 'GET') {
          const data = await readGatewayFile(paths, rel)
          appendGatewayAudit('file_read', rel, req.socket.remoteAddress)
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(data.length)
          })
          res.end(data)
          return
        }

        if (req.method === 'PUT') {
          const body = await readBody(req, config.maxBytes)
          await writeGatewayFile(paths, rel, body)
          appendGatewayAudit('file_write', rel, req.socket.remoteAddress)
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
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        sendJson(res, 404, { error: 'NOT_FOUND' })
        return
      }
      if (err instanceof Error && err.message === 'NOT_A_FILE') {
        sendJson(res, 400, { error: 'NOT_A_FILE' })
        return
      }
      sendJson(res, 500, { error: 'INTERNAL' })
    }
  })

  server.on('upgrade', (req, socket, head) => {
    void (async () => {
      try {
        if (!checkAuth(req, config.token)) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
          socket.destroy()
          return
        }
        const url = new URL(req.url ?? '/', `http://${config.host}`)
        if (url.pathname !== '/api/v1/terminal') {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
          socket.destroy()
          return
        }
        if (!config.terminalEnabled) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
          socket.destroy()
          return
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          void spawnTerminalSession(ws, req.socket.remoteAddress).catch(() => {
            ws.close()
          })
        })
      } catch {
        socket.destroy()
      }
    })()
  })

  return {
    server,
    close: () =>
      new Promise((resolve, reject) => {
        wss.clients.forEach((client) => client.close())
        wss.close()
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

/** SPIKE / tools compatibility export */
export type { GatewayConfig as SpikeGatewayConfig }
