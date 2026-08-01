import type { IPty } from 'node-pty'
import type { WebSocket } from 'ws'
import { appendGatewayAudit } from '../ops/gatewayAuditStore.ts'
import { newGatewaySessionId } from '../ops/gatewayService.ts'

export type TerminalSession = {
  id: string
  pty: IPty
  ws: WebSocket
}

export async function spawnTerminalSession(
  ws: WebSocket,
  remoteAddress?: string
): Promise<TerminalSession> {
  const pty = await import('node-pty')
  const shell = process.env.SHELL || '/bin/bash'
  const sessionId = newGatewaySessionId()
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || process.cwd(),
    env: process.env as Record<string, string>
  })

  appendGatewayAudit('terminal_open', sessionId, remoteAddress)

  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }))
    }
  })

  ptyProcess.onExit(() => {
    appendGatewayAudit('terminal_close', sessionId, remoteAddress)
    if (ws.readyState === ws.OPEN) {
      ws.close()
    }
  })

  ws.on('message', (raw) => {
    const text = typeof raw === 'string' ? raw : raw.toString('utf8')
    try {
      const msg = JSON.parse(text) as { type?: string; data?: string; cols?: number; rows?: number }
      if (msg.type === 'input' && typeof msg.data === 'string') {
        ptyProcess.write(msg.data)
        return
      }
      if (msg.type === 'resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
        ptyProcess.resize(msg.cols, msg.rows)
      }
    } catch {
      ptyProcess.write(text)
    }
  })

  ws.on('close', () => {
    try {
      ptyProcess.kill()
    } catch {
      // ignore
    }
  })

  return { id: sessionId, pty: ptyProcess, ws }
}
