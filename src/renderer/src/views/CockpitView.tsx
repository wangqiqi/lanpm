import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Progress, Space, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { ArrowLeftOutlined, CopyOutlined, KeyOutlined, RobotOutlined } from '@ant-design/icons'
import type { AiConfigView, AiReportResult, CockpitDashboard } from '@shared/cockpit/types'
import { COCKPIT_UNASSIGNED_DEPT } from '@shared/cockpit/constants'
import { formatWeekOverWeekDelta } from '@shared/cockpit/weeklyTrend'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { cockpitReturnPath, groupViewPath } from '@renderer/routes/paths'
import AiConfigModal from '@renderer/features/cockpit/AiConfigModal'
import ViewHeader from '@renderer/ui/ViewHeader'
import RegionButton from '@renderer/ui/RegionButton'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { resolveGroupDisplayNameById } from '@renderer/i18n/groupLabels'
import styles from './CockpitView.module.css'

const { Text } = Typography

const STATUS_KEYS: Record<string, { tone: 'normal' | 'risk' | 'delayed'; key: MessageKey }> = {
  normal: { tone: 'normal', key: 'cockpit.statusNormal' },
  risk: { tone: 'risk', key: 'cockpit.statusRisk' },
  delayed: { tone: 'delayed', key: 'cockpit.statusDelayed' }
}

function resolveDeptDisplayName(department: string, t: (key: MessageKey) => string): string {
  return department === COCKPIT_UNASSIGNED_DEPT ? t('cockpit.deptUnassigned') : department
}

function KpiTile({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: number
  tone?: 'default' | 'risk' | 'delayed'
}): React.ReactElement {
  const valueToneClass =
    tone === 'risk'
      ? styles.kpiValueRisk
      : tone === 'delayed'
        ? styles.kpiValueDelayed
        : ''
  return (
    <div className={styles.kpiTile}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={`${styles.kpiValue} ${valueToneClass}`.trim()}>{value}</span>
    </div>
  )
}

function Panel({
  title,
  extra,
  className = '',
  titleClassName = '',
  children
}: {
  title: string
  extra?: React.ReactNode
  className?: string
  titleClassName?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className={`${styles.panel} ${className}`.trim()}>
      <header className={styles.panelHeader}>
        <h2 className={`${styles.panelTitle} ${titleClassName}`.trim()}>{title}</h2>
        {extra ? <div className={styles.panelExtra}>{extra}</div> : null}
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  )
}

