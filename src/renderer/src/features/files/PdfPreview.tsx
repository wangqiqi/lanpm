import { useEffect, useRef, useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { PDFJS_WORKER_PUBLIC_PATH } from '@shared/file/pdfPreview'
import { useI18n } from '@renderer/i18n/useI18n'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import styles from './PdfPreview.module.css'

const { Text } = Typography

GlobalWorkerOptions.workerSrc = PDFJS_WORKER_PUBLIC_PATH

export default function PdfPreview({
  url,
  title
}: {
  url: string
  title: string
}): React.ReactElement {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    setLoading(true)
    setError(false)

    const task = getDocument({ url, withCredentials: false })
    void task.promise
      .then(async (pdf) => {
        if (cancelled) {
          await pdf.destroy()
          return
        }
        const total = pdf.numPages
        setPageCount(total)
        const pageNum = Math.min(Math.max(page, 1), total)
        const pdfPage = await pdf.getPage(pageNum)
        if (cancelled) {
          await pdf.destroy()
          return
        }
        const viewport = pdfPage.getViewport({ scale: 1.25 })
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas')
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise
        await pdf.destroy()
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [url, page])

  if (error) {
    return <ViewErrorCenter message={t('files.pdfLoadFailed')} />
  }

  return (
    <div className={styles.host}>
      <Space className={styles.toolbar} wrap>
        <Button
          size="small"
          disabled={loading || page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t('files.pdfPrev')}
        </Button>
        <Text type="secondary">
          {t('files.pdfPage', { current: String(page), total: String(pageCount || '…') })}
        </Text>
        <Button
          size="small"
          disabled={loading || pageCount === 0 || page >= pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          {t('files.pdfNext')}
        </Button>
      </Space>
      {loading ? <ViewLoadingCenter /> : null}
      <canvas ref={canvasRef} className={styles.canvas} aria-label={title} />
    </div>
  )
}
