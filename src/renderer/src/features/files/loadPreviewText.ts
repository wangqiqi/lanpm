import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

/** 读取文本预览；优先 IPC，回退 fetch 预览 URL（lanpm-preview://） */
export async function loadPreviewText(fileId: string): Promise<string | null> {
  const fileApi = getLanpmApi().file
  if (typeof fileApi.getPreviewText === 'function') {
    const text = await fileApi.getPreviewText(fileId)
    if (text !== null) return text
  }
  const url = await fileApi.getPreviewUrl(fileId)
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