export default function CockpitView(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const location = useLocation()
  const lastNonCockpitPath = useNavigationStore((s) => s.lastNonCockpitPath)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const getActiveGroup = useNavigationStore((s) => s.getActiveGroup)
  const activeGroup = getActiveGroup()
  const returnToActiveProject = () =>
    navigate(cockpitReturnPath(activeGroupId, lastNonCockpitPath))
  const [dashboard, setDashboard] = useState<CockpitDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [aiConfig, setAiConfig] = useState<AiConfigView | null>(null)
  const [aiConfigOpen, setAiConfigOpen] = useState(false)
  const [report, setReport] = useState<AiReportResult | null>(null)
  const [reportKind, setReportKind] = useState<'weekly' | 'monthly' | 'evaluate' | null>(null)
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
      message.error(formatError(err, 'cockpit.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [formatError, message])

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
      setReportKind(kind)
      setReportExpanded(false)
      message.success(result.usedExternalAi ? t('cockpit.reportExternal') : t('cockpit.reportLocal'))
    } catch (err) {
      message.error(formatError(err, 'cockpit.generateFailed'))
    } finally {
      setReportLoading(false)
    }
  }

  const statusTags = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STATUS_KEYS).map(([status, meta]) => [
          status,
          { tone: meta.tone, label: t(meta.key) }
        ])
      ) as Record<string, { tone: 'normal' | 'risk' | 'delayed'; label: string }>,
    [t]
  )

  const attentionProjects = useMemo(() => {
    const list = dashboard?.projects ?? []
    return list.filter((p) => p.status === 'delayed' || p.status === 'risk')
  }, [dashboard?.projects])

  const cockpitTotalTasks = useMemo(
    () => dashboard?.projects.reduce((n, p) => n + p.totalTasks, 0) ?? 0,
    [dashboard?.projects]
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
  const activeProjectName = activeGroup
    ? resolveGroupDisplayNameById(activeGroup.groupId, activeGroup.name, t)
    : activeGroupId

  const attentionNames = attentionProjects
    .slice(0, 4)
    .map((p) => resolveGroupDisplayNameById(p.groupId, p.name, t))
    .join('、')
  const attentionExtra =
    attentionProjects.length > 4 ? ` +${attentionProjects.length - 4}` : ''

  const reportKindLabel =
    reportKind === 'weekly'
      ? t('cockpit.weeklyReport')
      : reportKind === 'monthly'
        ? t('cockpit.monthlyReport')
        : reportKind === 'evaluate'
          ? t('cockpit.aiEvaluate')
          : ''

  return (
    <div className={styles.root} data-lanpm-view-scroll>
      <ViewHeader
        title={t('cockpit.title')}
        actions={
          <Space wrap className={styles.headerActions}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={returnToActiveProject}>
              <span className={styles.backBtnLabel}>
                {t('cockpit.backToProject', { name: activeProjectName })}
              </span>
            </Button>
            <Button type="primary" loading={reportLoading} onClick={() => void runReport('weekly')}>
              {t('cockpit.weeklyReport')}
            </Button>
            <Button loading={reportLoading} onClick={() => void runReport('monthly')}>
              {t('cockpit.monthlyReport')}
            </Button>
            <Button
              type="text"
              icon={<RobotOutlined />}
              loading={reportLoading}
              onClick={() => void runReport('evaluate')}
            >
              {t('cockpit.aiEvaluate')}
            </Button>
            <Button type="text" icon={<KeyOutlined />} onClick={() => setAiConfigOpen(true)}>
              {t('cockpit.apiKey')}
            </Button>
          </Space>
        }
      />

      <div
        className={`${styles.attention} ${
          attentionProjects.length > 0 ? styles.attentionNeed : styles.attentionOk
        }`}
        role="status"
      >
        <Text strong className={styles.attentionLabel}>
          {t('cockpit.attentionTitle')}
        </Text>
        {attentionProjects.length > 0 ? (
          <>
            <Text className={styles.attentionBody}>
              {t('cockpit.attentionNeed', {
                delayed: attentionProjects.filter((p) => p.status === 'delayed').length,
                risk: attentionProjects.filter((p) => p.status === 'risk').length,
                names: `${attentionNames}${attentionExtra}`
              })}
            </Text>
            {attentionProjects[0] ? (
              <Button
                size="small"
                type="link"
                onClick={() => navigate(groupViewPath(attentionProjects[0].groupId, 'board'))}
              >
                {t('cockpit.attentionOpenBoard')}
              </Button>
            ) : null}
          </>
        ) : (
          <Text type="secondary">{t('cockpit.attentionHealthy')}</Text>
        )}
      </div>

      {dashboard?.executiveSummary ? (
        <section className={styles.execSummary} aria-label={t('cockpit.execSummaryTitle')}>
          <h2 className={styles.execSummaryTitle}>{t('cockpit.execSummaryTitle')}</h2>
          <div className={styles.execSummaryGrid}>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.execCompletedWeek')}</span>
              <span className={styles.execValue}>
                {dashboard.executiveSummary.completedThisWeek}
              </span>
            </div>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.execInProgress')}</span>
              <span className={styles.execValue}>{dashboard.executiveSummary.inProgressCount}</span>
            </div>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.execRiskProjects')}</span>
              <span
                className={`${styles.execValue} ${styles.execValueRisk}`.trim()}
              >
                {dashboard.executiveSummary.riskProjectCount}
              </span>
            </div>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.execDueNextWeek')}</span>
              <span className={styles.execValue}>{dashboard.executiveSummary.dueNextWeek}</span>
            </div>
          </div>
        </section>
      ) : null}

      {dashboard?.weeklyTrend ? (
        <section className={styles.weeklyTrend} aria-label={t('cockpit.trendTitle')}>
          <h2 className={styles.weeklyTrendTitle}>{t('cockpit.trendTitle')}</h2>
          <div className={styles.weeklyTrendGrid}>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.trendLastWeek')}</span>
              <span className={styles.execValue}>{dashboard.weeklyTrend.completedLastWeek}</span>
            </div>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.trendThisWeek')}</span>
              <span className={styles.execValue}>{dashboard.weeklyTrend.completedThisWeek}</span>
            </div>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.trendDelta')}</span>
              <span
                className={`${styles.execValue} ${
                  dashboard.weeklyTrend.weekOverWeekDelta > 0
                    ? styles.trendDeltaUp
                    : dashboard.weeklyTrend.weekOverWeekDelta < 0
                      ? styles.trendDeltaDown
                      : ''
                }`.trim()}
              >
                {formatWeekOverWeekDelta(dashboard.weeklyTrend.weekOverWeekDelta)}
              </span>
            </div>
            <div className={styles.execMetric}>
              <span className={styles.execLabel}>{t('cockpit.trendMilestones')}</span>
              <span className={styles.execValue}>
                {t('cockpit.trendMilestonePair', {
                  current: dashboard.weeklyTrend.milestonesCompletedThisWeek,
                  previous: dashboard.weeklyTrend.milestonesCompletedLastWeek
                })}
              </span>
            </div>
          </div>
          <Text type="secondary" className={styles.trendNote}>
            {t('cockpit.trendApproxNote')}
          </Text>
        </section>
      ) : null}

      <div className={styles.kpiGrid}>
        <KpiTile label={t('cockpit.totalProjects')} value={summary?.totalProjects ?? 0} />
        <KpiTile label={t('cockpit.inProgressTasks')} value={summary?.inProgressCount ?? 0} />
        <KpiTile
          label={t('cockpit.riskProjects')}
          value={summary?.riskProjectCount ?? 0}
          tone="risk"
        />
        <KpiTile
          label={t('cockpit.delayedTasks')}
          value={summary?.delayedCount ?? 0}
          tone="delayed"
        />
      </div>

      <Panel title={t('cockpit.attentionTasksTitle')} className={styles.section}>
        {(dashboard?.attentionTasks.length ?? 0) === 0 ? (
          <Text type="secondary">{t('cockpit.attentionTasksEmpty')}</Text>
        ) : (
          <ul className={styles.attentionTaskList}>
            {dashboard?.attentionTasks.map((item) => {
              const kindTone = item.kind === 'overdue' ? 'delayed' : 'risk'
              const kindLabel =
                item.kind === 'overdue'
                  ? t('cockpit.attentionTaskOverdue')
                  : t('cockpit.attentionTaskBehind')
              return (
                <li key={item.taskId} className={styles.attentionTaskRow}>
                  <div className={styles.attentionTaskMain}>
                    <Text strong className={styles.attentionTaskTitle}>
                      {item.title}
                    </Text>
                    <Text type="secondary" className={styles.attentionTaskMeta}>
                      {resolveGroupDisplayNameById(item.groupId, item.projectName, t)}
                      {' · '}
                      {item.assigneeName ?? t('cockpit.attentionTaskUnassigned')}
                      {item.endDate ? ` · ${item.endDate}` : ''}
                    </Text>
                  </div>
                  <span
                    className={`${styles.statusPill} ${styles[`statusPill_${kindTone}`]}`}
                  >
                    {kindLabel}
                  </span>
                  <Button
                    size="small"
                    type="link"
                    className={styles.attentionTaskAction}
                    onClick={() => navigate(groupViewPath(item.groupId, 'board'))}
                  >
                    {t('cockpit.attentionOpenBoard')}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title={t('cockpit.projectProgress')}
        className={styles.section}
        extra={
          (dashboard?.projects.length ?? 0) > 0 ? (
            <Text type="secondary" className={styles.panelCount}>
              {t('cockpit.projectCount', { count: dashboard?.projects.length ?? 0 })}
            </Text>
          ) : null
        }
      >
        {(dashboard?.projects.length ?? 0) === 0 ? (
          <Text type="secondary">{t('cockpit.noProjects')}</Text>
        ) : (
          <div className={styles.projectHealthList}>
            {dashboard?.projects.map((p) => {
              const meta = statusTags[p.status] ?? statusTags.normal
              const progressClass =
                p.status === 'delayed'
                  ? styles.projectProgressDelayed
                  : p.status === 'risk'
                    ? styles.projectProgressRisk
                    : styles.projectProgress
              return (
                <article
                  key={p.groupId}
                  className={`${styles.projectHealthCard} ${styles[`projectHealthCard_${p.status}`]}`}
                >
                  <div className={styles.projectHealthTop}>
                    <Text strong className={styles.projectName}>
                      {resolveGroupDisplayNameById(p.groupId, p.name, t)}
                    </Text>
                    <span
                      className={`${styles.statusPill} ${styles[`statusPill_${meta.tone}`]}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className={styles.projectHealthMetrics}>
                    <Progress
                      className={progressClass}
                      percent={p.progressPercent}
                      size="small"
                      showInfo={false}
                    />
                    <span className={styles.projectProgressPct}>{p.progressPercent}%</span>
                    <Text type="secondary" className={styles.projectMetaInline}>
                      {t('cockpit.projectMeta', {
                        total: p.totalTasks,
                        inProgress: p.inProgressCount,
                        delayed: p.delayedCount
                      })}
                    </Text>
                  </div>
                  <div className={styles.projectHealthActions}>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => navigate(groupViewPath(p.groupId, 'board'))}
                    >
                      {t('cockpit.openBoard')}
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => navigate(groupViewPath(p.groupId, 'chat'))}
                    >
                      {t('cockpit.enterProject')}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel
        title={t('cockpit.deptCompletion')}
        className={styles.section}
        extra={
          (dashboard?.departments.length ?? 0) > 0 ? (
            <Text type="secondary" className={styles.panelCount}>
              {t('cockpit.deptPanelCount', { count: dashboard?.departments.length ?? 0 })}
            </Text>
          ) : null
        }
      >
        {(dashboard?.departments.length ?? 0) === 0 ? (
          <Text type="secondary">
            {cockpitTotalTasks === 0 ? t('cockpit.noDeptNoTasks') : t('cockpit.noDeptData')}
          </Text>
        ) : (
          <div className={styles.deptList}>
            {dashboard?.departments.map((d) => (
              <div
                key={d.department}
                className={`${styles.deptRow} ${d.department === COCKPIT_UNASSIGNED_DEPT ? styles.deptRowUnassigned : ''}`}
              >
                <Text className={styles.deptName}>{resolveDeptDisplayName(d.department, t)}</Text>
                {d.taskCount === 0 ? (
                  <Text type="secondary" className={styles.deptZeroHint}>
                    {t('cockpit.deptZeroTasks')}
                  </Text>
                ) : (
                  <>
                    <Progress
                      className={styles.deptProgress}
                      percent={d.completionPercent}
                      size="small"
                      showInfo={false}
                    />
                    <span className={styles.deptPct}>{d.completionPercent}%</span>
                    <Text type="secondary" className={styles.deptCount}>
                      {t('cockpit.deptDoneRatio', { done: d.doneCount, total: d.taskCount })}
                    </Text>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {report ? (
        <Panel
          title={t('cockpit.reportOutput')}
          titleClassName={styles.reportPanelTitle}
          className={`${styles.section} ${styles.reportPanel}`}
          extra={
            <Space size={4}>
              <Button
                size="small"
                type="link"
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
              <RegionButton variant="caption" onClick={() => setReportExpanded((v) => !v)}>
                {reportExpanded ? t('cockpit.reportCollapse') : t('cockpit.reportExpand')}
              </RegionButton>
            </Space>
          }
        >
          <Text type="secondary" className={styles.reportMeta}>
            {reportKindLabel ? `${reportKindLabel} · ` : ''}
            {report.generatedAt} ·{' '}
            {report.usedExternalAi ? t('cockpit.sourceExternal') : t('cockpit.sourceLocal')}
          </Text>
          {reportExpanded ? (
            <pre className={`${styles.reportPre} ${styles.reportPreExpanded}`}>
              {report.content}
            </pre>
          ) : (
            <button
              type="button"
              className={styles.reportTeaserButton}
              onClick={() => setReportExpanded(true)}
            >
              <Text type="secondary" className={styles.reportTeaser}>
                {report.content.trim().split('\n').find((line) => line.trim()) ?? ''}
              </Text>
            </button>
          )}
        </Panel>
      ) : null}

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
