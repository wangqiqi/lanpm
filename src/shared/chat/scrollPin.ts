export const SCROLL_PIN_THRESHOLD_PX = 48

export function isPinnedToBottom(el: HTMLElement, threshold = SCROLL_PIN_THRESHOLD_PX): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}
