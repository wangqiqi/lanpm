import { BrowserWindow, dialog, type WebContents } from 'electron'
import { readAppLocale } from '../locale/localeStore.ts'

export type DestructiveKind = 'resetIdentity' | 'dissolve'

export function destructiveConfirmCopy(
  kind: DestructiveKind,
  locale: string
): { message: string; detail: string; confirm: string; cancel: string } {
  const zh = locale.toLowerCase().startsWith('zh')
  if (kind === 'resetIdentity') {
    return zh
      ? {
          message: '重置本机身份？',
          detail: '将清除本地身份并重新初始化网络。此操作不可从本对话框撤销。',
          confirm: '重置',
          cancel: '取消'
        }
      : {
          message: 'Reset this device identity?',
          detail: 'This clears local identity and restarts networking. It cannot be undone from this dialog.',
          confirm: 'Reset',
          cancel: 'Cancel'
        }
  }
  return zh
    ? {
        message: '解散该群组？',
        detail: '将删除本机上该群的聊天、任务与文件记录，且不可撤销。',
        confirm: '解散',
        cancel: '取消'
      }
    : {
        message: 'Dissolve this group?',
        detail: 'Chat, tasks, and files for this group will be deleted on this device. This cannot be undone.',
        confirm: 'Dissolve',
        cancel: 'Cancel'
      }
}

export async function confirmDestructiveIpc(
  sender: WebContents,
  kind: DestructiveKind
): Promise<boolean> {
  const copy = destructiveConfirmCopy(kind, readAppLocale())
  const parent = BrowserWindow.fromWebContents(sender)
  const result = await dialog.showMessageBox(parent ?? undefined, {
    type: 'warning',
    buttons: [copy.cancel, copy.confirm],
    defaultId: 0,
    cancelId: 0,
    message: copy.message,
    detail: copy.detail
  })
  return result.response === 1
}
