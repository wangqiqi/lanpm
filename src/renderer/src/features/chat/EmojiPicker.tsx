import { useState } from 'react'
import { Popover } from 'antd'
import ComposerIconButton from '@renderer/ui/ComposerIconButton'
import { SmileOutlined } from '@ant-design/icons'
import { useI18n } from '@renderer/i18n/useI18n'
import { EMOJI_GROUPS } from './emojiData'
import styles from './emojiPicker.module.css'

interface EmojiPickerProps {
  onPick: (emoji: string) => void
}

export default function EmojiPicker({ onPick }: EmojiPickerProps): React.ReactElement {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const content = (
    <div className={styles.panel} role="listbox" aria-label={t('chat.emojiPicker')}>
      {EMOJI_GROUPS.map((group) => (
        <div key={group.labelKey} className={styles.group}>
          <div className={styles.groupLabel}>{t(group.labelKey)}</div>
          <div className={styles.grid}>
            {group.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.emojiBtn}
                role="option"
                aria-label={emoji}
                onClick={() => {
                  onPick(emoji)
                  setOpen(false)
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="topLeft"
      destroyOnHidden
    >
      <ComposerIconButton icon={<SmileOutlined />} label={t('chat.emojiBtn')} />
    </Popover>
  )
}
