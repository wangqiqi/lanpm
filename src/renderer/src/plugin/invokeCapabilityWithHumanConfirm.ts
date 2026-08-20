import type { PluginCapabilityId } from '@shared/plugin/types'
import { isCapabilityPendingConfirm } from '@shared/plugin/capabilityConfirm'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { Modal } from 'antd'

export type HumanConfirmCopy = {
  title: string
  content: string
  okText: string
  cancelText: string
}

/**
 * Invoke a capability; if Host returns pending_confirm, show Modal then confirmCapability.
 * Returns null when the user cancels the Modal.
 */
export async function invokeCapabilityWithHumanConfirm(
  pluginId: string,
  capability: PluginCapabilityId,
  args: Record<string, unknown>,
  copy: HumanConfirmCopy
): Promise<unknown | null> {
  const raw = await getLanpmApi().plugin.invokeCapability(pluginId, capability, args)
  if (!isCapabilityPendingConfirm(raw)) return raw

  return await new Promise<unknown | null>((resolve, reject) => {
    Modal.confirm({
      title: copy.title,
      content: raw.detail
        ? `${copy.content}\n\n${raw.detail}`
        : copy.content,
      okText: copy.okText,
      cancelText: copy.cancelText,
      onOk: async () => {
        try {
          const result = await getLanpmApi().plugin.confirmCapability(pluginId, raw.pendingId)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      },
      onCancel: () => {
        resolve(null)
      }
    })
  })
}
