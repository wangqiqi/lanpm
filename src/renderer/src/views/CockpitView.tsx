import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Alert, Progress, Space, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import {
  ArrowLeftOutlined,
  CompassOutlined,
  CopyOutlined,
  KeyOutlined,
  RobotOutlined
} from '@ant-design/icons'
import type { AiConfigView, AiReportResult, CockpitDashboard } from '@shared/cockpit/types'
import type { AiPatrolRunSummary } from '@shared/ai/patrolTypes'
import type { AiPipelineRun } from '@shared/ai/pipelineTypes'
import { formatPatrolSeedMarkdown } from '@shared/ai/patrolFormat'
import { COCKPIT_UNASSIGNED_DEPT } from '@shared/cockpit/constants'
import { resolveDeptDoneCount } from '@shared/cockpit/departmentStats'
import { formatWeekOverWeekDelta } from '@shared/cockpit/weeklyTrend'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { cockpitReturnPath, groupViewPath } from '@renderer/routes/paths'
import AiConfigModal from '@renderer/features/cockpit/AiConfigModal'
import ViewHeader from '@renderer/ui/ViewHeader'
import RegionButton from '@renderer/ui/RegionButton'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { resolveGroupDisplayNameById } from '@renderer/i18n/groupLabels'
import { useAiAssistantStore } from '@renderer/stores/aiAssistantStore'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import SubtaskPreviewModal, {
  proposalsToRows,
  type SubtaskPreviewRow
} from '@renderer/features/ai/SubtaskPreviewModal'
import IslandPanel from '@renderer/ui/IslandPanel'
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

