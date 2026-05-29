import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportElementToPng(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--lanpm-bg') || '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false
  })
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('GANTT_EXPORT_PNG_FAILED'))), 'image/png')
  })
  downloadBlob(blob, filename)
}

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false
  })
  const img = canvas.toDataURL('image/png')
  const w = canvas.width
  const h = canvas.height
  const orientation = w > h ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] })
  pdf.addImage(img, 'PNG', 0, 0, w, h)
  pdf.save(filename)
}
