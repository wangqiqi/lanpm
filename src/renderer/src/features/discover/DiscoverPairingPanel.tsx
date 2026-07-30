import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Collapse, Input, List, Segmented, Space, Tag, Typography } from 'antd'
import type { InputRef } from 'antd'
import { ShareAltOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons'
import { formatPairingShareClipboard } from '@shared/discover/pairingShareClipboard'
import type { DiscoverSnapshot } from '@shared/discover/types'
import type { PairingSessionView } from '@shared/discover/pairing'
import type { GroupType } from '@shared/navigation/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './discover.module.css'
import NetworkHelpModal from './NetworkHelpModal'

const { Text, Title } = Typography

const GROUP_TYPE_KEYS: Record<GroupType, MessageKey> = {
  project: 'groupType.project',
  function: 'groupType.function',
  anonymous: 'groupType.anonymous'
}

export type PairingPanelMode = 'idle' | 'share' | 'find'

type PairingIdleRole = 'share' | 'join'

export type PairingJoinPayload = {
  snapshot: DiscoverSnapshot
  peerName: string
  groupCount: number
}

interface DiscoverPairingPanelProps {
  mode: PairingPanelMode
  onModeChange: (mode: PairingPanelMode) => void
  onPairingJoined: (payload: PairingJoinPayload) => void | Promise<void>
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6)
}

