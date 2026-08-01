import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

/** Upload PNG bytes to group files and post as chat attachment. */
export async function sharePngToGroupChat(
  groupId: string,
  blob: Blob,
  fileName: string
): Promise<void> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (const b of buf) binary += String.fromCharCode(b)
  const pngBase64 = btoa(binary)
  const meta = await getLanpmApi().whiteboard.exportPng({ groupId, pngBase64, fileName })
  await getLanpmApi().chat.sendExistingFile(groupId, meta.fileId)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, filename: string, mime = 'application/json'): void {
  downloadBlob(new Blob([content], { type: mime }), filename)
}
