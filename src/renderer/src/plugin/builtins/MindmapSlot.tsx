import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import MindmapToolbar from './MindmapToolbar'

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.mindmap` — mindmap.toolbar slot host */
export default function MindmapSlot({ plugin, groupId }: Props): React.ReactElement {
  return <MindmapToolbar plugin={plugin} groupId={groupId} />
}
