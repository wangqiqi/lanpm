import { useLayoutEffect, useRef, useState } from 'react'
import type { AwarenessPeer } from '@renderer/stores/taskAwarenessStore'
import { awarenessPeerHue } from './awarenessPeerHue'
import styles from './taskAwareness.module.css'

export interface RemoteCaretOverlayProps {
  text: string
  /** Native textarea inside Ant Design TextArea */
  textarea: HTMLTextAreaElement | null
  carets: AwarenessPeer[]
}

interface CaretPos {
  key: string
  top: number
  left: number
  color: string
  name: string
}

function copyTextareaMetrics(source: HTMLTextAreaElement, target: HTMLElement): void {
  const cs = getComputedStyle(source)
  const props = [
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontFamily',
    'lineHeight',
    'letterSpacing',
    'textTransform',
    'textAlign',
    'textIndent',
    'whiteSpace',
    'wordBreak',
    'wordSpacing',
    'wordWrap',
    'tabSize'
  ] as const
  for (const p of props) {
    target.style[p] = cs[p]
  }
  target.style.borderStyle = 'solid'
  target.style.borderColor = 'transparent'
}

function measureOffset(
  textarea: HTMLTextAreaElement,
  text: string,
  offset: number
): { top: number; left: number } {
  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.overflow = 'hidden'
  copyTextareaMetrics(textarea, mirror)
  mirror.style.height = 'auto'
  mirror.style.width = `${textarea.clientWidth}px`

  const clamped = Math.max(0, Math.min(offset, text.length))
  const before = text.slice(0, clamped)
  const marker = document.createElement('span')
  marker.textContent = '\u200b'
  mirror.appendChild(document.createTextNode(before))
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const markerRect = marker.getBoundingClientRect()
  const mirrorRect = mirror.getBoundingClientRect()
  const top = markerRect.top - mirrorRect.top - textarea.scrollTop
  const left = markerRect.left - mirrorRect.left - textarea.scrollLeft
  document.body.removeChild(mirror)
  return { top, left }
}

/** Colored caret + name label over a textarea (Docs-style). */
export default function RemoteCaretOverlay({
  text,
  textarea,
  carets
}: RemoteCaretOverlayProps): React.ReactElement | null {
  const [positions, setPositions] = useState<CaretPos[]>([])
  const frame = useRef(0)

  useLayoutEffect(() => {
    if (!textarea || carets.length === 0) {
      setPositions([])
      return
    }

    const recompute = (): void => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const next: CaretPos[] = []
        for (const peer of carets) {
          if (!peer.caret || peer.caret.field !== 'description') continue
          const { top, left } = measureOffset(textarea, text, peer.caret.offset)
          const hue = awarenessPeerHue(peer.userId)
          next.push({
            key: `${peer.userId}-${peer.clientId ?? ''}`,
            top,
            left,
            color: `hsl(${hue} 55% 48%)`,
            name: peer.displayName
          })
        }
        setPositions(next)
      })
    }

    recompute()
    textarea.addEventListener('scroll', recompute)
    window.addEventListener('resize', recompute)
    return () => {
      cancelAnimationFrame(frame.current)
      textarea.removeEventListener('scroll', recompute)
      window.removeEventListener('resize', recompute)
    }
  }, [textarea, text, carets])

  if (positions.length === 0) return null

  return (
    <div className={styles.caretLayer} aria-hidden>
      {positions.map((p) => (
        <div
          key={p.key}
          className={styles.caret}
          style={{ top: p.top, left: p.left, color: p.color }}
        >
          <span className={styles.caretBar} style={{ background: p.color }} />
          <span className={styles.caretLabel} style={{ background: p.color }}>
            {p.name}
          </span>
        </div>
      ))}
    </div>
  )
}
