/** Dynamic loader — optional import('livekit-client') at runtime; not bundled by Vite */

export type LiveKitRoom = {
  connect: (url: string, token: string) => Promise<void>
  disconnect: () => Promise<void>
  localParticipant: {
    setMicrophoneEnabled: (enabled: boolean) => Promise<void>
    isMicrophoneEnabled: boolean
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
