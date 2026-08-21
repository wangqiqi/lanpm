import { useState } from 'react'
import { Popover } from 'antd'
import data from '@emoji-mart/data'
import MartPicker from '@emoji-mart/react'
import ComposerIconButton from '@renderer/ui/ComposerIconButton'
import { SmileOutlined } from '@ant-design/icons'
import { useI18n } from '@renderer/i18n/useI18n'
import { useUiStore } from '@renderer/stores/uiStore'
import styles from './emojiPicker.module.css'

interface EmojiPickerProps {
  onPick: (emoji: string) => void
}

function martLocale(appLocale: string): 'zh' | 'en' {
  return appLocale.startsWith('zh') ? 'zh' : 'en'
}

export default function EmojiPicker({ onPick }: EmojiPickerProps): React.ReactElement {
  const { t, locale } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const [open, setOpen] = useState(false)

  const content = (
    <div className={styles.panel} aria-label={t('chat.emojiPicker')}>
      <MartPicker
        data={data}
        theme={theme}
        locale={martLocale(locale)}
        set="native"
        previewPosition="none"
        onEmojiSelect={(emoji: { native?: string }) => {
          if (!emoji.native) return
          onPick(emoji.native)
          setOpen(false)
        }}
      />
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
      <span className={styles.trigger}>
        <ComposerIconButton icon={<SmileOutlined />} label={t('chat.emojiBtn')} />
      </span>
    </Popover>
  )
}
