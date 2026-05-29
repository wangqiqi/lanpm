/** VIS-08：与 global 语义色 / accent 对齐（装饰用，非主题令牌运行时读取） */
const PALETTE = [
  '#0071e3',
  '#34c759',
  '#ff9500',
  '#ff3b30',
  '#5856d6',
  '#5ac8fa'
] as const

export function randomAvatarDataUrl(label: string): string {
  const initials = label.trim().slice(0, 2) || 'LP'
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="96" height="96" fill="${color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    fill="#ffffff" font-size="36" font-family="system-ui,sans-serif">${escapeXml(initials)}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
