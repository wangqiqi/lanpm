import { useState } from 'react'
import { Button, Segmented } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import logoUrl from '@resources/logo.svg'
import styles from './SetupWizard.module.css'

export type NetworkPrereqScenario = 'switch' | 'router' | 'hotspot'

interface NetworkPrereqStepProps {
  onContinue: () => void
  onSkip: () => void
}

function SwitchIllustration(): React.ReactElement {
  return (
    <svg viewBox="0 0 320 160" className={styles.netSvg} aria-hidden>
      <rect x="120" y="48" width="80" height="40" rx="8" className={styles.netDevice} />
      <text x="160" y="73" textAnchor="middle" className={styles.netSvgLabel}>
        SW
      </text>
      {[40, 160, 280].map((x) => (
        <g key={x}>
          <line x1={x} y1="120" x2="160" y2="88" className={styles.netWire} />
          <rect x={x - 28} y="120" width="56" height="32" rx="6" className={styles.netPc} />
        </g>
      ))}
    </svg>
  )
}

function RouterIllustration(): React.ReactElement {
  return (
    <svg viewBox="0 0 320 160" className={styles.netSvg} aria-hidden>
      <rect x="120" y="52" width="80" height="36" rx="8" className={styles.netDevice} />
      <path
        d="M136 62 q24 -18 48 0"
        fill="none"
        className={styles.netWave}
        strokeWidth="2"
      />
      <path
        d="M128 66 q32 -10 64 0"
        fill="none"
        className={styles.netWave}
        strokeWidth="2"
      />
      {[56, 264].map((x) => (
        <g key={x}>
          <line x1={x} y1="120" x2="160" y2="88" className={styles.netWire} />
          <rect x={x - 28} y="120" width="56" height="32" rx="6" className={styles.netPc} />
        </g>
      ))}
    </svg>
  )
}

function HotspotIllustration(): React.ReactElement {
  return (
    <svg viewBox="0 0 320 160" className={styles.netSvg} aria-hidden>
      <rect x="56" y="72" width="40" height="64" rx="8" className={styles.netDevice} />
      <path
        d="M76 84 q20 -16 40 0 M68 92 q28 -8 56 0"
        fill="none"
        className={styles.netWave}
        strokeWidth="2"
      />
      <line x1="96" y1="104" x2="200" y2="104" className={styles.netWire} />
      <rect x="200" y="88" width="64" height="40" rx="6" className={styles.netPc} />
    </svg>
  )
}

const SCENARIO_ILLUSTRATION: Record<NetworkPrereqScenario, () => React.ReactElement> = {
  switch: SwitchIllustration,
  router: RouterIllustration,
  hotspot: HotspotIllustration
}

const SCENARIO_DESC_KEYS: Record<NetworkPrereqScenario, MessageKey> = {
  switch: 'setup.netScenarioSwitchDesc',
  router: 'setup.netScenarioRouterDesc',
  hotspot: 'setup.netScenarioHotspotDesc'
} as const

export default function NetworkPrereqStep({
  onContinue,
  onSkip
}: NetworkPrereqStepProps): React.ReactElement {
  const { t } = useI18n()
  const [scenario, setScenario] = useState<NetworkPrereqScenario>('switch')
  const Illustration = SCENARIO_ILLUSTRATION[scenario]

  return (
    <div className={styles.sheet}>
      <header className={styles.hero}>
        <img src={logoUrl} alt="" className={styles.appIcon} width={64} height={64} />
        <h1 className={styles.title}>{t('setup.netTitle')}</h1>
        <p className={styles.subtitle}>{t('setup.netSubtitle')}</p>
      </header>

      <Segmented
        block
        className={styles.netSegmented}
        value={scenario}
        onChange={(value) => setScenario(value as NetworkPrereqScenario)}
        options={[
          { label: t('setup.netScenarioSwitch'), value: 'switch' },
          { label: t('setup.netScenarioRouter'), value: 'router' },
          { label: t('setup.netScenarioHotspot'), value: 'hotspot' }
        ]}
      />

      <div className={styles.netIllustration} aria-hidden>
        <Illustration />
      </div>

      <p className={styles.netScenarioDesc}>{t(SCENARIO_DESC_KEYS[scenario])}</p>
      <p className={styles.footnote}>{t('setup.netFootnote')}</p>

      <Button type="primary" block className={styles.submitBtn} onClick={onContinue}>
        {t('setup.netContinue')}
      </Button>
      <Button type="link" block className={styles.skipBtn} onClick={onSkip}>
        {t('setup.netSkip')}
      </Button>
    </div>
  )
}
