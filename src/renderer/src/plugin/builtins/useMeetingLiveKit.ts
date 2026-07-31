import { useCallback, useEffect, useRef, useState } from 'react'
import type { PluginView } from '@shared/plugin/types'
import { liveKitRoomNameForGroup } from '@shared/media/livekitConfig'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { loadLiveKitClient, type LiveKitRoom } from './livekitClientLoader'

export type LiveKitProStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'unavailable'

type TokenResponse = {
  token: string
  url: string
  roomName: string
}

export function useMeetingLiveKit(plugin: PluginView, groupId: string) {
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const [configured, setConfigured] = useState(false)
  const [proStatus, setProStatus] = useState<LiveKitProStatus>('idle')
  const [proJoined, setProJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [sdkMissing, setSdkMissing] = useState(false)
  const roomRef = useRef<LiveKitRoom | null>(null)

  const refreshConfigured = useCallback(async () => {
    const view = await getLanpmApi().meeting.getLiveKitConfig()
    setConfigured(view.configured)
  }, [])

  useEffect(() => {
    void refreshConfigured()
  }, [refreshConfigured])

  const joinProRoom = useCallback(async (): Promise<void> => {
    if (!localUserId) throw new Error('identity required')
    setBusy(true)
    setProStatus('connecting')
    try {
      const lk = await loadLiveKitClient()
      if (!lk) {
        setSdkMissing(true)
        setProStatus('unavailable')
        throw new Error('livekit-client not installed')
      }
      const roomName = liveKitRoomNameForGroup(groupId)
      const raw = await getLanpmApi().plugin.invokeCapability(
        plugin.id,
        'media.livekit.createToken',
        { groupId, identity: localUserId, roomName }
      )
      const { token, url } = raw as TokenResponse
      const room = new lk.Room()
      await room.connect(url, token)
      await room.localParticipant.setMicrophoneEnabled(true)
      setMuted(false)
      roomRef.current = room
      setProJoined(true)
      setProStatus('connected')
    } catch (err) {
      setProStatus('failed')
      throw err
    } finally {
      setBusy(false)
    }
  }, [groupId, localUserId, plugin.id])

  const leaveProRoom = useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      await roomRef.current?.disconnect()
      roomRef.current = null
      setProJoined(false)
      setMuted(false)
      setProStatus('idle')
    } finally {
      setBusy(false)
    }
  }, [])

  const toggleProMute = useCallback(async (): Promise<void> => {
    const room = roomRef.current
    if (!room) return
    const next = !room.localParticipant.isMicrophoneEnabled
    await room.localParticipant.setMicrophoneEnabled(next)
    setMuted(!next)
  }, [])

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect()
      roomRef.current = null
    }
  }, [])

  return {
    configured,
    proStatus,
    proJoined,
    busy,
    muted,
    sdkMissing,
    refreshConfigured,
    joinProRoom,
    leaveProRoom,
    toggleProMute
  }
}
