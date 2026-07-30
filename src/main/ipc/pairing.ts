import { ipcMain } from 'electron'
import { readFileSync } from 'node:fs'
import { PAIRING_IPC } from '../../shared/discover/channels'
import type { PairingJoinInput } from '../../shared/discover/pairing'
import { parseLanpmPeerFileJson } from '../../shared/network/peerFile.ts'
import {
  buildLocalPeerFile,
  importPeerFile,
  writePeerFile
} from '../discover/peerFileService'
import {
  cancelPairingSession,
  joinWithPairingCodeAndSnapshot,
  startPairingSession
} from '../discover/pairingService'
import { getDatabase } from '../storage'
import { requestSyncOutboxFlush } from '../sync/outboxFlushService'
import { showOpenDialog, showSaveDialog } from '../systemDialog'

export function registerPairingIpc(): void {
  ipcMain.handle(PAIRING_IPC.start, () => startPairingSession())

  ipcMain.handle(PAIRING_IPC.cancel, () => {
    cancelPairingSession()
    return { ok: true as const }
  })

  ipcMain.handle(PAIRING_IPC.join, (_event, input: PairingJoinInput) => {
    if (!input || typeof input.code !== 'string') {
      throw new Error('pairing_code_required')
    }
    return joinWithPairingCodeAndSnapshot(getDatabase(), input).then((result) => {
      requestSyncOutboxFlush()
      return result
    })
  })

  ipcMain.handle(PAIRING_IPC.exportPeerFile, () => buildLocalPeerFile(getDatabase()))

  ipcMain.handle(PAIRING_IPC.importPeerFile, async (_event, json: string) => {
    if (typeof json !== 'string' || !json.trim()) {
      throw new Error('peer_file_required')
    }
    const file = parseLanpmPeerFileJson(json)
    const result = await importPeerFile(getDatabase(), file)
    requestSyncOutboxFlush()
    return result
  })

  ipcMain.handle(PAIRING_IPC.exportPeerFileDialog, async () => {
    const file = buildLocalPeerFile(getDatabase())
    const picked = await showSaveDialog(null, {
      defaultPath: 'lanpm-peer.json',
      filters: [{ name: 'LanPM Peer', extensions: ['json'] }]
    })
    if (picked.canceled || !picked.filePath) return null
    writePeerFile(picked.filePath, file)
    return { path: picked.filePath, file }
  })

  ipcMain.handle(PAIRING_IPC.importPeerFileDialog, async () => {
    const picked = await showOpenDialog(null, {
      filters: [{ name: 'LanPM Peer', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (picked.canceled || !picked.filePaths[0]) return null
    const path = picked.filePaths[0]
    const file = parseLanpmPeerFileJson(readFileSync(path, 'utf8'))
    const result = await importPeerFile(getDatabase(), file)
    requestSyncOutboxFlush()
    return { path, ...result }
  })
}
