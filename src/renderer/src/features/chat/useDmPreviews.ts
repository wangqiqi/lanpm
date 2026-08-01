import { useEffect } from 'react'
import { isDmGroupId } from '@shared/chat/dmSession'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useDmPreviewStore } from '@renderer/features/chat/dmPreviewStore'
import { useDmStore } from '@renderer/stores/dmStore'

/** Load DM session previews and keep them fresh via chat push. */
export function useDmPreviews(): void {
  const refresh = useDmPreviewStore((s) => s.refresh)
  const patchFromMessage = useDmPreviewStore((s) => s.patchFromMessage)
  const sessionKey = useDmStore((s) => s.sessions.map((x) => x.groupId).join('\0'))

  useEffect(() => {
    void refresh()
  }, [refresh, sessionKey])

  useEffect(() => {
    const unsub = getLanpmApi().chat.onMessage((message) => {
      if (isDmGroupId(message.groupId)) {
        patchFromMessage(message)
      }
    })
    return unsub
  }, [patchFromMessage])
}
