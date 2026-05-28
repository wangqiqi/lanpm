import { useEffect, useMemo, useState } from 'react'
import type { GroupMemberView } from '@shared/chat/members'
import styles from './chat.module.css'

interface MentionSuggestProps {
  draft: string
  members: GroupMemberView[]
  onPick: (displayName: string) => void
}

/** 输入 `@` 后展示成员候选 */
export default function MentionSuggest({
  draft,
  members,
  onPick
}: MentionSuggestProps): React.ReactElement | null {
  const [activeIndex, setActiveIndex] = useState(0)

  const query = useMemo(() => {
    const match = /(?:^|\s)@([^\s@]*)$/.exec(draft)
    return match ? match[1]!.toLowerCase() : null
  }, [draft])

  const candidates = useMemo(() => {
    if (query === null) return []
    return members.filter((m) => {
      const name = m.displayName.toLowerCase()
      const id = m.userId.toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }, [members, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, candidates.length])

  if (query === null || candidates.length === 0) return null

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
          <span className={styles.mentionOptionId}>{member.userId}</span>
        </button>
      ))}
    </div>
  )
}
