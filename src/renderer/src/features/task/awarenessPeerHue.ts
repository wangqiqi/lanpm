/** Stable hue for awareness peer color (badges + caret). */
export function awarenessPeerHue(userId: string): number {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % 360
  return h
}
