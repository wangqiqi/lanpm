import { useCallback, useEffect, useState } from 'react'
import { Alert, Avatar, Button, Collapse, Empty, Input, List, Modal, Space, Steps, Tabs, Tag, Typography } from 'antd'
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons'
import type { JoinRequestRecord } from '@shared/group/joinRequest'
import type { DiscoverGroupView, DiscoverPeerView, DiscoverSnapshot } from '@shared/discover/types'
import type { DiscoveryReasonCode } from '@shared/discover/discoveryHealth'
import { addDiscoverSeed, removeDiscoverSeed } from '@shared/discover/discoverSeeds'
import { pickSingleJoinableGroup } from '@shared/discover/joinableGroups'
import { groupAllowsDirectMessage } from '@shared/group/guards'
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
import DiscoverPairingPanel, {
  type PairingJoinPayload,
  type PairingPanelMode
} from './DiscoverPairingPanel'
import styles from './discover.module.css'

const { Text } = Typography

const GROUP_TYPE_KEYS: Record<GroupType, MessageKey> = {
  project: 'groupType.project',
  function: 'groupType.function',
  anonymous: 'groupType.anonymous'
}

const HEALTH_REASON_KEYS: Record<DiscoveryReasonCode, MessageKey> = {
  ok: 'discover.healthOk',
  bind_failed: 'discover.healthBindFailed',
  multicast_degraded: 'discover.healthMulticastDegraded',
  broadcast_failed: 'discover.healthBroadcastFailed',
  transport_offline: 'discover.healthEmpty',
  udp_disabled: 'discover.healthUdpDisabled',
  stub_mode: 'discover.healthStub'
}

interface DiscoverModalProps {
  open: boolean
  onClose: () => void
  onOpenManualPeer?: () => void
}

