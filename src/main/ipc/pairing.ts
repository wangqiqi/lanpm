import { ipcMain } from 'electron'
import { PAIRING_IPC } from '../../shared/discover/channels'
import type { PairingJoinInput } from '../../shared/discover/pairing'
import {
  cancelPairingSession,
  joinWithPairingCodeAndSnapshot,
  startPairingSession
} from '../discover/pairingService'
import { getDatabase } from '../storage'
import { requestSyncOutboxFlush } from '../sync/outboxFlushService'

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
}
