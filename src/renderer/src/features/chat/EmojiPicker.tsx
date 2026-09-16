import { lazy, Suspense, useEffect, useState } from 'react'
import { Popover } from 'antd'
import ComposerIconButton from '@renderer/ui/ComposerIconButton'
import { SmileOutlined } from '@ant-design/icons'
import { useI18n } from '@renderer/i18n/useI18n'
import { useUiStore } from '@renderer/stores/uiStore'
import styles from './emojiPicker.module.css'

const MartPicker = lazy(() => import('@emoji-mart/react'))

interface EmojiPickerProps {
  onPick: (emoji: string) => void
}

function martLocale(appLocale: string): 'zh' | 'en' {
  return appLocale.startsWith('zh') ? 'zh' : 'en'
}

function EmojiMartPanel({
  onPick,
  theme,
  locale,
  ariaLabel
}: {
  onPick: (emoji: string) => void
  theme: string
  locale: 'zh' | 'en'
  ariaLabel: string
}): React.ReactElement {
  const [data, setData] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    void import('@emoji-mart/data').then((mod) => {
      if (!cancelled) setData(mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) {
    return <div className={styles.panel} aria-label={ariaLabel} />
  }

  return (
    <div className={styles.panel} aria-label={ariaLabel}>
      <MartPicker
        data={data}
        theme={theme}
        locale={locale}
        set="native"
        previewPosition="none"
        onEmojiSelect={(emoji: { native?: string }) => {
          if (!emoji.native) return
          onPick(emoji.native)
        }}
      />
    </div>
  )
}

export default function EmojiPicker({ onPick }: EmojiPickerProps): React.ReactElement {
  const { t, locale } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const [open, setOpen] = useState(false)

  const content = open ? (
    <Suspense fallback={<div className={styles.panel} aria-label={t('chat.emojiPicker')} />}>
      <EmojiMartPanel
        ariaLabel={t('chat.emojiPicker')}
        theme={theme}
        locale={martLocale(locale)}
        onPick={(emoji) => {
          onPick(emoji)
          setOpen(false)
        }}
      />
    </Suspense>
  ) : null

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
