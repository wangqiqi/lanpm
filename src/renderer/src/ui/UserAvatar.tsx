import { Avatar } from 'antd'
import { resolveAvatarSrc } from '@shared/identity/avatar'

export interface UserAvatarProps {
  displayName: string
  userId?: string
  avatarUrl?: string | null
  size?: number | 'large' | 'small' | 'default'
  className?: string
  alt?: string
}

/** 统一消费头像：规范化 data URL + 缺省确定性色块 */
export default function UserAvatar({
  displayName,
  userId,
  avatarUrl,
  size = 36,
  className,
  alt
}: UserAvatarProps): React.ReactElement {
  const src = resolveAvatarSrc(avatarUrl, displayName, userId ?? displayName)
  return <Avatar className={className} size={size} src={src} alt={alt ?? displayName} />
}
