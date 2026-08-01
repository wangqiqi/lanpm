import { useCallback, useEffect, useRef, useState } from 'react'
import type { MediaSignalPayload } from '@shared/media/mediaSignal'
import type { PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'

const POLL_MS = 2_000

type RoomState = {
  phase?: string
  participants?: { userId: string; displayName: string }[]
  maxParticipants?: number
}

function pickMeshPeer(
  localUserId: string,
  participants: { userId: string }[]
): string | null {
  const others = participants.map((p) => p.userId).filter((id) => id !== localUserId)
  if (others.length === 0) return null
  return others.sort()[0] ?? null
}

async function captureDesktopSource(sourceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId
      }
    }
  } as MediaStreamConstraints)
}

export function useMeetingMesh(plugin: PluginView, groupId: string) {
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [joined, setJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [meshStatus, setMeshStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>(
    'idle'
  )
  const [desktopSources, setDesktopSources] = useState<{ id: string; name: string }[]>([])
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cursorRef = useRef('')
  const peerRef = useRef<string | null>(null)
  const joinedRef = useRef(false)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const screenSenderRef = useRef<RTCRtpSender | null>(null)

  const refreshRoom = useCallback(async () => {
    const raw = await getLanpmApi().plugin.invokeCapability(plugin.id, 'media.room.state', {
      groupId
    })
    setRoomState(raw as RoomState)
    return raw as RoomState
  }, [plugin.id, groupId])

  const sendSignal = useCallback(
    async (args: Record<string, unknown>) => {
      return getLanpmApi().plugin.invokeCapability(plugin.id, 'media.signal.send', {
        groupId,
        ...args
      })
    },
    [plugin.id, groupId]
  )

  const renegotiate = useCallback(
    async (peerUserId: string) => {
      const pc = pcRef.current
      if (!pc) return
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await sendSignal({
        kind: 'offer',
        toUserId: peerUserId,
        sdp: offer.sdp ?? undefined
      })
    },
    [sendSignal]
  )

  const ensurePeerConnection = useCallback(
    (peerUserId: string) => {
      if (pcRef.current) return pcRef.current
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.onicecandidate = (event) => {
        if (!event.candidate || !localUserId) return
        void sendSignal({
          kind: 'ice-candidate',
          toUserId: peerUserId,
          candidate: JSON.stringify(event.candidate.toJSON())
        })
      }
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'connected') setMeshStatus('connected')
        else if (state === 'failed') setMeshStatus('failed')
      }
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track])
        setRemoteStream(stream)
      }
      pcRef.current = pc
      return pc
    },
    [localUserId, sendSignal]
  )

  const handleRemoteSignal = useCallback(
    async (signal: MediaSignalPayload) => {
      if (!localUserId || signal.fromUserId === localUserId) return

      if (signal.kind === 'join' || signal.kind === 'leave') {
        await refreshRoom()
        return
      }

      if (!signal.toUserId || signal.toUserId !== localUserId) return

      const peerUserId = signal.fromUserId
      peerRef.current = peerUserId
      const pc = ensurePeerConnection(peerUserId)

      try {
        if (signal.kind === 'offer' && signal.sdp) {
          setMeshStatus('connecting')
          await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await sendSignal({
            kind: 'answer',
            toUserId: peerUserId,
            sdp: answer.sdp ?? undefined
          })
        } else if (signal.kind === 'answer' && signal.sdp) {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        } else if (signal.kind === 'ice-candidate' && signal.candidate) {
          const candidate = JSON.parse(signal.candidate) as RTCIceCandidateInit
          await pc.addIceCandidate(candidate)
        }
      } catch {
        setMeshStatus('failed')
      }
    },
    [ensurePeerConnection, localUserId, refreshRoom, sendSignal]
  )

  const maybeStartOffer = useCallback(
    async (state: RoomState) => {
      if (!localUserId || !joinedRef.current) return
      const peer = pickMeshPeer(localUserId, state.participants ?? [])
      if (!peer || peerRef.current === peer) return
      if (localUserId > peer) return

      peerRef.current = peer
      const pc = ensurePeerConnection(peer)
      try {
        setMeshStatus('connecting')
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await sendSignal({
          kind: 'offer',
          toUserId: peer,
          sdp: offer.sdp ?? undefined
        })
      } catch {
        setMeshStatus('failed')
      }
    },
    [ensurePeerConnection, localUserId, sendSignal]
  )

  const pollSignals = useCallback(async () => {
    if (!joinedRef.current) return
    const raw = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'media.signal.poll', {
      groupId,
      cursor: cursorRef.current
    })) as { messages?: MediaSignalPayload[]; cursor?: string }
    const messages = raw.messages ?? []
    if (raw.cursor) cursorRef.current = raw.cursor
    for (const msg of messages) {
      await handleRemoteSignal(msg)
    }
    const state = await refreshRoom()
    await maybeStartOffer(state)
  }, [groupId, handleRemoteSignal, maybeStartOffer, plugin.id, refreshRoom])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    void pollSignals()
    pollRef.current = setInterval(() => {
      void pollSignals()
    }, POLL_MS)
  }, [pollSignals, stopPolling])

  const stopScreenShareInternal = useCallback(async () => {
    const pc = pcRef.current
    if (screenSenderRef.current && pc) {
      try {
        pc.removeTrack(screenSenderRef.current)
      } catch {
        // ignore
      }
      screenSenderRef.current = null
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    setScreenSharing(false)
    if (peerRef.current && joinedRef.current) {
      await renegotiate(peerRef.current)
    }
  }, [renegotiate])

  const joinRoom = useCallback(async () => {
    if (!localUserId) return
    setBusy(true)
    try {
      await sendSignal({ kind: 'join' })
      joinedRef.current = true
      setJoined(true)
      cursorRef.current = ''
      startPolling()
      await refreshRoom()
    } finally {
      setBusy(false)
    }
  }, [localUserId, refreshRoom, sendSignal, startPolling])

  const leaveRoom = useCallback(async () => {
    setBusy(true)
    try {
      await stopScreenShareInternal()
      if (joinedRef.current) {
        await sendSignal({ kind: 'leave' })
      }
      joinedRef.current = false
      setJoined(false)
      stopPolling()
      pcRef.current?.close()
      pcRef.current = null
      peerRef.current = null
      setMeshStatus('idle')
      setRemoteStream(null)
      await refreshRoom()
    } finally {
      setBusy(false)
    }
  }, [refreshRoom, sendSignal, stopPolling, stopScreenShareInternal])

  const loadDesktopSources = useCallback(async (): Promise<number> => {
    setBusy(true)
    try {
      const sources = (await getLanpmApi().plugin.invokeCapability(
        plugin.id,
        'media.captureDesktop',
        {}
      )) as { id: string; name: string }[]
      const list = Array.isArray(sources) ? sources : []
      setDesktopSources(list)
      return list.length
    } finally {
      setBusy(false)
    }
  }, [plugin.id])

  const shareDesktopSource = useCallback(
    async (sourceId: string): Promise<void> => {
      if (!joined || !peerRef.current) {
        throw new Error('join room first')
      }
      setBusy(true)
      try {
        await stopScreenShareInternal()
        const stream = await captureDesktopSource(sourceId)
        screenStreamRef.current = stream
        const track = stream.getVideoTracks()[0]
        if (!track) throw new Error('no video track')
        const pc = ensurePeerConnection(peerRef.current)
        screenSenderRef.current = pc.addTrack(track, stream)
        setScreenSharing(true)
        await renegotiate(peerRef.current)
      } finally {
        setBusy(false)
      }
    },
    [ensurePeerConnection, joined, renegotiate, stopScreenShareInternal]
  )

  const stopScreenShare = useCallback(async () => {
    setBusy(true)
    try {
      await stopScreenShareInternal()
    } finally {
      setBusy(false)
    }
  }, [stopScreenShareInternal])

  useEffect(() => {
    void refreshRoom()
    return () => {
      stopPolling()
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      pcRef.current?.close()
    }
  }, [refreshRoom, stopPolling])

  return {
    roomState,
    joined,
    busy,
    meshStatus,
    desktopSources,
    screenSharing,
    remoteStream,
    joinRoom,
    leaveRoom,
    loadDesktopSources,
    shareDesktopSource,
    stopScreenShare
  }
}