export default function DiscoverPairingPanel({
  mode,
  onModeChange,
  onPairingJoined
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
  const [netHelpOpen, setNetHelpOpen] = useState(false)
  const [countdownMs, setCountdownMs] = useState(0)
  const [idleRole, setIdleRole] = useState<PairingIdleRole>('share')
  const codeInputRef = useRef<InputRef>(null)

  useEffect(() => {
    if (mode === 'idle') {
      setSession(null)
      setFindCode('')
      setCrossSubnet(false)
      setSubnetScan(false)
      setUnicastHost('')
      setIdleRole('share')
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'find') return
    const id = window.setTimeout(() => codeInputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
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

  const runFind = useCallback(
    async (codeRaw: string): Promise<void> => {
      const code = digitsOnly(codeRaw)
      if (code.length < 6) return
      setFindLoading(true)
      try {
        const result = await getLanpmApi().pairing.join({
          code,
          crossSubnet,
          unicastHost: crossSubnet ? unicastHost.trim() || undefined : undefined,
          subnetScan: crossSubnet ? subnetScan : undefined
        })
        await onPairingJoined({
          snapshot: result.snapshot,
          peerName: result.join.displayName,
          groupCount: result.join.groupIds.length
        })
        onModeChange('idle')
      } catch (err) {
        message.error(formatError(err, 'discover.pairingJoinFailed'))
      } finally {
        setFindLoading(false)
      }
    },
    [crossSubnet, subnetScan, unicastHost, formatError, message, onModeChange, onPairingJoined]
  )

  const handleFind = (): void => {
    void runFind(findCode)
  }

  const handleCodeChange = (raw: string): void => {
    setFindCode(digitsOnly(raw))
  }

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    const pasted = e.clipboardData.getData('text')
    const code = digitsOnly(pasted)
    if (code.length !== 6) return
    e.preventDefault()
    setFindCode(code)
    void runFind(code)
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

  const handleCopyPairingInfo = async (): Promise<void> => {
    if (!session) return
    const text = formatPairingShareClipboard(
      {
        code: session.code,
        localIp: session.localIp,
        localIpTail: session.localIpTail,
        groupNames: session.groups.map((g) => g.name)
      },
      {
        lineCode: (code) => t('discover.copyPairingLineCode', { code }),
        lineIp: (ip) => t('discover.copyPairingLineIp', { ip }),
        lineIpTail: (tail, ip) => t('discover.copyPairingLineIpTail', { tail, ip }),
        lineGroups: (names) => t('discover.copyPairingLineGroups', { names })
      }
    )
    if (!text) {
      message.error(t('discover.copyPairingFailed'))
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      message.success(t('discover.copyPairingSuccess'))
    } catch {
      message.error(t('discover.copyPairingFailed'))
    }
  }

  const netHelpModal = (
    <NetworkHelpModal open={netHelpOpen} onClose={() => setNetHelpOpen(false)} />
  )

  const netHelpLink = (
    <Button
      type="link"
      size="small"
      className={styles.netHelpLink}
      onClick={() => setNetHelpOpen(true)}
      data-testid="discover-net-help-link"
    >
      {t('discover.netHelpLink')}
    </Button>
  )

  const codesExplainer = (
    <Alert
      type="info"
      showIcon
      className={styles.codesExplainer}
      message={t('discover.codesExplainer')}
      data-testid="discover-codes-explainer"
    />
  )

  if (mode === 'idle') {
    return (
      <>
        {codesExplainer}
        <Segmented<PairingIdleRole>
          className={styles.pairingRoleSegment}
          block
          value={idleRole}
          onChange={(value) => {
            const role = value as PairingIdleRole
            setIdleRole(role)
            if (role === 'join') onModeChange('find')
          }}
          options={[
            { label: t('discover.pairingRoleShare'), value: 'share' },
            { label: t('discover.pairingRoleJoin'), value: 'join' }
          ]}
          data-testid="discover-pairing-role"
        />
        {idleRole === 'share' ? (
          <Button
            type="primary"
            icon={<ShareAltOutlined />}
            loading={shareLoading}
            onClick={() => void handleStartShare()}
            data-testid="discover-share-pairing"
            block
            className={styles.pairingPrimaryAction}
          >
            {t('discover.sharePairingCode')}
          </Button>
        ) : null}
        {netHelpLink}
        {netHelpModal}
      </>
    )
  }

  if (mode === 'share' && session) {
    return (
      <>
        <div className={styles.pairingPanel}>
          <Title level={5} className={styles.pairingTitle}>
            {t('discover.pairingShareTitle')}
          </Title>
          {netHelpLink}
          <p className={styles.pairingCode} data-testid="discover-pairing-code-display">
            {session.codeDisplay}
          </p>
          <Text type="secondary" className={styles.pairingMeta} data-testid="discover-pairing-share-meta">
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
          <Space wrap>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => void handleCopyPairingInfo()}
              data-testid="discover-copy-pairing-info"
            >
              {t('discover.copyPairingInfo')}
            </Button>
            <Button onClick={() => void cancelShare()}>{t('discover.pairingCancel')}</Button>
            <Button
              icon={<DownloadOutlined />}
              loading={peerFileLoading}
              onClick={() => void handleExportPeerFile()}
            >
              {t('discover.exportPeerFile')}
            </Button>
          </Space>
        </div>
        {netHelpModal}
      </>
    )
  }

  return (
    <>
      <div className={styles.pairingPanel}>
        <Title level={5} className={styles.pairingTitle}>
          {t('discover.pairingFindTitle')}
        </Title>
        {netHelpLink}
        <Text type="secondary">{t('discover.pairingFindHint')}</Text>
        <Input
          ref={codeInputRef}
          className={styles.pairingCodeInput}
          placeholder={t('discover.pairingCodePlaceholder')}
          value={findCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          onPaste={handleCodePaste}
          onPressEnter={() => void handleFind()}
          maxLength={8}
          inputMode="numeric"
          autoComplete="one-time-code"
          data-testid="discover-pairing-code-input"
        />
        <Checkbox
          checked={crossSubnet}
          onChange={(e) => setCrossSubnet(e.target.checked)}
          data-testid="discover-pairing-cross-subnet"
        >
          {t('discover.pairingCrossSubnet')}
        </Checkbox>
        {crossSubnet ? (
          <>
            <Text type="secondary" className={styles.seedsHint}>
              {t('discover.pairingRouteHint')}
            </Text>
            <Input
              placeholder={t('discover.pairingHostPlaceholder')}
              value={unicastHost}
              onChange={(e) => setUnicastHost(e.target.value)}
              onPressEnter={() => void handleFind()}
              data-testid="discover-pairing-unicast-host"
            />
            <Text type="secondary" className={styles.seedsHint}>
              {t('discover.pairingTailHint')}
            </Text>
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'subnet-scan',
                  label: t('discover.pairingMoreOptions'),
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
                    </>
                  )
                }
              ]}
            />
          </>
        ) : null}
        <Space>
          <Button
            type="primary"
            loading={findLoading}
            onClick={() => void handleFind()}
            data-testid="discover-pairing-connect"
          >
            {t('discover.pairingConnect')}
          </Button>
          <Button onClick={() => onModeChange('idle')}>{t('common.cancel')}</Button>
        </Space>
      </div>
      {netHelpModal}
    </>
  )
}
