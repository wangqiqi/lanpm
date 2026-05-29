import type { GroupMemberView } from '@shared/chat/members'
import styles from './chat.module.css'

interface MentionSuggestProps {
  candidates: GroupMemberView[]
  activeIndex: number
  onPick: (displayName: string) => void
}

export default function MentionSuggest({
  candidates,
  activeIndex,
  onPick
}: MentionSuggestProps): React.ReactElement | null {
  if (candidates.length === 0) return null

  return (
    <div className={styles.mentionSuggest} role="listbox">
      {candidates.map((member, idx) => (
        <button
          key={member.userId}
          type="button"
          role="option"
          aria-selected={idx === activeIndex}
          className={`${styles.mentionOption} ${idx === activeIndex ? styles.mentionOptionActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(member.displayName)
          }}
        >
          @{member.displayName}
        </button>
      ))}
    </div>
  )
}
