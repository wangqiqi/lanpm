import { useCallback, useEffect, useRef, useState } from 'react'
import type { PluginView } from '@shared/plugin/types'
import { liveKitRoomNameForGroup } from '@shared/media/livekitConfig'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import {
  loadLiveKitClient,
  type LiveKitParticipant,
  type LiveKitRoom,
  type LiveKitTrackPublication
} from './livekitClientLoader'

export type LiveKitProStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'unavailable'

export type ProParticipantView = {
  identity: string
  name: string
  isLocal: boolean
  audioMuted: boolean
  videoEnabled: boolean
  videoTrack: MediaStreamTrack | null
  screenShareTrack: MediaStreamTrack | null
}

type TokenResponse = {
  token: string
  url: string
  roomName: string
}

function iterPublications(
  participant: LiveKitParticipant
): Iterable<LiveKitTrackPublication> {
  const pubs = participant.videoTrackPublications
  if (pubs instanceof Map) return pubs.values()
  return pubs
}

function trackFromPublication(pub: LiveKitTrackPublication): MediaStreamTrack | null {
  return pub.track?.mediaStreamTrack ?? null
}

function isScreenShareSource(source: string | undefined): boolean {
  return source === 'screen_share' || source === 'screen_share_audio'
}

function participantToView(
  participant: LiveKitParticipant,
  isLocal: boolean,
  localUserId: string | undefined
): ProParticipantView {
  let videoTrack: MediaStreamTrack | null = null
  let screenShareTrack: MediaStreamTrack | null = null

  for (const pub of iterPublications(participant)) {
    const track = trackFromPublication(pub)
    if (!track) continue
    if (isScreenShareSource(pub.source)) {
      if (!screenShareTrack) screenShareTrack = track
    } else if (!videoTrack) {
      videoTrack = track
    }
  }

  const identity = participant.identity
  const name =
    participant.name?.trim() ||
    (isLocal && localUserId ? localUserId : identity)

  return {
    identity,
    name,
    isLocal,
    audioMuted: !participant.isMicrophoneEnabled,
    videoEnabled: participant.isCameraEnabled,
    videoTrack,
    screenShareTrack
  }
}

function collectParticipants(
  room: LiveKitRoom,
  localUserId: string | undefined
): ProParticipantView[] {
  const list: ProParticipantView[] = [
    participantToView(room.localParticipant, true, localUserId)
  ]
  for (const remote of room.remoteParticipants.values()) {
    list.push(participantToView(remote, false, localUserId))
  }
  return list
}

const ROOM_EVENTS = [
  'participantConnected',
  'participantDisconnected',
  'trackSubscribed',
  'trackUnsubscribed',
  'localTrackPublished',
  'localTrackUnpublished'
] as const

export function useMeetingLiveKit(plugin: PluginView, groupId: string) {
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const [configured, setConfigured] = useState(false)
  const [proStatus, setProStatus] = useState<LiveKitProStatus>('idle')
  const [proJoined, setProJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [proParticipants, setProParticipants] = useState<ProParticipantView[]>([])
  const [sdkMissing, setSdkMissing] = useState(false)
  const roomRef = useRef<LiveKitRoom | null>(null)
  const syncHandlerRef = useRef<(() => void) | null>(null)

  const refreshConfigured = useCallback(async () => {
    const view = await getLanpmApi().meeting.getLiveKitConfig()
    setConfigured(view.configured)
  }, [])

  useEffect(() => {
    void refreshConfigured()
  }, [refreshConfigured])

  const detachRoomListeners = useCallback((room: LiveKitRoom) => {
    const handler = syncHandlerRef.current
    if (!handler) return
    for (const event of ROOM_EVENTS) {
      room.off(event, handler)
    }
    syncHandlerRef.current = null
  }, [])

  const attachRoomListeners = useCallback(
    (room: LiveKitRoom) => {
      detachRoomListeners(room)
      const handler = () => {
        setProParticipants(collectParticipants(room, localUserId))
        setMuted(!room.localParticipant.isMicrophoneEnabled)
        setCameraEnabled(room.localParticipant.isCameraEnabled)
        setScreenSharing(room.localParticipant.isScreenShareEnabled ?? false)
      }
      syncHandlerRef.current = handler
      for (const event of ROOM_EVENTS) {
        room.on(event, handler)
      }
      handler()
    },
    [detachRoomListeners, localUserId]
  )

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
      await room.localParticipant.setCameraEnabled(false)
      setMuted(false)
      setCameraEnabled(false)
      setScreenSharing(false)
      roomRef.current = room
      attachRoomListeners(room)
      setProJoined(true)
      setProStatus('connected')
    } catch (err) {
      setProStatus((current) => (current === 'unavailable' ? 'unavailable' : 'failed'))
      throw err
    } finally {
      setBusy(false)
    }
  }, [attachRoomListeners, groupId, localUserId, plugin.id])

  const leaveProRoom = useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      const room = roomRef.current
      if (room) detachRoomListeners(room)
      await room?.disconnect()
      roomRef.current = null
      setProJoined(false)
      setMuted(false)
      setCameraEnabled(false)
      setScreenSharing(false)
      setProParticipants([])
      setProStatus('idle')
    } finally {
      setBusy(false)
    }
  }, [detachRoomListeners])

  const toggleProMute = useCallback(async (): Promise<void> => {
    const room = roomRef.current
    if (!room) return
    const next = !room.localParticipant.isMicrophoneEnabled
    await room.localParticipant.setMicrophoneEnabled(next)
    setMuted(!next)
  }, [])

  const toggleProCamera = useCallback(async (): Promise<void> => {
    const room = roomRef.current
    if (!room) return
    const next = !room.localParticipant.isCameraEnabled
    await room.localParticipant.setCameraEnabled(next)
    setCameraEnabled(next)
  }, [])

  const toggleProScreenShare = useCallback(async (): Promise<void> => {
    const room = roomRef.current
    if (!room) return
    const next = !(room.localParticipant.isScreenShareEnabled ?? false)
    await room.localParticipant.setScreenShareEnabled(next)
    setScreenSharing(next)
  }, [])

  useEffect(() => {
    return () => {
      const room = roomRef.current
      if (room) detachRoomListeners(room)
      void room?.disconnect()
      roomRef.current = null
    }
  }, [detachRoomListeners])

  return {
    configured,
    proStatus,
    proJoined,
    busy,
    muted,
    cameraEnabled,
    screenSharing,
    proParticipants,
    sdkMissing,
    refreshConfigured,
    joinProRoom,
    leaveProRoom,
    toggleProMute,
    toggleProCamera,
    toggleProScreenShare
  }
}
