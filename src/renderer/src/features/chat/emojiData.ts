/** 常用表情（P1-CHAT-01）；按类别分行展示 */
export const EMOJI_GROUPS: {
  labelKey: 'chat.emojiSmileys' | 'chat.emojiGestures'
  emojis: string[]
}[] = [
  {
    labelKey: 'chat.emojiSmileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😘', '😎', '🤔', '😮', '😢', '😭', '😡', '👍', '👎', '👏', '🙏', '❤️', '🔥', '✅', '❌', '⭐', '🎉', '💡']
  },
  {
    labelKey: 'chat.emojiGestures',
    emojis: ['👋', '🤝', '✌️', '🤞', '👌', '🤙', '💪', '🫡', '🙌', '👀', '💯', '🆗', '🆕', '📌', '📎', '📝', '✏️', '📋', '📁', '📂', '🔗', '⏰', '📅', '🚀', '💻', '🐛', '⚠️', '❓', '❗', '💬']
  }
]
