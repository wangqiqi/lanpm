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
  calendarHeight: number
  gridHeight: number
}

export interface GanttSvgElements {
  ganttBody: HTMLElement
  calendarSvg: SVGSVGElement
  gridSvg: SVGSVGElement
  horizontalContainer: HTMLElement
}

export function findGanttSvgElements(container: HTMLElement): GanttSvgElements | null {
  const calendarSvg = container.querySelector('svg .calendar')?.closest('svg') as SVGSVGElement | null
  if (!calendarSvg) return null

  const ganttBody = calendarSvg.parentElement as HTMLElement | null
  if (!ganttBody) return null

  const horizontalContainer = Array.from(ganttBody.children).find(
    (child): child is HTMLElement => child.tagName === 'DIV'
  )
  if (!horizontalContainer) return null

  const gridSvg = horizontalContainer.querySelector('svg') as SVGSVGElement | null
  if (!gridSvg) return null

  return { ganttBody, calendarSvg, gridSvg, horizontalContainer }
}

export interface GanttExportOptions {
  taskCount: number
  rowHeight: number
  headerHeight?: number
}

/** 从 gantt-task-react DOM 测量完整导出尺寸（日历头 + 全部任务行） */
export function measureGanttExportLayout(
  elements: GanttSvgElements,
  opts?: Pick<GanttExportOptions, 'taskCount' | 'rowHeight' | 'headerHeight'>
): GanttExportLayout {
  const { calendarSvg, gridSvg, ganttBody } = elements
  const headerHeight = opts?.headerHeight ?? 50

  const calendarHeight =
    Number.parseInt(calendarSvg.getAttribute('height') ?? '0', 10) ||
    calendarSvg.height.baseVal.value ||
    headerHeight
  const svgGridHeight =
    Number.parseInt(gridSvg.getAttribute('height') ?? '0', 10) || gridSvg.height.baseVal.value || 0
  const expectedGridHeight = opts ? opts.taskCount * opts.rowHeight : 0
  const gridHeight = Math.max(svgGridHeight, expectedGridHeight)

  const width = Math.max(
    Number.parseInt(calendarSvg.getAttribute('width') ?? '0', 10) || calendarSvg.width.baseVal.value,
    Number.parseInt(gridSvg.getAttribute('width') ?? '0', 10) || gridSvg.width.baseVal.value,
    ganttBody.scrollWidth
  )
  const height = calendarHeight + gridHeight

  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
    calendarHeight,
    gridHeight
  }
}

function findGanttExportRoot(container: HTMLElement): HTMLElement {
  const outer = container.firstElementChild as HTMLElement | null
  return outer ?? container
}

function applyExpandedGanttStyles(
  container: HTMLElement,
  elements: GanttSvgElements,
  layout: GanttExportLayout,
  stash: (el: HTMLElement, patch: Partial<SavedStyle>) => void
): void {
  const { ganttBody, horizontalContainer } = elements
  const root = findGanttExportRoot(container)
  const flexWrapper = ganttBody.parentElement

  container.scrollTop = 0
  container.scrollLeft = 0
  horizontalContainer.scrollTop = 0
  horizontalContainer.scrollLeft = 0

  stash(container, {
    overflow: 'visible',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  })

  stash(ganttBody, {
    overflow: 'visible',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  })

  stash(horizontalContainer, {
    overflow: 'visible',
    width: `${layout.width}px`,
    height: `${layout.gridHeight}px`,
    maxWidth: 'none',
    maxHeight: 'none'
  })

  ganttBody.querySelectorAll('div').forEach((node) => {
    if (node === horizontalContainer) return
    stash(node as HTMLElement, { overflow: 'visible', maxWidth: 'none', maxHeight: 'none' })
  })

  if (flexWrapper) {
    for (const child of root.children) {
      if (child !== flexWrapper) stash(child as HTMLElement, { display: 'none' })
    }
    for (const child of flexWrapper.children) {
      if (child !== ganttBody) stash(child as HTMLElement, { display: 'none' })
    }
  } else {
    for (const child of root.children) {
      if (child !== ganttBody) stash(child as HTMLElement, { display: 'none' })
    }
  }
}

function patchClonedGantt(root: HTMLElement, layout: GanttExportLayout): void {
  const elements = findGanttSvgElements(root)
  if (!elements) return

  const { ganttBody, horizontalContainer } = elements
  ganttBody.style.overflow = 'visible'
  ganttBody.style.width = `${layout.width}px`
  ganttBody.style.height = `${layout.height}px`
  ganttBody.style.maxWidth = 'none'
  ganttBody.style.maxHeight = 'none'

  horizontalContainer.style.overflow = 'visible'
  horizontalContainer.style.width = `${layout.width}px`
  horizontalContainer.style.height = `${layout.gridHeight}px`
  horizontalContainer.style.maxWidth = 'none'
  horizontalContainer.style.maxHeight = 'none'
  horizontalContainer.scrollTop = 0
  horizontalContainer.scrollLeft = 0
}

function prepareGanttFullCapture(
  container: HTMLElement,
  opts: GanttExportOptions
): {
  target: HTMLElement
  layout: GanttExportLayout
  saved: SavedStyle[]
} {
  const elements = findGanttSvgElements(container)
  if (!elements) {
    const root = findGanttExportRoot(container)
    return { target: root, layout: { width: 1, height: 1, calendarHeight: 1, gridHeight: 0 }, saved: [] }
  }

  const layout = measureGanttExportLayout(elements, opts)
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

  applyExpandedGanttStyles(container, elements, layout, stash)

  return { target: elements.ganttBody, layout, saved }
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

async function waitForLayout(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function captureElement(
  element: HTMLElement,
  layout: GanttExportLayout
): Promise<HTMLCanvasElement> {
  await waitForLayout()

  return html2canvas(element, {
    backgroundColor: ganttExportBackground(),
    scale: 2,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: layout.width,
    height: layout.height,
    windowWidth: layout.width,
    windowHeight: layout.height,
    onclone: (_clonedDoc, clonedElement) => {
      patchClonedGantt(clonedElement, layout)
    }
  })
}

export async function exportGanttChart(
  container: HTMLElement,
  filename: string,
  format: 'png' | 'pdf',
  opts: GanttExportOptions
): Promise<void> {
  const { target, layout, saved } = prepareGanttFullCapture(container, opts)
  if (layout.gridHeight <= 0) {
    throw new Error('err.ganttExportEmpty')
  }

  try {
    const canvas = await captureElement(target, layout)
    if (format === 'png') {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('err.ganttExportPngFailed'))),
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
