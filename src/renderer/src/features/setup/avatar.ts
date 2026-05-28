const PALETTE = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2']

export function randomAvatarDataUrl(label: string): string {
  const initials = label.trim().slice(0, 2) || 'LP'
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="96" height="96" fill="${color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    fill="#fff" font-size="36" font-family="system-ui,sans-serif">${escapeXml(initials)}</text>
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
