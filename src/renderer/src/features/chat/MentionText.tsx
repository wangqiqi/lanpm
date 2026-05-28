import type { GroupMemberView } from '@shared/chat/members'
import { splitMentionSegments } from '@shared/chat/mentions'
import styles from './chat.module.css'

interface MentionTextProps {
  text: string
  members: GroupMemberView[]
  own?: boolean
}

export default function MentionText({ text, members, own }: MentionTextProps): React.ReactElement {
  const segments = splitMentionSegments(text, members)
  return (
    <span>
      {segments.map((seg, i) =>
        seg.kind === 'mention' ? (
          <span
            key={`${i}-${seg.value}`}
            className={own ? styles.mentionOwn : styles.mention}
            title={seg.userId}
          >
            {seg.value}
          </span>
        ) : (
          <span key={`${i}-t`}>{seg.value}</span>
        )
      )}
    </span>
  )
}
