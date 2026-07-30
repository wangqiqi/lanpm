import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Collapse, Input, List, Space, Tag, Typography } from 'antd'
import { ShareAltOutlined, LinkOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import type { DiscoverSnapshot } from '@shared/discover/types'
import type { PairingSessionView } from '@shared/discover/pairing'
import type { GroupType } from '@shared/navigation/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './discover.module.css'

const { Text, Title } = Typography

const GROUP_TYPE_KEYS: Record<GroupType, MessageKey> = {
  project: 'groupType.project',
  function: 'groupType.function',
  anonymous: 'groupType.anonymous'
}

export type PairingPanelMode = 'idle' | 'share' | 'find'

interface DiscoverPairingPanelProps {
  mode: PairingPanelMode
  onModeChange: (mode: PairingPanelMode) => void
  onSnapshot: (snapshot: DiscoverSnapshot) => void
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function DiscoverPairingPanel({
  mode,
  onModeChange,
  onSnapshot
}: DiscoverPairingPanelProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const [session, setSession] = useState<PairingSessionView | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [findCode, setFindCode] = useState('')
  const [crossSubnet, setCrossSubnet] = useState(false)
  const [subnetScan, setSubnetScan] = useState(false)
  const [unicastHost, setUnicastHost] = useState('')
  const [findLoading, setFindLoading] = useState(false)
  const [peerFileLoading, setPeerFileLoading] = useState(false)
  const [countdownMs, setCountdownMs] = useState(0)

  useEffect(() => {
    if (mode === 'idle') {
      setSession(null)
      setFindCode('')
      setCrossSubnet(false)
      setSubnetScan(false)
      setUnicastHost('')
    }
  }, [mode])

  useEffect(() => {
    if (!session) return
    const expiresAt = new Date(session.expiresAt).getTime()
    const tick = (): void => {
      const left = expiresAt - Date.now()
      setCountdownMs(left)
      if (left <= 0) {
        void getLanpmApi()
          .pairing.cancel()
          .catch(() => undefined)
          .finally(() => {
            setSession(null)
            onModeChange('idle')
          })
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session, onModeChange])

  const cancelShare = async (): Promise<void> => {
    try {
      await getLanpmApi().pairing.cancel()
    } catch {
      // ignore
    }
    setSession(null)
    onModeChange('idle')
  }

  const handleStartShare = async (): Promise<void> => {
    setShareLoading(true)
    try {
      const view = await getLanpmApi().pairing.start()
      setSession(view)
      onModeChange('share')
    } catch (err) {
      message.error(formatError(err, 'discover.pairingShareFailed'))
    } finally {
      setShareLoading(false)
    }
  }

  const handleFind = async (): Promise<void> => {
    const code = findCode.trim()
    if (!code) return
    setFindLoading(true)
    try {
      const result = await getLanpmApi().pairing.join({
        code,
        crossSubnet,
        unicastHost: crossSubnet ? unicastHost.trim() || undefined : undefined,
        subnetScan: crossSubnet ? subnetScan : undefined
      })
      onSnapshot(result.snapshot)
      message.success(
        t('discover.pairingJoinSuccess', {
          name: result.join.displayName,
          count: result.join.groupIds.length
        })
      )
      onModeChange('idle')
    } catch (err) {
      message.error(formatError(err, 'discover.pairingJoinFailed'))
    } finally {
      setFindLoading(false)
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

  const handleImportPeerFile = async (): Promise<void> => {
    setPeerFileLoading(true)
    try {
      const result = await getLanpmApi().pairing.importPeerFileDialog()
      if (!result) return
      onSnapshot(result.snapshot)
      message.success(
        t('discover.peerFileImportSuccess', { name: result.file.displayName })
      )
      onModeChange('idle')
    } catch (err) {
      message.error(formatError(err, 'discover.peerFileImportFailed'))
    } finally {
      setPeerFileLoading(false)
    }
  }

  if (mode === 'idle') {
    return (
      <Space wrap className={styles.pairingActions}>
        <Button
          type="primary"
          icon={<ShareAltOutlined />}
          loading={shareLoading}
          onClick={() => void handleStartShare()}
        >
          {t('discover.sharePairingCode')}
        </Button>
        <Button icon={<LinkOutlined />} onClick={() => onModeChange('find')}>
          {t('discover.findGroupsByCode')}
        </Button>
        <Button
          icon={<UploadOutlined />}
          loading={peerFileLoading}
          onClick={() => void handleImportPeerFile()}
        >
          {t('discover.importPeerFile')}
        </Button>
      </Space>
    )
  }

  if (mode === 'share' && session) {
    return (
      <div className={styles.pairingPanel}>
        <Title level={5} className={styles.pairingTitle}>
          {t('discover.pairingShareTitle')}
        </Title>
        <p className={styles.pairingCode}>{session.codeDisplay}</p>
        <Text type="secondary" className={styles.pairingMeta}>
          {t('discover.pairingExpires', { time: formatCountdown(countdownMs) })}
          {session.localIp ? (
            <>
              {' · '}
              {session.localIpTail
                ? t('discover.pairingHostTail', { tail: session.localIpTail, ip: session.localIp })
                : session.localIp}
            </>
          ) : null}
        </Text>
        {session.groups.length > 0 ? (
          <List
            size="small"
            className={styles.pairingGroupList}
            dataSource={session.groups}
            renderItem={(group) => (
              <List.Item>
                <Text>
                  {group.name}{' '}
                  <Tag className={styles.typeTag}>{t(GROUP_TYPE_KEYS[group.type])}</Tag>
                </Text>
              </List.Item>
            )}
          />
        ) : (
          <Alert type="info" showIcon message={t('discover.pairingNoDiscoverableGroups')} />
        )}
        <Button onClick={() => void cancelShare()}>{t('discover.pairingCancel')}</Button>
        <Button
          icon={<DownloadOutlined />}
          loading={peerFileLoading}
          onClick={() => void handleExportPeerFile()}
        >
          {t('discover.exportPeerFile')}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.pairingPanel}>
      <Title level={5} className={styles.pairingTitle}>
        {t('discover.pairingFindTitle')}
      </Title>
      <Text type="secondary">{t('discover.pairingFindHint')}</Text>
      <Input
        className={styles.pairingCodeInput}
        placeholder={t('discover.pairingCodePlaceholder')}
        value={findCode}
        onChange={(e) => setFindCode(e.target.value)}
        onPressEnter={() => void handleFind()}
        maxLength={8}
      />
      <Checkbox checked={crossSubnet} onChange={(e) => setCrossSubnet(e.target.checked)}>
        {t('discover.pairingCrossSubnet')}
      </Checkbox>
      {crossSubnet ? (
        <Text type="secondary" className={styles.seedsHint}>
          {t('discover.pairingRouteHint')}
        </Text>
      ) : null}
      {crossSubnet ? (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'advanced-host',
              label: t('discover.pairingAdvancedHost'),
              children: (
                <>
                  <Checkbox
                    checked={subnetScan}
                    onChange={(e) => setSubnetScan(e.target.checked)}
                  >
                    {t('discover.pairingSubnetScan')}
                  </Checkbox>
                  <Text type="secondary" className={styles.seedsHint}>
                    {t('discover.pairingSubnetScanHint')}
                  </Text>
                  <Input
                    placeholder={t('discover.pairingHostPlaceholder')}
                    value={unicastHost}
                    onChange={(e) => setUnicastHost(e.target.value)}
                    onPressEnter={() => void handleFind()}
                  />
                  <Text type="secondary" className={styles.seedsHint}>
                    {t('discover.pairingTailHint')}
                  </Text>
                </>
              )
            }
          ]}
        />
      ) : null}
      <Space>
        <Button type="primary" loading={findLoading} onClick={() => void handleFind()}>
          {t('discover.pairingConnect')}
        </Button>
        <Button onClick={() => onModeChange('idle')}>{t('common.cancel')}</Button>
      </Space>
    </div>
  )
}
