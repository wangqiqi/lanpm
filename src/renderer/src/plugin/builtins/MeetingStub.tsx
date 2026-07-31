import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import MeetingToolbar from './MeetingToolbar'

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.meeting` — 聊天工具条宿主 */
export default function MeetingStub({ plugin, groupId, context }: Props): React.ReactElement | null {
  return <MeetingToolbar plugin={plugin} groupId={groupId} context={context} />
}
