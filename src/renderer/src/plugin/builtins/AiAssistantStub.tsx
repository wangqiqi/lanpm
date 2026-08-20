import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.ai-assistant` — TopBar 已有原生「AI 助手」入口；槽位占位避免未知插件文案。 */
export default function AiAssistantStub(_props: Props): null {
  void _props
  return null
}
