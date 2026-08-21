import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import mammoth from 'mammoth'
import {
  escapeHtmlText,
  sanitizeOfficeHtmlFragment
} from '../../shared/file/officeLightPreview.ts'

const MAX_ROWS = 80
const MAX_COLS = 24

function wrapPreviewDocument(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><style>body{font-family:system-ui,sans-serif;margin:16px;color:#1d1d1f}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d2d2d7;padding:4px 8px;font-size:13px;text-align:left}</style></head><body>${body}</body></html>`
}

export async function convertOfficeLightHtml(
  srcPath: string,
  ext: string,
  outDir: string
): Promise<string | null> {
  const out = join(outDir, 'preview.html')
  const e = ext.toLowerCase().replace(/^\./, '')
  if (e === 'docx') {
    const result = await mammoth.convertToHtml({ path: srcPath })
    writeFileSync(out, wrapPreviewDocument(sanitizeOfficeHtmlFragment(result.value)), 'utf8')
    return out
  }
  if (e === 'xlsx') {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(srcPath)
    const sheet = wb.worksheets[0]
    if (!sheet) return null
    const rows: string[] = ['<table>']
    let r = 0
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (r >= MAX_ROWS) return
      r += 1
      const cells: string[] = []
      const last = Math.min(row.cellCount, MAX_COLS)
      for (let c = 1; c <= last; c++) {
        cells.push(`<td>${escapeHtmlText(row.getCell(c).text ?? '')}</td>`)
      }
      rows.push(`<tr>${cells.join('')}</tr>`)
    })
    rows.push('</table>')
    writeFileSync(out, wrapPreviewDocument(rows.join('')), 'utf8')
    return out
  }
  return null
}
