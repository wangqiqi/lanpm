import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography
} from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { CopyOutlined, KeyOutlined, RobotOutlined } from '@ant-design/icons'
import type { AiConfigView, AiReportResult, CockpitDashboard } from '@shared/cockpit/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath } from '@renderer/routes/paths'
import AiConfigModal from '@renderer/features/cockpit/AiConfigModal'
import ViewHeader from '@renderer/ui/ViewHeader'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './CockpitView.module.css'

const { Text, Paragraph } = Typography

const STATUS_KEYS: Record<string, { color: string; key: MessageKey }> = {
  normal: { color: 'success', key: 'cockpit.statusNormal' },
  risk: { color: 'warning', key: 'cockpit.statusRisk' },
  delayed: { color: 'error', key: 'cockpit.statusDelayed' }
}

export default function CockpitView(): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const location = useLocation()
  const lastNonCockpitPath = useNavigationStore((s) => s.lastNonCockpitPath)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const [dashboard, setDashboard] = useState<CockpitDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [aiConfig, setAiConfig] = useState<AiConfigView | null>(null)
  const [aiConfigOpen, setAiConfigOpen] = useState(false)
  const [report, setReport] = useState<AiReportResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportExpanded, setReportExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [dash, cfg] = await Promise.all([
        getLanpmApi().cockpit.getDashboard(),
        getLanpmApi().cockpit.getAiConfig()
      ])
      setDashboard(dash)
      setAiConfig(cfg)
    } catch (err) {
      setDashboard(null)
      setLoadError(true)
      message.error(err instanceof Error ? err.message : t('cockpit.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const state = location.state as { openAiConfig?: boolean } | null
    if (state?.openAiConfig) {
      setAiConfigOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  const runReport = async (kind: 'weekly' | 'monthly' | 'evaluate'): Promise<void> => {
    setReportLoading(true)
    try {
      const api = getLanpmApi().cockpit
      const result =
        kind === 'weekly'
          ? await api.generateWeeklyReport()
          : kind === 'monthly'
            ? await api.generateMonthlyReport()
            : await api.evaluateProjects()
      setReport(result)
      message.success(result.usedExternalAi ? t('cockpit.reportExternal') : t('cockpit.reportLocal'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('cockpit.generateFailed'))
    } finally {
      setReportLoading(false)
    }
  }

  const statusTags = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_KEYS).map(([status, meta]) => [
          status,
          { color: meta.color, label: t(meta.key) }
        ])
      ) as Record<string, { color: string; label: string }>,
    [t]
  )

  if (loading && !dashboard) {
    return <ViewLoadingCenter />
  }

  if (loadError && !dashboard) {
    return (
      <ViewErrorCenter message={t('cockpit.loadErrorHint')} onRetry={() => void load()} />
    )
  }

  const summary = dashboard?.summary

  return (
    <div className={styles.root}>
      <ViewHeader
        title={t('cockpit.title')}
        actions={
          <Space wrap>
            <Button
              onClick={() =>
                navigate(lastNonCockpitPath ?? groupViewPath(activeGroupId, 'chat'))
              }
            >
              {t('cockpit.resumeWork')}
            </Button>
            <Button loading={reportLoading} onClick={() => void runReport('weekly')}>
              {t('cockpit.weeklyReport')}
            </Button>
            <Button loading={reportLoading} onClick={() => void runReport('monthly')}>
              {t('cockpit.monthlyReport')}
            </Button>
            <Button
              icon={<RobotOutlined />}
              loading={reportLoading}
              onClick={() => void runReport('evaluate')}
            >
              {t('cockpit.aiEvaluate')}
            </Button>
            <Button icon={<KeyOutlined />} onClick={() => setAiConfigOpen(true)}>
              {t('cockpit.apiKey')}
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]} className={styles.metrics}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('cockpit.totalProjects')} value={summary?.totalProjects ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('cockpit.inProgressTasks')} value={summary?.inProgressCount ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('cockpit.delayedTasks')} value={summary?.delayedCount ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card title={t('cockpit.projectProgress')} className={styles.section}>
        {(dashboard?.projects.length ?? 0) === 0 ? (
          <Text type="secondary">{t('cockpit.noProjects')}</Text>
        ) : (
          dashboard?.projects.map((p) => {
            const meta = statusTags[p.status] ?? statusTags.normal
            return (
              <div key={p.groupId} className={styles.projectRow}>
                <div className={styles.projectHead}>
                  <Text strong>{p.name}</Text>
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <Button size="small" onClick={() => navigate(groupViewPath(p.groupId, 'board'))}>
                    {t('common.view')}
                  </Button>
                </div>
                <Progress percent={p.progressPercent} size="small" />
                <Text type="secondary" className={styles.projectMeta}>
                  {t('cockpit.projectMeta', {
                    total: p.totalTasks,
                    inProgress: p.inProgressCount,
                    delayed: p.delayedCount
                  })}
                </Text>
              </div>
            )
          })
        )}
      </Card>

      <Card title={t('cockpit.deptCompletion')} className={styles.section}>
        {(dashboard?.departments.length ?? 0) === 0 ? (
          <Text type="secondary">{t('cockpit.noDeptData')}</Text>
        ) : (
          dashboard?.departments.map((d) => (
            <div key={d.department} className={styles.deptRow}>
              <Text>{d.department}</Text>
              <Progress percent={d.completionPercent} style={{ flex: 1 }} />
              <Text type="secondary">{t('cockpit.taskCount', { count: d.taskCount })}</Text>
            </div>
          ))
        )}
      </Card>

      {report && (
        <Card
          title={t('cockpit.reportOutput')}
          className={styles.section}
          extra={
            <Space>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  void navigator.clipboard.writeText(report.content).then(
                    () => message.success(t('cockpit.reportCopied')),
                    () => message.error(t('cockpit.reportCopyFailed'))
                  )
                }}
              >
                {t('cockpit.reportCopy')}
              </Button>
              <Button size="small" type="link" onClick={() => setReportExpanded((v) => !v)}>
                {reportExpanded ? t('cockpit.reportCollapse') : t('cockpit.reportExpand')}
              </Button>
            </Space>
          }
        >
          <Paragraph>
            <Text type="secondary">
              {report.generatedAt} ·{' '}
              {report.usedExternalAi ? t('cockpit.sourceExternal') : t('cockpit.sourceLocal')}
            </Text>
          </Paragraph>
          <pre
            className={`${styles.reportPre} ${reportExpanded ? styles.reportPreExpanded : ''}`}
          >
            {report.content}
          </pre>
        </Card>
      )}

      <AiConfigModal
        open={aiConfigOpen}
        config={aiConfig}
        onClose={() => setAiConfigOpen(false)}
        onSave={async (input) => {
          const saved = await getLanpmApi().cockpit.saveAiConfig(input)
          setAiConfig(saved)
          message.success(t('cockpit.configSaved'))
        }}
      />
    </div>
  )
}
