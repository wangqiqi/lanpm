import { useMemo, type RefObject } from 'react'
import { Tour } from 'antd'
import type { TourProps } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'

interface DiscoverCoachmarkProps {
  open: boolean
  targetRef: RefObject<HTMLElement | null>
  onClose: () => void
}

export default function DiscoverCoachmark({
  open,
  targetRef,
  onClose
}: DiscoverCoachmarkProps): React.ReactElement {
  const { t } = useI18n()

  const steps = useMemo<TourProps['steps']>(
    () => [
      {
        title: t('discover.coachmarkTitle'),
        description: t('discover.coachmarkDescription'),
        target: () => targetRef.current ?? document.body,
        placement: 'bottom'
      }
    ],
    [t, targetRef]
  )

  return (
    <Tour
      open={open}
      onClose={onClose}
      onFinish={onClose}
      steps={steps}
      mask={{ color: 'rgba(0,0,0,0.45)' }}
      data-testid="discover-coachmark-tour"
    />
  )
}
