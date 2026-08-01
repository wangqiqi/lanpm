import { formatOpsLogSeedMarkdown } from '@shared/ops/logDesensitize'
import { loadPreviewText } from '@renderer/features/files/loadPreviewText'
import { useAiAssistantStore } from '@renderer/stores/aiAssistantStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

function pickAssistantLayout(): 'dock' | 'drawer' {
  return window.matchMedia('(min-width: 1100px)').matches ? 'dock' : 'drawer'
}

export async function openOpsFileInAssistant(
  groupId: string,
  fileId: string,
  fileName: string
): Promise<{ ok: true } | { ok: false; reason: 'empty' | 'gate' | 'load' }> {
  const gate = await getLanpmApi().ai?.getGateStatus()
  if (!gate?.enabled) return { ok: false, reason: 'gate' }

  const text = await loadPreviewText(fileId)
  if (!text?.trim()) return { ok: false, reason: 'load' }

  useAiAssistantStore.getState().openAssistant({
    groupId,
    context: {
      seedMarkdown: formatOpsLogSeedMarkdown(fileName, text),
      reportKind: 'opsLog'
    },
    layout: pickAssistantLayout(),
    entrySource: 'chat-ops'
  })
  return { ok: true }
}

export function openOpsTextInAssistant(
  groupId: string,
  text: string,
  label: string
): { ok: true } | { ok: false; reason: 'empty' | 'gate' } {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }

  useAiAssistantStore.getState().openAssistant({
    groupId,
    context: {
      seedMarkdown: formatOpsLogSeedMarkdown(label, trimmed),
      reportKind: 'opsStatus'
    },
    layout: pickAssistantLayout(),
    entrySource: 'chat-ops'
  })
  return { ok: true }
}
