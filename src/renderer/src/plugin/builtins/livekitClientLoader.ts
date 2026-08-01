/** Dynamic loader — optional import('livekit-client') at runtime; not bundled by Vite */

export type LiveKitTrackPublication = {
  source?: string
  track: { mediaStreamTrack: MediaStreamTrack } | null
}

export type LiveKitParticipant = {
  identity: string
  name?: string
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  isScreenShareEnabled?: boolean
  videoTrackPublications: Map<string, LiveKitTrackPublication> | Iterable<LiveKitTrackPublication>
}

export type LiveKitRoom = {
  connect: (url: string, token: string) => Promise<void>
  disconnect: () => Promise<void>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler: (...args: unknown[]) => void) => void
  remoteParticipants: Map<string, LiveKitParticipant>
  localParticipant: LiveKitParticipant & {
    setMicrophoneEnabled: (enabled: boolean) => Promise<void>
    setCameraEnabled: (enabled: boolean) => Promise<void>
    setScreenShareEnabled: (enabled: boolean) => Promise<void>
    isMicrophoneEnabled: boolean
    isCameraEnabled: boolean
    isScreenShareEnabled: boolean
  }
}

export type LiveKitClientModule = {
  Room: new () => LiveKitRoom
}

let cached: LiveKitClientModule | null | undefined

export async function loadLiveKitClient(): Promise<LiveKitClientModule | null> {
  if (cached !== undefined) return cached
  try {
    const load = new Function(
      "return import('livekit-client')"
    ) as () => Promise<LiveKitClientModule>
    cached = await load()
    return cached
  } catch {
    cached = null
    return null
  }
}
