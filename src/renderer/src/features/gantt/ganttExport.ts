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

function ganttExportBackground(): string {
  const fromCss = getComputedStyle(document.documentElement)
    .getPropertyValue('--lanpm-bg')
    .trim()
  return fromCss || '#ffffff'
}

interface SavedStyle {
  el: HTMLElement
  display: string
  overflow: string
  width: string
  height: string
  maxWidth: string
  maxHeight: string
}

export interface GanttExportLayout {
  width: number
  height: number
}

/** 从 gantt-task-react DOM 测量完整导出尺寸（日历头 + 任务网格） */
export function measureGanttExportLayout(root: HTMLElement, headerHeight = 50): GanttExportLayout {
  const calendarSvg = root.querySelector('svg .calendar')?.closest('svg') as SVGSVGElement | null
  const gridSvg =
    (calendarSvg?.parentElement?.querySelector('div svg') as SVGSVGElement | null) ??
    (root.querySelector('svg:not(:first-of-type)') as SVGSVGElement | null)

  const width = Math.max(
    Number.parseInt(calendarSvg?.getAttribute('width') ?? '0', 10),
    Number.parseInt(gridSvg?.getAttribute('width') ?? '0', 10),
    root.scrollWidth
  )
  const calendarHeight =
    Number.parseInt(calendarSvg?.getAttribute('height') ?? '0', 10) || headerHeight
  const gridHeight = Number.parseInt(gridSvg?.getAttribute('height') ?? '0', 10)
  const height = calendarHeight + gridHeight

  return { width: Math.max(width, 1), height: Math.max(height, 1) }
}

function findGanttExportRoot(container: HTMLElement): HTMLElement {
  const outer = container.firstElementChild as HTMLElement | null
  return outer ?? container
}

function findGanttContentWrapper(root: HTMLElement): HTMLElement | null {
  const calendarSvg = root.querySelector('svg .calendar')?.closest('svg')
  return (calendarSvg?.parentElement as HTMLElement | null) ?? null
}

function prepareGanttFullCapture(container: HTMLElement): {
  target: HTMLElement
  saved: SavedStyle[]
} {
  const root = findGanttExportRoot(container)
  const wrapper = findGanttContentWrapper(root)
  const target = wrapper ?? root
  const layout = measureGanttExportLayout(target)
  const saved: SavedStyle[] = []

  const stash = (el: HTMLElement, patch: Partial<SavedStyle>): void => {
    saved.push({
      el,
      display: el.style.display,
      overflow: el.style.overflow,
      width: el.style.width,
      height: el.style.height,
      maxWidth: el.style.maxWidth,
      maxHeight: el.style.maxHeight
    })
    if (patch.display !== undefined) el.style.display = patch.display
    if (patch.overflow !== undefined) el.style.overflow = patch.overflow
    if (patch.width !== undefined) el.style.width = patch.width
    if (patch.height !== undefined) el.style.height = patch.height
    if (patch.maxWidth !== undefined) el.style.maxWidth = patch.maxWidth
    if (patch.maxHeight !== undefined) el.style.maxHeight = patch.maxHeight
  }

  container.scrollTop = 0
  container.scrollLeft = 0

  stash(container, {
    overflow: 'visible',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  })

  stash(target, {
    overflow: 'visible',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  })

  target.querySelectorAll('div').forEach((node) => {
    stash(node as HTMLElement, { overflow: 'visible', maxWidth: 'none', maxHeight: 'none' })
  })

  // 隐藏水平/垂直滚动条占位，避免导出图底部或右侧留白
  for (const child of root.children) {
    if (child !== wrapper) stash(child as HTMLElement, { display: 'none' })
  }
  if (wrapper) {
    for (const child of wrapper.children) {
      const childEl = child as HTMLElement
      if (!childEl.querySelector('svg .calendar')) {
        stash(childEl, { display: 'none' })
      }
    }
  }

  return { target, saved }
}

function restoreGanttFullCapture(saved: SavedStyle[]): void {
  for (const item of saved) {
    item.el.style.display = item.display
    item.el.style.overflow = item.overflow
    item.el.style.width = item.width
    item.el.style.height = item.height
    item.el.style.maxWidth = item.maxWidth
    item.el.style.maxHeight = item.maxHeight
  }
}

async function captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  const layout = measureGanttExportLayout(element)
  return html2canvas(element, {
    backgroundColor: ganttExportBackground(),
    scale: 2,
    useCORS: true,
    logging: false,
    width: layout.width,
    height: layout.height,
    scrollX: 0,
    scrollY: 0,
    windowWidth: layout.width,
    windowHeight: layout.height
  })
}

export async function exportGanttChart(
  container: HTMLElement,
  filename: string,
  format: 'png' | 'pdf'
): Promise<void> {
  const { target, saved } = prepareGanttFullCapture(container)
  try {
    const canvas = await captureElement(target)
    if (format === 'png') {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('GANTT_EXPORT_PNG_FAILED'))),
          'image/png'
        )
      })
      downloadBlob(blob, filename)
      return
    }

    const img = canvas.toDataURL('image/png')
    const w = canvas.width
    const h = canvas.height
    const orientation = w > h ? 'landscape' : 'portrait'
    const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] })
    pdf.addImage(img, 'PNG', 0, 0, w, h)
    pdf.save(filename)
  } finally {
    restoreGanttFullCapture(saved)
  }
}
