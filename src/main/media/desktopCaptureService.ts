import { desktopCapturer } from 'electron'

export interface DesktopCaptureSource {
  id: string
  name: string
}

/** Host proxy for `media.captureDesktop` — Electron `desktopCapturer` in main. */
export async function listDesktopCaptureSources(): Promise<DesktopCaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 0, height: 0 }
  })
  return sources.map((source) => ({
    id: source.id,
    name: source.name
  }))
}
