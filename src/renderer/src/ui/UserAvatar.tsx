import { Avatar } from 'antd'
import { resolveAvatarSrc } from '@shared/identity/avatar'

export interface UserAvatarProps {
  displayName: string
  userId?: string
  avatarUrl?: string | null
  size?: number | 'large' | 'small' | 'default'
  className?: string
  alt?: string
  /** 离屏时跳过图片解码，仅显示字母占位 */
  deferImage?: boolean
}

/** 统一消费头像：规范化 data URL + 缺省确定性色块 */
export default function UserAvatar({
  displayName,
  userId,
  avatarUrl,
  size = 36,
  className,
  alt,
  deferImage = false
}: UserAvatarProps): React.ReactElement {
  if (deferImage) {
    const initial = displayName.trim().charAt(0).toUpperCase() || '?'
    return (
      <Avatar className={className} size={size} alt={alt ?? displayName} data-deferred-avatar="1">
        {initial}
      </Avatar>
    )
  }
  const src = resolveAvatarSrc(avatarUrl, displayName, userId ?? displayName)
  return <Avatar className={className} size={size} src={src} alt={alt ?? displayName} />
}
