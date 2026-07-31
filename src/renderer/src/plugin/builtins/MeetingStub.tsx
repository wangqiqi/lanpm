import type { PluginView } from '@shared/plugin/types'
import MeetingToolbar from './MeetingToolbar'

interface Props {
  plugin: PluginView
  groupId: string
}

/** `lanpm.meeting` — 聊天工具条宿主 */
export default function MeetingStub({ plugin, groupId }: Props): React.ReactElement {
  return <MeetingToolbar plugin={plugin} groupId={groupId} />
}
