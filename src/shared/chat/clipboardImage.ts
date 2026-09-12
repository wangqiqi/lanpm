/** First image file from a paste event, if any. */
export function readClipboardImageFile(data: DataTransfer | null): File | null {
  if (!data) return null
  const files = data.files
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f?.type.startsWith('image/')) return f
    }
  }
  const items = data.items
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item?.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) return f
      }
    }
  }
  return null
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('err.clipboardReadFailed'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('err.clipboardReadFailed'))
    reader.readAsDataURL(file)
  })
}
