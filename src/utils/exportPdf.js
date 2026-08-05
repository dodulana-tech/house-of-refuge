/*
  PDF export for dashboard tables.

  Renders a branded, print-ready document into a hidden iframe and opens the
  browser print dialog, where the user picks "Save as PDF". This is how the rest
  of the HOR document set is produced (HTML -> PDF), and it keeps the bundle free
  of a PDF library. An iframe is used rather than window.open() so popup blockers
  never intercept the export.
*/

const BLUE = '#1A5FAD'
const CHARCOAL = '#2B2D42'
const GREY = '#8B8FA8'

function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/*
  columns: [{ key, label, align?, width? }]
  rows:    array of objects, or of arrays matching columns order
  summary: [{ label, value }] rendered as a strip under the title
  footNote: confidentiality / handling line printed on every page
*/
export function buildTableDocument({
  title,
  subtitle = '',
  meta = [],
  summary = [],
  columns = [],
  rows = [],
  footNote = '',
  landscape = false,
}) {
  const cell = (row, col, i) => (Array.isArray(row) ? row[i] : row[col.key])

  const head = columns
    .map(c => `<th style="text-align:${c.align || 'left'}${c.width ? `;width:${c.width}` : ''}">${escapeHtml(c.label)}</th>`)
    .join('')

  const body = rows.length
    ? rows
        .map(row => `<tr>${columns
          .map((c, i) => `<td style="text-align:${c.align || 'left'}">${escapeHtml(cell(row, c, i))}</td>`)
          .join('')}</tr>`)
        .join('')
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:${GREY};padding:28px 0">No records.</td></tr>`

  const summaryStrip = summary.length
    ? `<div class="summary">${summary
        .map(s => `<div class="sum"><div class="sumV">${escapeHtml(s.value)}</div><div class="sumL">${escapeHtml(s.label)}</div></div>`)
        .join('')}</div>`
    : ''

  const metaLine = meta.length
    ? `<div class="meta">${meta.map(m => escapeHtml(m)).join(' &nbsp;·&nbsp; ')}</div>`
    : ''

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: ${CHARCOAL}; font-size: 10.5px; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .brand { display:flex; align-items:baseline; gap:10px; border-bottom:2px solid ${BLUE}; padding-bottom:8px; margin-bottom:14px; }
  .wordmark { font-size:12px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:${BLUE}; }
  .facility { font-size:9px; letter-spacing:.08em; text-transform:uppercase; color:${GREY}; }
  h1 { font-size:17px; margin:0 0 3px; letter-spacing:-.01em; }
  .sub { font-size:10.5px; color:${GREY}; margin:0 0 8px; }
  .meta { font-size:9.5px; color:${GREY}; margin-bottom:14px; }
  .summary { display:flex; gap:10px; flex-wrap:wrap; margin:0 0 16px; }
  .sum { border:1px solid #E5E9EE; border-radius:5px; padding:8px 14px; min-width:104px; }
  .sumV { font-size:14px; font-weight:700; color:${BLUE}; }
  .sumL { font-size:8.5px; letter-spacing:.06em; text-transform:uppercase; color:${GREY}; margin-top:1px; }
  table { width:100%; border-collapse:collapse; }
  thead { display:table-header-group; }
  th {
    font-size:8.5px; letter-spacing:.07em; text-transform:uppercase; color:${GREY};
    border-bottom:1.5px solid ${BLUE}; padding:0 8px 5px; font-weight:700;
  }
  td { padding:6px 8px; border-bottom:1px solid #EDF1F5; vertical-align:top; }
  tr { break-inside:avoid; page-break-inside:avoid; }
  .foot { margin-top:18px; padding-top:8px; border-top:1px solid #EDF1F5; font-size:8.5px; color:${GREY}; }
</style></head>
<body>
  <div class="brand">
    <span class="wordmark">House of Refuge</span>
    <span class="facility">Rehabilitation Centre &middot; Lekki, Lagos</span>
  </div>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ''}
  ${metaLine}
  ${summaryStrip}
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  ${footNote ? `<div class="foot">${escapeHtml(footNote)}</div>` : ''}
</body></html>`
}

/* Renders the document off-screen and opens the print dialog. */
export function printHtml(html) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('title', 'Print preview')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'

  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) return
    const done = () => setTimeout(() => frame.remove(), 500)
    win.onafterprint = done
    try {
      win.focus()
      win.print()
    } catch {
      done()
    }
    // Browsers that never fire afterprint (some Safari versions) still get cleaned up.
    setTimeout(done, 60000)
  }

  document.body.appendChild(frame)
  frame.srcdoc = html
}

export function exportTableAsPdf(options) {
  printHtml(buildTableDocument(options))
}

/* "29 July 2026 at 19:42" — stamped on every export so printed copies are datable. */
export function exportStamp(d = new Date()) {
  return d.toLocaleString('en-NG', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(',', ' at')
}
