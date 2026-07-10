export {
  defaultAvatarDataUrl,
  deterministicAvatarDataUrl,
  normalizeAvatarDataUrl,
  randomAvatarDataUrl,
  resolveAvatarSrc,
  type AvatarTheme
} from '@shared/identity/avatar'

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
