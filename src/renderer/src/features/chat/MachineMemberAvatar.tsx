import { CloudServerOutlined } from '@ant-design/icons'
import styles from './chat.module.css'

interface Props {
  size?: number
  online: boolean
}

/** 运维机器成员头像（确定性图标，非 UserAvatar 色块） */
export default function MachineMemberAvatar({ size = 24, online }: Props): React.ReactElement {
  return (
    <span
      className={`${styles.memberMachineIcon} ${online ? '' : styles.memberMachineIconOffline}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.58) }}
      aria-hidden
    >
      <CloudServerOutlined />
    </span>
  )
}
