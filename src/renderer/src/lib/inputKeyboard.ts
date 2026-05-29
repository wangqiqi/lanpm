import type { FormInstance } from 'antd/es/form'
import type { KeyboardEvent } from 'react'

/** Ant Design Form: Enter in a field triggers validation + `onFinish`. */
export function submitFormOnEnter(form: FormInstance): () => void {
  return () => form.submit()
}

/** Single-line field: Enter runs the primary action. */
export function runOnEnter(
  run: () => void | Promise<void>,
  disabled?: boolean
): () => void {
  return () => {
    if (disabled) return
    void run()
  }
}

/** Multiline field: Ctrl/Cmd+Enter runs the primary action. */
export function onCtrlEnter(
  e: KeyboardEvent,
  run: () => void | Promise<void>,
  disabled?: boolean
): void {
  if (e.key !== 'Enter' || (!e.ctrlKey && !e.metaKey)) return
  e.preventDefault()
  if (disabled) return
  void run()
}

/** Short modal textarea: Enter submits, Shift+Enter adds a newline. */
export function onEnterUnlessShift(
  e: KeyboardEvent,
  run: () => void | Promise<void>,
  disabled?: boolean
): void {
  if (e.key !== 'Enter' || e.shiftKey) return
  e.preventDefault()
  if (disabled) return
  void run()
}
