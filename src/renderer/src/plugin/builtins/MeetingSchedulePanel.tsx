import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, List, Select, Space, Typography, message } from 'antd'
import { DeleteOutlined, LoginOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { MeetingSchedule } from '@shared/media/meetingSchedule'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import { useUiStore } from '@renderer/stores/uiStore'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  groupId: string
  disabled?: boolean
  onJoinMeeting?: () => Promise<void>
  joinMeetingDisabled?: boolean
}

interface FormValues {
  title: string
  startsAt: Dayjs
  durationMinutes: number
}

const DURATION_MINUTES = [15, 30, 45, 60, 90, 120] as const

function formatScheduleWhen(startsAt: string, locale: string): string {
  const d = new Date(startsAt)
  if (Number.isNaN(d.getTime())) return startsAt
  return d.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** 群级会议日程：预约表单 + 近期列表 */
export default function MeetingSchedulePanel({
  groupId,
  disabled,
  onJoinMeeting,
  joinMeetingDisabled
}: Props): React.ReactElement {
  const { t } = useI18n()
  const locale = useUiStore((s) => s.locale)
  const [form] = Form.useForm<FormValues>()
  const [schedules, setSchedules] = useState<MeetingSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const durationOptions = useMemo(
    () =>
      DURATION_MINUTES.map((minutes) => ({
        value: minutes,
        label: t('plugin.meetingScheduleDurationOption', { minutes })
      })),
    [t]
  )

  const refresh = useCallback(async () => {
    const list = await getLanpmApi().meeting.listSchedules(groupId)
    setSchedules(list)
  }, [groupId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onCreate = async (values: FormValues): Promise<void> => {
    setLoading(true)
    try {
      await getLanpmApi().meeting.createSchedule({
        groupId,
        title: values.title.trim(),
        startsAt: values.startsAt.toDate().toISOString(),
        durationMinutes: values.durationMinutes
      })
      form.resetFields()
      form.setFieldsValue({ durationMinutes: 30, startsAt: dayjs().add(1, 'hour').minute(0) })
      await refresh()
      message.success(t('plugin.meetingScheduleCreated'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: string): Promise<void> => {
    try {
      await getLanpmApi().meeting.deleteSchedule({ id })
      await refresh()
      message.info(t('plugin.meetingScheduleDeleted'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onJoin = async (id: string): Promise<void> => {
    if (!onJoinMeeting) return
    setJoiningId(id)
    try {
      await onJoinMeeting()
      message.success(t('plugin.meetingJoinOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className={styles.meetingSchedulePanel} data-testid="meeting-schedule-panel">
      <Text type="secondary">{t('plugin.meetingScheduleHint')}</Text>
      <Form<FormValues>
        form={form}
        layout="vertical"
        size="small"
        className={styles.meetingScheduleForm}
        initialValues={{ durationMinutes: 30, startsAt: dayjs().add(1, 'hour').minute(0) }}
        onFinish={(values) => void onCreate(values)}
      >
        <Form.Item
          name="title"
          label={t('plugin.meetingScheduleTitle')}
          rules={[{ required: true, message: t('plugin.meetingScheduleTitleRequired') }]}
        >
          <Input disabled={disabled} maxLength={120} placeholder={t('plugin.meetingScheduleTitlePlaceholder')} />
        </Form.Item>
        <Form.Item
          name="startsAt"
          label={t('plugin.meetingScheduleStartsAt')}
          rules={[{ required: true, message: t('plugin.meetingScheduleStartsAtRequired') }]}
        >
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            disabled={disabled}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="durationMinutes" label={t('plugin.meetingScheduleDuration')}>
          <Select disabled={disabled} options={durationOptions} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} disabled={disabled} block>
          {t('plugin.meetingScheduleCreate')}
        </Button>
      </Form>

      {schedules.length > 0 ? (
        <>
          <Text strong className={styles.meetingScheduleListTitle}>
            {t('plugin.meetingScheduleUpcoming')}
          </Text>
          <List
            size="small"
            dataSource={schedules}
            renderItem={(item) => (
              <List.Item
                actions={[
                  ...(onJoinMeeting
                    ? [
                        <Button
                          key="join"
                          type="link"
                          size="small"
                          icon={<LoginOutlined />}
                          loading={joiningId === item.id}
                          disabled={disabled || joinMeetingDisabled}
                          aria-label={t('plugin.meetingScheduleJoin')}
                          data-testid="meeting-schedule-join"
                          onClick={() => void onJoin(item.id)}
                        >
                          {t('plugin.meetingScheduleJoin')}
                        </Button>
                      ]
                    : []),
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={disabled}
                    aria-label={t('plugin.meetingScheduleDelete')}
                    onClick={() => void onDelete(item.id)}
                  />
                ]}
              >
                <List.Item.Meta
                  title={item.title}
                  description={t('plugin.meetingScheduleListMeta', {
                    when: formatScheduleWhen(item.startsAt, locale),
                    minutes: item.durationMinutes
                  })}
                />
              </List.Item>
            )}
          />
        </>
      ) : (
        <Text type="secondary">{t('plugin.meetingScheduleEmpty')}</Text>
      )}
    </div>
  )
}