export default function DiscoverModal({
  open,
  onClose,
  onOpenManualPeer
}: DiscoverModalProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const joinGroup = useNavigationStore((s) => s.joinGroup)
  const openSession = useDmStore((s) => s.openSession)
  const [snapshot, setSnapshot] = useState<DiscoverSnapshot>({
    peers: [],
    groups: [],
    health: {
      reason: 'transport_offline',
      ok: true,
      suggestManualPeer: true,
      multicastOk: null
    },
    seeds: []
  })
  const [loading, setLoading] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<JoinRequestRecord[]>([])
  const [actingRequestId, setActingRequestId] = useState<string | null>(null)
  const [tab, setTab] = useState<'groups' | 'people'>('groups')
  const [seedInput, setSeedInput] = useState('')
  const [seedSaving, setSeedSaving] = useState(false)
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [inviteJoining, setInviteJoining] = useState(false)
  const [sharingInviteGroupId, setSharingInviteGroupId] = useState<string | null>(null)
  const [pairingMode, setPairingMode] = useState<PairingPanelMode>('idle')
  const [wizardStep, setWizardStep] = useState<'connect' | 'join'>('connect')
  const [pairingConnected, setPairingConnected] = useState(false)
  const [peerFileLoading, setPeerFileLoading] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [data, requests] = await Promise.all([
        getLanpmApi().discover.snapshot(),
        getLanpmApi().group.listJoinRequests()
      ])
      setSnapshot(data)
      setIncomingRequests(requests)
    } catch (err) {
      message.error(formatError(err, 'discover.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [message, formatError])

  useEffect(() => {
    if (!open) return
    const unsub = getLanpmApi().group.onJoinRequestsChanged(() => {
      void refresh()
    })
    return unsub
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    setTab('groups')
    setPairingMode('idle')
    setWizardStep('connect')
    setPairingConnected(false)
    void refresh()
    // TASK-8801: 不要依赖 refresh 身份；否则 snapshot 回调一变就把正在分享的连接码 UI 清掉
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随弹窗打开重置向导
  }, [open])

  const openGroup = useCallback((group: DiscoverGroupView): void => {
    navigate(groupViewPath(group.groupId, defaultViewForGroup(group.type)))
    onClose()
  }, [navigate, onClose])

  const handleJoinGroup = useCallback(
    async (group: DiscoverGroupView): Promise<boolean> => {
      if (group.joined) {
        openGroup(group)
        return true
      }
      setJoiningId(group.groupId)
      try {
        const nav = await joinGroup(group.groupId)
        message.success(t('discover.joinSuccess', { name: nav.name }))
        navigate(groupViewPath(nav.groupId, defaultViewForGroup(nav.type)))
        onClose()
        return true
      } catch (err) {
        if (err instanceof Error && (err as Error & { code?: string }).code === 'join_pending') {
          message.success(t('discover.joinRequestSent', { name: group.name }))
          await refresh()
          return true
        }
        message.error(formatError(err, 'discover.joinFailed'))
        return false
      } finally {
        setJoiningId(null)
      }
    },
    [formatError, joinGroup, message, navigate, onClose, openGroup, refresh, t]
  )

  const tryAutoJoinAfterSnapshot = useCallback(
    async (data: DiscoverSnapshot): Promise<void> => {
      setSnapshot(data)
      setTab('groups')
      const single = pickSingleJoinableGroup(data.groups)
      if (single) {
        await handleJoinGroup(single)
      }
    },
    [handleJoinGroup]
  )

  const handlePairingJoined = useCallback(
    async ({ snapshot: data, peerName, groupCount }: PairingJoinPayload): Promise<void> => {
      message.success(
        t('discover.pairingJoinSuccess', {
          name: peerName,
          count: groupCount
        })
      )
      setPairingConnected(true)
      const single = pickSingleJoinableGroup(data.groups)
      if (single) {
        await tryAutoJoinAfterSnapshot(data)
        return
      }
      setSnapshot(data)
      setTab('groups')
      setWizardStep('join')
    },
    [message, t, tryAutoJoinAfterSnapshot]
  )

  const handleImportPeerFile = async (): Promise<void> => {
    setPeerFileLoading(true)
    try {
      const result = await getLanpmApi().pairing.importPeerFileDialog()
      if (!result) return
      message.success(t('discover.peerFileImportSuccess', { name: result.file.displayName }))
      setPairingConnected(true)
      await tryAutoJoinAfterSnapshot(result.snapshot)
      setPairingMode('idle')
      setWizardStep('join')
    } catch (err) {
      message.error(formatError(err, 'discover.peerFileImportFailed'))
    } finally {
      setPeerFileLoading(false)
    }
  }

  const handleExportPeerFile = async (): Promise<void> => {
    setPeerFileLoading(true)
    try {
      const result = await getLanpmApi().pairing.exportPeerFileDialog()
      if (!result) return
      message.success(t('discover.peerFileExportSuccess', { path: result.path }))
    } catch (err) {
      message.error(formatError(err, 'discover.peerFileExportFailed'))
    } finally {
      setPeerFileLoading(false)
    }
  }

  const openManualPeerFlow = (): void => {
    onClose()
    onOpenManualPeer?.()
  }

  const persistSeeds = async (next: string[]): Promise<void> => {
    setSeedSaving(true)
    try {
      const data = await getLanpmApi().discover.setSeeds(next)
      setSnapshot(data)
      message.success(t('discover.seedsSaved'))
    } catch (err) {
      message.error(formatError(err, 'discover.seedsSaveFailed'))
    } finally {
      setSeedSaving(false)
    }
  }

  const handleAddSeed = (): void => {
    void persistSeeds(addDiscoverSeed(snapshot.seeds, seedInput)).then(() => setSeedInput(''))
  }

  const handleRemoveSeed = (address: string): void => {
    void persistSeeds(removeDiscoverSeed(snapshot.seeds, address))
  }

  const handleApproveRequest = async (requestId: string): Promise<void> => {
    setActingRequestId(requestId)
    try {
      await getLanpmApi().group.approveJoinRequest(requestId)
      message.success(t('discover.joinRequestApproved'))
      await refresh()
    } catch (err) {
      message.error(formatError(err, 'discover.joinRequestActionFailed'))
    } finally {
      setActingRequestId(null)
    }
  }

  const handleRejectRequest = async (requestId: string): Promise<void> => {
    setActingRequestId(requestId)
    try {
      await getLanpmApi().group.rejectJoinRequest(requestId)
      message.success(t('discover.joinRequestRejected'))
      await refresh()
    } catch (err) {
      message.error(formatError(err, 'discover.joinRequestActionFailed'))
    } finally {
      setActingRequestId(null)
    }
  }

  const handleJoinWithInvite = async (): Promise<void> => {
    const code = inviteCodeInput.trim()
    if (!code) return
    setInviteJoining(true)
    try {
      const result = await getLanpmApi().group.joinWithInvite({ code })
      if (result.status === 'joined' || result.status === 'already_member') {
        message.success(t('discover.groupInviteJoined', { name: result.group.name }))
        navigate(groupViewPath(result.group.groupId, defaultViewForGroup(result.group.type)))
        onClose()
        return
      }
      message.info(t('discover.joinPending'))
      await refresh()
    } catch (err) {
      message.error(formatError(err, 'discover.groupInviteFailed'))
    } finally {
      setInviteJoining(false)
    }
  }

  const handleShareInvite = async (group: DiscoverGroupView): Promise<void> => {
    setSharingInviteGroupId(group.groupId)
    try {
      const view = await getLanpmApi().group.startInvite(group.groupId)
      Modal.info({
        title: t('discover.shareInviteCode'),
        content: (
          <div>
            <p>{group.name}</p>
            <p className={styles.inviteCodeDisplay}>{view.codeDisplay}</p>
            <Text type="secondary">
              {t('discover.inviteCodeExpires', {
                at: new Date(view.expiresAt).toLocaleTimeString()
              })}
            </Text>
          </div>
        )
      })
    } catch (err) {
      message.error(formatError(err, 'discover.groupInviteShareFailed'))
    } finally {
      setSharingInviteGroupId(null)
    }
  }

  const dmOriginGroupId = activeGroupId.startsWith('dm:')
    ? useDmStore.getState().lastOriginGroupId
    : activeGroupId
  const dmOriginAllowed = groupAllowsDirectMessage(getGroupType(dmOriginGroupId))

  const startDm = (peer: DiscoverPeerView): void => {
    if (!localUserId) return
    if (!dmOriginAllowed) {
      message.warning(t('chat.dmNotAllowedAnonymous'))
      return
    }
    const dmGroupId = openSession(
      peer.userId,
      peer.displayName,
      localUserId,
      dmOriginGroupId,
      getGroupType(dmOriginGroupId)
    )
    if (!dmGroupId) return
    navigate(groupViewPath(dmGroupId, 'chat'))
    onClose()
  }

  const health = snapshot.health
  const showHealthAlert = health.reason !== 'ok' || health.suggestManualPeer
  const joinableGroups = snapshot.groups.filter((g) => !g.joined && !g.joinPending)
  const singleJoinableGroup = joinableGroups.length === 1 ? joinableGroups[0]! : null
  const hasConnectedSignal =
    pairingConnected || snapshot.groups.length > 0 || snapshot.peers.length > 0
  const joinStepEmpty =
    snapshot.groups.length === 0 && snapshot.peers.length === 0 && incomingRequests.length === 0

  const goConnectStep = useCallback((findMode = false): void => {
    setWizardStep('connect')
    setPairingMode(findMode ? 'find' : 'idle')
  }, [])

  return (
    <Modal
      title={t('discover.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={560}
      className={styles.modal}
      data-testid="discover-modal"
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

      <Steps
        size="small"
        className={styles.wizardSteps}
        current={wizardStep === 'connect' ? 0 : 1}
        onChange={(current) => setWizardStep(current === 0 ? 'connect' : 'join')}
        data-testid="discover-wizard-steps"
        items={[
          { title: t('discover.wizardConnect') },
          { title: t('discover.wizardJoin') }
        ]}
      />

      {wizardStep === 'connect' ? (
        <>
      {showHealthAlert ? (
        <Alert
          className={styles.healthAlert}
          type={health.ok ? 'info' : 'warning'}
          showIcon
          message={t(HEALTH_REASON_KEYS[health.reason])}
          description={
            health.suggestManualPeer && onOpenManualPeer ? (
              <Button size="small" type="primary" onClick={openManualPeerFlow} data-testid="discover-connect-peer-cta">
                {t('discover.connectPeerCta')}
              </Button>
            ) : null
          }
        />
      ) : null}

      <DiscoverPairingPanel
        mode={pairingMode}
        onModeChange={setPairingMode}
        onPairingJoined={handlePairingJoined}
      />

      {incomingRequests.length > 0 ? (
        <Alert
          className={styles.singleGroupAlert}
          type="info"
          showIcon
          message={t('discover.incomingJoinRequests')}
          action={
            <Button size="small" type="primary" onClick={() => setWizardStep('join')}>
              {t('discover.wizardJoin')}
            </Button>
          }
        />
      ) : null}

      <Collapse
        className={styles.advancedCollapse}
        items={[
          {
            key: 'advanced',
            label: t('discover.advancedTitle'),
            children: (
              <>
                <div className={styles.seedsBlock}>
                  <Text strong>{t('discover.advancedPeerFileTitle')}</Text>
                  <Text type="secondary" className={styles.seedsHint}>
                    {t('discover.advancedPeerFileHint')}
                  </Text>
                  <Space wrap>
                    <Button
                      icon={<UploadOutlined />}
                      loading={peerFileLoading}
                      onClick={() => void handleImportPeerFile()}
                      data-testid="discover-import-peer-file"
                    >
                      {t('discover.importPeerFile')}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      loading={peerFileLoading}
                      onClick={() => void handleExportPeerFile()}
                      data-testid="discover-export-peer-file"
                    >
                      {t('discover.exportPeerFile')}
                    </Button>
                  </Space>
                </div>
                <div className={styles.seedsBlock}>
                  <Text strong>{t('discover.seedsTitle')}</Text>
                  <Text type="secondary" className={styles.seedsHint}>
                    {t('discover.seedsHint')}
                  </Text>
                  <Space.Compact className={styles.seedsInput}>
                    <Input
                      placeholder={t('discover.seedsPlaceholder')}
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      onPressEnter={handleAddSeed}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      loading={seedSaving}
                      onClick={handleAddSeed}
                    >
                      {t('discover.seedsAdd')}
                    </Button>
                  </Space.Compact>
                  {snapshot.seeds.length > 0 ? (
                    <Space size={[4, 4]} wrap className={styles.seedTags}>
                      {snapshot.seeds.map((seed) => (
                        <Tag key={seed} closable onClose={() => handleRemoveSeed(seed)}>
                          {seed}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">{t('discover.seedsEmpty')}</Text>
                  )}
                </div>
                <div className={styles.seedsBlock}>
                  <Text strong>{t('discover.groupInviteTitle')}</Text>
                  <Text type="secondary" className={styles.seedsHint}>
                    {t('discover.groupInviteHint')}
                  </Text>
                  <Space.Compact className={styles.seedsInput}>
                    <Input
                      placeholder={t('discover.groupInvitePlaceholder')}
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      onPressEnter={() => void handleJoinWithInvite()}
                    />
                    <Button
                      type="primary"
                      loading={inviteJoining}
                      onClick={() => void handleJoinWithInvite()}
                    >
                      {t('discover.groupInviteJoin')}
                    </Button>
                  </Space.Compact>
                </div>
              </>
            )
          }
        ]}
      />

      {snapshot.groups.length > 0 ? (
        <Button
          type="primary"
          className={styles.wizardContinue}
          data-testid="discover-wizard-to-join"
          onClick={() => setWizardStep('join')}
        >
          {t('discover.wizardContinueJoin')}
        </Button>
      ) : null}
        </>
      ) : (
        <>
      {joinStepEmpty ? (
        <Alert
          className={styles.wizardGuideAlert}
          type={hasConnectedSignal ? 'info' : 'warning'}
          showIcon
          data-testid="discover-wizard-join-guide"
          message={t('discover.wizardJoinNeedConnect')}
          action={
            <Button
              size="small"
              type="primary"
              data-testid="discover-wizard-back-connect"
              onClick={() => goConnectStep()}
            >
              {t('discover.wizardBackConnect')}
            </Button>
          }
        />
      ) : null}

      {singleJoinableGroup ? (
        <Alert
          className={styles.singleGroupAlert}
          type="info"
          showIcon
          message={t('discover.singleGroupHint', { name: singleJoinableGroup.name })}
          action={
            <Button
              size="small"
              type="primary"
              loading={joiningId === singleJoinableGroup.groupId}
              onClick={() => void handleJoinGroup(singleJoinableGroup)}
            >
              {t('discover.requestJoinNamed', { name: singleJoinableGroup.name })}
            </Button>
          }
        />
      ) : null}

      {incomingRequests.length > 0 ? (
        <div className={styles.seedsBlock}>
          <Text strong>{t('discover.incomingJoinRequests')}</Text>
          <List
            className={styles.list}
            dataSource={incomingRequests}
            renderItem={(req) => (
              <List.Item
                className={styles.row}
                actions={[
                  <Button
                    key="approve"
                    type="primary"
                    size="small"
                    loading={actingRequestId === req.requestId}
                    onClick={() => void handleApproveRequest(req.requestId)}
                  >
                    {t('discover.approveJoin')}
                  </Button>,
                  <Button
                    key="reject"
                    size="small"
                    loading={actingRequestId === req.requestId}
                    onClick={() => void handleRejectRequest(req.requestId)}
                  >
                    {t('discover.rejectJoin')}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={req.applicantDisplayName}
                  description={t('discover.joinRequestForGroup', { groupId: req.groupId })}
                />
              </List.Item>
            )}
          />
        </div>
      ) : null}

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'groups' | 'people')}
        items={[
          {
            key: 'groups',
            label: t('discover.tabGroups'),
            children: snapshot.groups.length === 0 ? (
              <Empty description={t('discover.emptyGroups')}>
                <Button
                  type="primary"
                  data-testid="discover-wizard-empty-back"
                  onClick={() => goConnectStep(true)}
                >
                  {t('discover.findGroupsByCode')}
                </Button>
              </Empty>
            ) : (
              <List
                className={styles.list}
                dataSource={snapshot.groups}
                renderItem={(group) => (
                  <List.Item
                    className={styles.row}
                    actions={[
                      group.joined && group.ownerUserId === localUserId ? (
                        <Button
                          key="invite"
                          size="small"
                          loading={sharingInviteGroupId === group.groupId}
                          onClick={() => void handleShareInvite(group)}
                        >
                          {t('discover.shareInviteCode')}
                        </Button>
                      ) : null,
                      <Button
                        key="action"
                        type={group.joined ? 'default' : 'primary'}
                        size="small"
                        loading={joiningId === group.groupId}
                        disabled={group.joinPending}
                        onClick={() => void handleJoinGroup(group)}
                      >
                        {group.joined
                          ? t('discover.open')
                          : group.joinPending
                            ? t('discover.joinPending')
                            : t('discover.requestJoin')}
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
                    className={`${styles.row} ${dmOriginAllowed ? styles.rowClickable : ''}`}
                    onClick={dmOriginAllowed ? () => startDm(peer) : undefined}
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
                      {dmOriginAllowed ? t('discover.chatHint') : t('chat.dmNotAllowedAnonymous')}
                    </Text>
                  </List.Item>
                )}
              />
            )
          }
        ]}
      />
        </>
      )}
    </Modal>
  )
}
