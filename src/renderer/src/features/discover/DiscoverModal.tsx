import { useCallback, useEffect, useState } from 'react'
import { Avatar, Button, Empty, List, Modal, Tabs, Tag, Typography } from 'antd'
import { ReloadOutlined, UserOutlined } from '@ant-design/icons'
import type { DiscoverGroupView, DiscoverPeerView, DiscoverSnapshot } from '@shared/discover/types'
import type { GroupType } from '@shared/navigation/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { defaultViewForGroup } from '@shared/navigation/tabRules'
import { groupViewPath } from '@renderer/routes/paths'
import { useNavigate } from 'react-router-dom'
import styles from './discover.module.css'

const { Text } = Typography

const GROUP_TYPE_KEYS: Record<GroupType, MessageKey> = {
  project: 'groupType.project',
  function: 'groupType.function',
  anonymous: 'groupType.anonymous'
}

interface DiscoverModalProps {
  open: boolean
  onClose: () => void
}

export default function DiscoverModal({ open, onClose }: DiscoverModalProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const joinGroup = useNavigationStore((s) => s.joinGroup)
  const openSession = useDmStore((s) => s.openSession)
  const [snapshot, setSnapshot] = useState<DiscoverSnapshot>({ peers: [], groups: [] })
  const [loading, setLoading] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [tab, setTab] = useState<'groups' | 'people'>('groups')

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await getLanpmApi().discover.snapshot()
      setSnapshot(data)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('discover.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [message, t])

  useEffect(() => {
    if (!open) return
    setTab('groups')
    void refresh()
  }, [open, refresh])

  const openGroup = (group: DiscoverGroupView): void => {
    navigate(groupViewPath(group.groupId, defaultViewForGroup(group.type)))
    onClose()
  }

  const handleJoinGroup = async (group: DiscoverGroupView): Promise<void> => {
    if (group.joined) {
      openGroup(group)
      return
    }
    setJoiningId(group.groupId)
    try {
      const nav = await joinGroup(group.groupId)
      message.success(t('discover.joinSuccess', { name: nav.name }))
      navigate(groupViewPath(nav.groupId, defaultViewForGroup(nav.type)))
      onClose()
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('discover.joinFailed'))
    } finally {
      setJoiningId(null)
    }
  }

  const startDm = (peer: DiscoverPeerView): void => {
    if (!localUserId) return
    const originGroupId = activeGroupId.startsWith('dm:')
      ? useDmStore.getState().lastOriginGroupId
      : activeGroupId
    const dmGroupId = openSession(peer.userId, peer.displayName, localUserId, originGroupId)
    navigate(groupViewPath(dmGroupId, 'chat'))
    onClose()
  }

  return (
    <Modal
      title={t('discover.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={560}
      className={styles.modal}
    >
      <div className={styles.toolbar}>
        <Text type="secondary">{t('discover.hint')}</Text>
        <Button
          type="text"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void refresh()}
        >
          {t('discover.refresh')}
        </Button>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'groups' | 'people')}
        items={[
          {
            key: 'groups',
            label: t('discover.tabGroups'),
            children: snapshot.groups.length === 0 ? (
              <Empty description={t('discover.emptyGroups')} />
            ) : (
              <List
                className={styles.list}
                dataSource={snapshot.groups}
                renderItem={(group) => (
                  <List.Item
                    className={styles.row}
                    actions={[
                      <Button
                        key="action"
                        type={group.joined ? 'default' : 'primary'}
                        size="small"
                        loading={joiningId === group.groupId}
                        onClick={() => void handleJoinGroup(group)}
                      >
                        {group.joined ? t('discover.open') : t('discover.join')}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span className={styles.rowTitle}>
                          {group.name}{' '}
                          <Tag className={styles.typeTag}>{t(GROUP_TYPE_KEYS[group.type])}</Tag>
                        </span>
                      }
                      description={t('discover.owner', { name: group.ownerDisplayName })}
                    />
                  </List.Item>
                )}
              />
            )
          },
          {
            key: 'people',
            label: t('discover.tabPeople'),
            children: snapshot.peers.length === 0 ? (
              <Empty description={t('discover.emptyPeople')} />
            ) : (
              <List
                className={styles.list}
                dataSource={snapshot.peers}
                renderItem={(peer) => (
                  <List.Item
                    className={`${styles.row} ${styles.rowClickable}`}
                    onClick={() => startDm(peer)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar icon={<UserOutlined />} className={styles.peerAvatar}>
                          {peer.displayName.slice(0, 1)}
                        </Avatar>
                      }
                      title={
                        <span className={styles.rowTitle}>
                          {peer.displayName}
                          {peer.online ? (
                            <span className={styles.onlineDot} title={t('presence.online')} />
                          ) : null}
                        </span>
                      }
                      description={t('discover.devices', { count: peer.deviceCount })}
                    />
                    <Text type="secondary" className={styles.dmHint}>
                      {t('discover.chatHint')}
                    </Text>
                  </List.Item>
                )}
              />
            )
          }
        ]}
      />
    </Modal>
  )
}