export default function CockpitView(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const location = useLocation()
  const lastNonCockpitPath = useNavigationStore((s) => s.lastNonCockpitPath)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const groups = useNavigationStore((s) => s.groups)
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
  const [patrolLatest, setPatrolLatest] = useState<AiPatrolRunSummary | null>(null)
  const [pipelineRun, setPipelineRun] = useState<AiPipelineRun | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineExpanded, setPipelineExpanded] = useState(false)
  const [remediateModalOpen, setRemediateModalOpen] = useState(false)
  const [remediateLoading, setRemediateLoading] = useState(false)
  const [remediateConfirming, setRemediateConfirming] = useState(false)
  const [remediateRows, setRemediateRows] = useState<SubtaskPreviewRow[]>([])
  const [remediateRunId, setRemediateRunId] = useState<string | null>(null)
  const [remediateGroupId, setRemediateGroupId] = useState<string | null>(null)
  const [remediateUsedExternalAi, setRemediateUsedExternalAi] = useState(false)
  const [remediateDegraded, setRemediateDegraded] = useState(false)
  const members = useChatMembersStore((s) =>
    remediateGroupId ? (s.membersByGroup[remediateGroupId] ?? []) : []
  )
  const loadMembers = useChatMembersStore((s) => s.loadMembers)
  const openAssistant = useAiAssistantStore((s) => s.openAssistant)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [dash, cfg, patrolRuns, pipelineRuns] = await Promise.all([
        getLanpmApi().cockpit.getDashboard(),
        getLanpmApi().cockpit.getAiConfig(),
        getLanpmApi().ai.listPatrolRuns(1),
        getLanpmApi().ai.listPipelineRuns(5)
      ])
      setDashboard(dash)
      setAiConfig(cfg)
      setPatrolLatest(patrolRuns[0] ?? null)
      const latestPipeline = activeGroupId
        ? pipelineRuns.find(
            (r) =>
              r.groupId === activeGroupId &&
              (r.status === 'completed' || r.status === 'awaiting_confirm')
          )
        : pipelineRuns.find((r) => r.status === 'completed' || r.status === 'awaiting_confirm')
      if (latestPipeline) {
        const full = await getLanpmApi().ai.getPipelineRun(latestPipeline.runId)
        setPipelineRun(full)
        if (full?.status === 'awaiting_confirm' && full.pendingConfirm) {
          setRemediateRunId(full.runId)
          setRemediateGroupId(full.groupId)
          setRemediateRows(proposalsToRows(full.pendingConfirm.proposals))
          setRemediateUsedExternalAi(full.pendingConfirm.usedExternalAi)
          setRemediateDegraded(Boolean(full.pendingConfirm.degraded || full.pendingConfirm.errorCode))
          setRemediateModalOpen(true)
          void loadMembers(full.groupId)
        }
      } else {
        setPipelineRun(null)
      }
    } catch (err) {
      setDashboard(null)
      setLoadError(true)
      message.error(formatError(err, 'cockpit.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [activeGroupId, formatError, loadMembers, message])

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.userId, label: m.displayName })),
    [members]
  )

  const startTaskRemediate = useCallback(
    (groupId: string, parentTaskId: string): void => {
      setRemediateModalOpen(true)
      setRemediateLoading(true)
      setRemediateRows([])
      setRemediateDegraded(false)
      setRemediateRunId(null)
      setRemediateGroupId(groupId)
      void loadMembers(groupId)
      void (async () => {
        try {
          const run = await getLanpmApi().ai.startPipeline({
            groupId,
            presetId: 'taskRemediate',
            parentTaskId
          })
          if (run.status === 'awaiting_confirm' && run.pendingConfirm) {
            setRemediateRunId(run.runId)
            setRemediateRows(proposalsToRows(run.pendingConfirm.proposals))
            setRemediateUsedExternalAi(run.pendingConfirm.usedExternalAi)
            setRemediateDegraded(Boolean(run.pendingConfirm.degraded || run.pendingConfirm.errorCode))
          } else {
            message.error(t('ai.pipeline.remediateFailed'))
            setRemediateModalOpen(false)
          }
        } catch (err) {
          message.error(formatError(err, 'ai.sendFailed'))
          setRemediateModalOpen(false)
        } finally {
          setRemediateLoading(false)
        }
      })()
    },
    [formatError, loadMembers, message, t]
  )

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

  const attentionTasks = dashboard?.attentionTasks ?? []
  const attentionPreview = attentionTasks.slice(0, 2)
  const projects = dashboard?.projects ?? []
  const worstProject = projects[0] ?? null
  const departments = useMemo(() => dashboard?.departments ?? [], [dashboard?.departments])
  const worstDepartment = useMemo(() => {
    const withTasks = departments.filter((d) => d.taskCount > 0)
    if (withTasks.length === 0) {
      return departments[0] ?? null
    }
    return withTasks.reduce((worst, d) =>
      d.completionPercent < worst.completionPercent ? d : worst
    )
  }, [departments])
  const overallDeptCompletion = useMemo(() => {
    const total = departments.reduce((n, d) => n + d.taskCount, 0)
    const done = departments.reduce((n, d) => n + resolveDeptDoneCount(d), 0)
    return {
      total,
      done,
      percent: total === 0 ? 0 : Math.round((done / total) * 100)
    }
  }, [departments])

  const cockpitTotalTasks = useMemo(
    () => dashboard?.projects.reduce((n, p) => n + p.totalTasks, 0) ?? 0,
    [dashboard?.projects]
  )

  if (loading && !dashboard) {
    return (
      <div className={styles.root}>
        <ViewLoadingCenter />
      </div>
    )
  }

  if (loadError && !dashboard) {
    return (
      <div className={styles.root}>
        <ViewErrorCenter message={t('cockpit.loadErrorHint')} onRetry={() => void load()} />
      </div>
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
    <div className={styles.root}>
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

      {groups.length === 0 ? (
        <Alert
          type="info"
          showIcon
          className={styles.emptyGroupsBanner}
          message={t('discover.cockpitNoGroupsTitle')}
          description={t('discover.cockpitNoGroupsHint')}
          action={
            <Button
              type="primary"
              icon={<CompassOutlined />}
              onClick={() => useUiStore.getState().requestDiscoverOpen()}
              data-testid="cockpit-join-with-code"
            >
              {t('discover.cockpitJoinWithCode')}
            </Button>
          }
        />
      ) : null}

      <div className={styles.scrollBody} data-lanpm-view-scroll>
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

      <section className={styles.execSummary} aria-label={t('cockpit.execSummaryTitle')}>
        <h2 className={styles.execSummaryTitle}>{t('cockpit.execSummaryTitle')}</h2>
        <div className={styles.execSummaryGrid}>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.execCompletedWeek')}</span>
            <span className={styles.execValue}>
              {dashboard?.weeklyTrend?.completedThisWeek ??
                dashboard?.executiveSummary?.completedThisWeek ??
                0}
            </span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.trendDelta')}</span>
            <span
              className={`${styles.execValue} ${
                (dashboard?.weeklyTrend?.weekOverWeekDelta ?? 0) > 0
                  ? styles.trendDeltaUp
                  : (dashboard?.weeklyTrend?.weekOverWeekDelta ?? 0) < 0
                    ? styles.trendDeltaDown
                    : ''
              }`.trim()}
            >
              {formatWeekOverWeekDelta(dashboard?.weeklyTrend?.weekOverWeekDelta ?? 0)}
            </span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.execDueNextWeek')}</span>
            <span className={styles.execValue}>
              {dashboard?.executiveSummary?.dueNextWeek ?? 0}
            </span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.execAttentionCount')}</span>
            <span
              className={`${styles.execValue} ${
                (dashboard?.attentionTasks.length ?? 0) > 0 ? styles.execValueRisk : ''
              }`.trim()}
            >
              {dashboard?.attentionTasks.length ?? 0}
            </span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.totalProjects')}</span>
            <span className={styles.execValue}>{summary?.totalProjects ?? 0}</span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.inProgressTasks')}</span>
            <span className={styles.execValue}>{summary?.inProgressCount ?? 0}</span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.riskProjects')}</span>
            <span
              className={`${styles.execValue} ${
                (summary?.riskProjectCount ?? 0) > 0 ? styles.execValueRisk : ''
              }`.trim()}
            >
              {summary?.riskProjectCount ?? 0}
            </span>
          </div>
          <div className={styles.execMetric}>
            <span className={styles.execLabel}>{t('cockpit.delayedTasks')}</span>
            <span
              className={`${styles.execValue} ${
                (summary?.delayedCount ?? 0) > 0 ? styles.execValueDelayed : ''
              }`.trim()}
            >
              {summary?.delayedCount ?? 0}
            </span>
          </div>
        </div>
        <Text type="secondary" className={styles.execFootnote}>
          {t('cockpit.trendApproxNote')}
        </Text>
      </section>

      <IslandPanel
        title={t('cockpit.attentionTasksTitle')}
        className={styles.section}
        defaultCollapsed={attentionTasks.length === 0}
        summary={
          attentionTasks.length === 0 ? (
            <Text type="secondary">{t('cockpit.attentionTasksEmpty')}</Text>
          ) : (
            <div className={styles.accordionSummary}>
              <Text className={styles.accordionSummaryLead}>
                {t('cockpit.attentionTasksSummary', { count: attentionTasks.length })}
              </Text>
              <ul className={styles.accordionSummaryList}>
                {attentionPreview.map((item) => {
                  const kindTone = item.kind === 'overdue' ? 'delayed' : 'risk'
                  const kindLabel =
                    item.kind === 'overdue'
                      ? t('cockpit.attentionTaskOverdue')
                      : t('cockpit.attentionTaskBehind')
                  return (
                    <li key={item.taskId} className={styles.accordionSummaryRow}>
                      <Text className={styles.accordionSummaryTitle}>{item.title}</Text>
                      <span
                        className={`${styles.statusPill} ${styles[`statusPill_${kindTone}`]}`}
                      >
                        {kindLabel}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        }
      >
        {attentionTasks.length === 0 ? (
          <Text type="secondary">{t('cockpit.attentionTasksEmpty')}</Text>
        ) : (
          <ul className={styles.attentionTaskList}>
            {attentionTasks.map((item) => {
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
                    onClick={() => startTaskRemediate(item.groupId, item.taskId)}
                  >
                    {t('ai.pipeline.remediateRun')}
                  </Button>
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
      </IslandPanel>

      <IslandPanel
        title={t('cockpit.projectProgress')}
        className={styles.section}
        defaultCollapsed
        extra={
          projects.length > 0 ? (
            <Text type="secondary" className={styles.panelCount}>
              {t('cockpit.projectCount', { count: projects.length })}
            </Text>
          ) : null
        }
        summary={
          !worstProject ? (
            <Text type="secondary">{t('cockpit.noProjects')}</Text>
          ) : (
            <div className={styles.accordionSummary}>
              <Text className={styles.accordionSummaryLead}>
                {t('cockpit.projectWorstSummary', {
                  name: resolveGroupDisplayNameById(worstProject.groupId, worstProject.name, t),
                  percent: worstProject.progressPercent
                })}
              </Text>
              <div className={styles.accordionSummaryMetrics}>
                <Progress
                  className={
                    worstProject.status === 'delayed'
                      ? styles.projectProgressDelayed
                      : worstProject.status === 'risk'
                        ? styles.projectProgressRisk
                        : styles.projectProgress
                  }
                  percent={worstProject.progressPercent}
                  size="small"
                  showInfo={false}
                />
                <span className={styles.projectProgressPct}>{worstProject.progressPercent}%</span>
              </div>
            </div>
          )
        }
      >
        {projects.length === 0 ? (
          <Text type="secondary">{t('cockpit.noProjects')}</Text>
        ) : (
          <div className={styles.projectHealthList}>
            {projects.map((p) => {
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
      </IslandPanel>

      <IslandPanel
        title={t('cockpit.deptCompletion')}
        className={styles.section}
        defaultCollapsed
        extra={
          departments.length > 0 ? (
            <Text type="secondary" className={styles.panelCount}>
              {t('cockpit.deptPanelCount', { count: departments.length })}
            </Text>
          ) : null
        }
        summary={
          departments.length === 0 || !worstDepartment ? (
            <Text type="secondary">
              {cockpitTotalTasks === 0 ? t('cockpit.noDeptNoTasks') : t('cockpit.noDeptData')}
            </Text>
          ) : (
            <div className={styles.accordionSummary}>
              <Text className={styles.accordionSummaryLead}>
                {t('cockpit.deptSummary', {
                  percent: overallDeptCompletion.percent,
                  name: resolveDeptDisplayName(worstDepartment.department, t),
                  worstPercent: worstDepartment.completionPercent
                })}
              </Text>
              <div className={styles.accordionSummaryMetrics}>
                <Progress
                  className={styles.deptProgress}
                  percent={worstDepartment.completionPercent}
                  size="small"
                  showInfo={false}
                />
                <span className={styles.deptPct}>{worstDepartment.completionPercent}%</span>
              </div>
            </div>
          )
        }
      >
        {departments.length === 0 ? (
          <Text type="secondary">
            {cockpitTotalTasks === 0 ? t('cockpit.noDeptNoTasks') : t('cockpit.noDeptData')}
          </Text>
        ) : (
          <div className={styles.deptList}>
            {departments.map((d) => (
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
                      {t('cockpit.deptDoneRatio', {
                        done: resolveDeptDoneCount(d),
                        total: d.taskCount
                      })}
                    </Text>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </IslandPanel>

      <IslandPanel
        title={t('ai.patrolTitle')}
        className={styles.section}
        defaultCollapsed
        extra={
          patrolLatest ? (
            <Button
              type="link"
              size="small"
              icon={<RobotOutlined />}
              onClick={() => {
                void (async () => {
                  try {
                    const report = await getLanpmApi().ai.getLatestPatrolRun()
                    if (!report) {
                      message.warning(t('ai.patrolLatestEmpty'))
                      return
                    }
                    openAssistant({
                      groupId: activeGroupId ?? null,
                      context: {
                        seedMarkdown: formatPatrolSeedMarkdown(report),
                        reportKind: 'patrol'
                      },
                      layout: 'drawer',
                      entrySource: 'cockpit'
                    })
                  } catch (err) {
                    message.error(formatError(err, 'ai.sendFailed'))
                  }
                })()
              }}
            >
              {t('cockpit.continueInAssistant')}
            </Button>
          ) : null
        }
      >
        {patrolLatest ? (
          <>
            <Text type="secondary" className={styles.reportMeta}>
              {patrolLatest.finishedAt} · {patrolLatest.findingCount}{' '}
              {t('ai.prompt.taskRisk.label')} ·{' '}
              {patrolLatest.usedExternalAi ? t('cockpit.sourceExternal') : t('cockpit.sourceLocal')}
            </Text>
            <Text>{patrolLatest.summary}</Text>
          </>
        ) : (
          <Text type="secondary">{t('ai.patrolLatestEmpty')}</Text>
        )}
      </IslandPanel>

      <IslandPanel
        title={t('ai.pipeline.title')}
        className={styles.section}
        defaultCollapsed
        extra={
          <Space size={4}>
            <Button
              type="link"
              size="small"
              loading={pipelineLoading}
              disabled={!activeGroupId}
              onClick={() => {
                if (!activeGroupId) {
                  message.warning(t('ai.pipeline.needGroup'))
                  return
                }
                void (async () => {
                  setPipelineLoading(true)
                  try {
                    const run = await getLanpmApi().ai.startPipeline({
                      groupId: activeGroupId,
                      presetId: 'healthCheck'
                    })
                    setPipelineRun(run)
                    setPipelineExpanded(true)
                  } catch (err) {
                    message.error(formatError(err, 'ai.sendFailed'))
                  } finally {
                    setPipelineLoading(false)
                  }
                })()
              }}
            >
              {pipelineLoading ? t('ai.pipeline.running') : t('ai.pipeline.run')}
            </Button>
            {pipelineRun?.finalMarkdown ? (
              <Button
                type="link"
                size="small"
                icon={<RobotOutlined />}
                onClick={() =>
                  openAssistant({
                    groupId: activeGroupId ?? null,
                    context: {
                      seedMarkdown: pipelineRun.finalMarkdown ?? undefined,
                      reportKind: 'healthCheck'
                    },
                    layout: 'drawer',
                    entrySource: 'cockpit'
                  })
                }
              >
                {t('cockpit.continueInAssistant')}
              </Button>
            ) : null}
          </Space>
        }
      >
        {pipelineLoading ? (
          <Text type="secondary">{t('ai.pipeline.running')}</Text>
        ) : pipelineRun?.finalMarkdown ? (
          <>
            <Text type="secondary" className={styles.reportMeta}>
              {pipelineRun.finishedAt} ·{' '}
              {pipelineRun.usedExternalAi ? t('cockpit.sourceExternal') : t('cockpit.sourceLocal')}
              {pipelineRun.degraded ? ` · ${t('ai.pipeline.degraded')}` : ''}
            </Text>
            {pipelineExpanded ? (
              <pre className={`${styles.reportPre} ${styles.reportPreExpanded}`}>
                {pipelineRun.finalMarkdown}
              </pre>
            ) : (
              <Text ellipsis>{pipelineRun.finalMarkdown.split('\n').find((l) => l.trim())}</Text>
            )}
            <RegionButton variant="caption" onClick={() => setPipelineExpanded((v) => !v)}>
              {pipelineExpanded ? t('cockpit.reportCollapse') : t('cockpit.reportExpand')}
            </RegionButton>
          </>
        ) : (
          <Text type="secondary">{t('ai.pipeline.empty')}</Text>
        )}
      </IslandPanel>

      {report ? (
        <IslandPanel
          title={t('cockpit.reportOutput')}
          titleClassName={styles.reportPanelTitle}
          className={`${styles.section} ${styles.reportPanel}`}
          bodyClassName={styles.reportPanelBody}
          data-testid="cockpit-report-panel"
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
              <Button
                type="link"
                icon={<RobotOutlined />}
                onClick={() =>
                  openAssistant({
                    groupId: activeGroupId ?? null,
                    context: {
                      seedMarkdown: report.content,
                      reportKind: reportKind ?? undefined
                    },
                    layout: 'drawer',
                    entrySource: 'cockpit'
                  })
                }
              >
                {t('cockpit.continueInAssistant')}
              </Button>
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
        </IslandPanel>
      ) : null}
      </div>

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

      <SubtaskPreviewModal
        open={remediateModalOpen}
        loading={remediateLoading}
        proposals={remediateRows}
        memberOptions={memberOptions}
        usedExternalAi={remediateUsedExternalAi}
        degraded={remediateDegraded}
        onChange={setRemediateRows}
        confirming={remediateConfirming}
        onCancel={() => {
          if (remediateRunId) {
            void getLanpmApi().ai.cancelPipeline({ runId: remediateRunId })
          }
          setRemediateRunId(null)
          setRemediateModalOpen(false)
        }}
        onConfirm={(rows) => {
          if (!remediateRunId || !remediateGroupId) return
          void (async () => {
            setRemediateConfirming(true)
            try {
              const run = await getLanpmApi().ai.resumePipeline({
                runId: remediateRunId,
                items: rows.map((r) => ({
                  title: r.title.trim(),
                  assigneeUserId: r.suggestedAssigneeUserId,
                  endDate: r.suggestedEndDate
                }))
              })
              message.success(
                t('ai.subtaskCreated', { count: String(run.createdTaskIds.length) })
              )
              setRemediateRunId(null)
              setRemediateModalOpen(false)
              setPipelineRun(run)
              setPipelineExpanded(true)
            } catch (err) {
              message.error(formatError(err, 'ai.sendFailed'))
            } finally {
              setRemediateConfirming(false)
            }
          })()
        }}
      />
    </div>
  )
}
