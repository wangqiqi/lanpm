import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message
} from 'antd'
import { KeyOutlined, RobotOutlined } from '@ant-design/icons'
import type { AiConfigView, AiReportResult, CockpitDashboard } from '@shared/cockpit/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import AiConfigModal from '@renderer/features/cockpit/AiConfigModal'
import styles from './CockpitView.module.css'

const { Title, Text, Paragraph } = Typography

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  normal: { color: 'success', label: '正常' },
  risk: { color: 'warning', label: '风险' },
  delayed: { color: 'error', label: '延期' }
}

export default function CockpitView(): React.ReactElement {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<CockpitDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiConfig, setAiConfig] = useState<AiConfigView | null>(null)
  const [aiConfigOpen, setAiConfigOpen] = useState(false)
  const [report, setReport] = useState<AiReportResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, cfg] = await Promise.all([
        getLanpmApi().cockpit.getDashboard(),
        getLanpmApi().cockpit.getAiConfig()
      ])
      setDashboard(dash)
      setAiConfig(cfg)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载驾驶舱失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
      message.success(result.usedExternalAi ? '已生成（含外部 AI）' : '已生成本地报告')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '生成失败')
    } finally {
      setReportLoading(false)
    }
  }

  if (loading && !dashboard) {
    return <Spin className={styles.spinner} />
  }

  const summary = dashboard?.summary

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title level={3} className={styles.title}>
          驾驶舱
        </Title>
        <Space wrap>
          <Button loading={reportLoading} onClick={() => void runReport('weekly')}>
            周报
          </Button>
          <Button loading={reportLoading} onClick={() => void runReport('monthly')}>
            月报
          </Button>
          <Button
            icon={<RobotOutlined />}
            loading={reportLoading}
            onClick={() => void runReport('evaluate')}
          >
            AI 评估
          </Button>
          <Button icon={<KeyOutlined />} onClick={() => setAiConfigOpen(true)}>
            API Key
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className={styles.metrics}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="项目总数" value={summary?.totalProjects ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="进行中任务" value={summary?.inProgressCount ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="延期任务" value={summary?.delayedCount ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card title="项目进度" className={styles.section}>
        {(dashboard?.projects.length ?? 0) === 0 ? (
          <Text type="secondary">暂无项目群组，请先创建项目群</Text>
        ) : (
          dashboard?.projects.map((p) => {
            const meta = STATUS_TAG[p.status] ?? STATUS_TAG.normal
            return (
              <div key={p.groupId} className={styles.projectRow}>
                <div className={styles.projectHead}>
                  <Text strong>{p.name}</Text>
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <Button size="small" onClick={() => navigate(groupViewPath(p.groupId, 'board'))}>
                    查看
                  </Button>
                </div>
                <Progress percent={p.progressPercent} size="small" />
                <Text type="secondary" className={styles.projectMeta}>
                  任务 {p.totalTasks} · 进行中 {p.inProgressCount} · 延期 {p.delayedCount}
                </Text>
              </div>
            )
          })
        )}
      </Card>

      <Card title="部门完成率" className={styles.section}>
        {(dashboard?.departments.length ?? 0) === 0 ? (
          <Text type="secondary">暂无任务负责人部门数据</Text>
        ) : (
          dashboard?.departments.map((d) => (
            <div key={d.department} className={styles.deptRow}>
              <Text>{d.department}</Text>
              <Progress percent={d.completionPercent} style={{ flex: 1 }} />
              <Text type="secondary">{d.taskCount} 项</Text>
            </div>
          ))
        )}
      </Card>

      {report && (
        <Card title="报告 / 评估输出" className={styles.section}>
          <Paragraph>
            <Text type="secondary">
              {report.generatedAt} · {report.usedExternalAi ? '外部 AI' : '本地规则'}
            </Text>
          </Paragraph>
          <pre className={styles.reportPre}>{report.content}</pre>
        </Card>
      )}

      <AiConfigModal
        open={aiConfigOpen}
        config={aiConfig}
        onClose={() => setAiConfigOpen(false)}
        onSave={async (input) => {
          const saved = await getLanpmApi().cockpit.saveAiConfig(input)
          setAiConfig(saved)
          message.success('API 配置已保存（密钥本地加密）')
        }}
      />
    </div>
  )
}
