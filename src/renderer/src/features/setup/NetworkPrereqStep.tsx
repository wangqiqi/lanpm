import { Button } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import logoUrl from '@resources/logo.svg'
import NetworkPrereqContent from './NetworkPrereqContent'
import styles from './SetupWizard.module.css'

interface NetworkPrereqStepProps {
  onContinue: () => void
  onSkip: () => void
}

export default function NetworkPrereqStep({
  onContinue,
  onSkip
}: NetworkPrereqStepProps): React.ReactElement {
  const { t } = useI18n()

  return (
    <div className={styles.sheet}>
      <header className={styles.hero}>
        <img src={logoUrl} alt="" className={styles.appIcon} width={64} height={64} />
        <h1 className={styles.title}>{t('setup.netTitle')}</h1>
        <p className={styles.subtitle}>{t('setup.netSubtitle')}</p>
      </header>

      <NetworkPrereqContent />

      <Button type="primary" block className={styles.submitBtn} onClick={onContinue}>
        {t('setup.netContinue')}
      </Button>
      <Button type="link" block className={styles.skipBtn} onClick={onSkip} data-testid="setup-net-skip">
        {t('setup.netSkip')}
      </Button>
    </div>
  )
}
