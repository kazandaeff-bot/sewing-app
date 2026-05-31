import { db } from '@/lib/db'
import { validateQuery, withAuth, SessionUser } from '@/lib/api-auth'
import { PrintQuerySchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

// ─── Shared HTML wrapper ────────────────────────────────────────────────────

function printDocument(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      color: #000;
      line-height: 1.4;
    }

    .document {
      max-width: 100%;
      padding: 0;
    }

    /* ── Company header ── */
    .company-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    .company-header .company-name {
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .company-header .company-sub {
      font-size: 9pt;
      color: #444;
      margin-top: 2px;
    }

    /* ── Document title ── */
    .doc-title {
      text-align: center;
      font-size: 16pt;
      font-weight: 700;
      margin: 14px 0 6px;
      text-transform: uppercase;
    }

    .doc-subtitle {
      text-align: center;
      font-size: 11pt;
      margin-bottom: 4px;
    }

    .doc-info {
      text-align: center;
      font-size: 10pt;
      color: #333;
      margin-bottom: 16px;
    }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 10pt;
    }

    table th,
    table td {
      border: 1px solid #000;
      padding: 5px 7px;
      text-align: left;
      vertical-align: middle;
    }

    table th {
      background: #f0f0f0;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    table td.num {
      text-align: center;
    }

    table tr.total-row td {
      font-weight: 700;
      border-top: 2px solid #000;
    }

    /* ── Footer signatures ── */
    .footer {
      margin-top: 28px;
    }

    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 18px;
      font-size: 10pt;
    }

    .signature-block {
      width: 45%;
    }

    .signature-block .label {
      margin-bottom: 4px;
    }

    .signature-block .line {
      border-bottom: 1px solid #000;
      height: 28px;
    }

    .date-line {
      text-align: right;
      font-size: 10pt;
      margin-top: 12px;
    }

    /* ── Print rules ── */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      table th {
        background: #eee !important;
      }

      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    ${bodyContent}
  </div>
</body>
</html>`
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function todayFormatted(): string {
  return formatDate(new Date())
}

// ─── Cutting Plan ───────────────────────────────────────────────────────────

async function generateCuttingPlan(id: string): Promise<string> {
  const cuttingPlan = await db.cuttingPlan.findUnique({
    where: { id },
    include: {
      plan: { select: { name: true, deadline: true } },
      items: {
        include: { product: { select: { name: true, article: true } } },
        orderBy: [{ productId: 'asc' }, { size: 'asc' }, { color: 'asc' }],
      },
    },
  })

  if (!cuttingPlan) {
    throw new Error('NOT_FOUND')
  }

  const planName = cuttingPlan.plan.name
  const label = cuttingPlan.label || ''
  const date = formatDate(cuttingPlan.createdAt)
  const titleSuffix = label ? ` (${label})` : ''

  let totalPlanned = 0
  let totalActual = 0

  const rows = cuttingPlan.items
    .map((item) => {
      totalPlanned += item.plannedQty
      const actual = item.actualQty ?? 0
      totalActual += actual
      return `<tr>
        <td>${item.product.name}</td>
        <td class="num">${item.size}</td>
        <td>${item.color}</td>
        <td class="num">${item.plannedQty}</td>
        <td class="num">${item.actualQty ?? '—'}</td>
      </tr>`
    })
    .join('')

  const body = `
    <div class="company-header">
      <div class="company-name">ПРОИЗВОДСТВО</div>
      <div class="company-sub">Производственный учёт</div>
    </div>

    <div class="doc-title">Раскройный план</div>
    <div class="doc-subtitle">${planName}${titleSuffix}</div>
    <div class="doc-info">Дата: ${date}&nbsp;&nbsp;|&nbsp;&nbsp;Статус: ${cuttingPlan.status === 'cut' ? 'раскроен' : 'в работе'}</div>

    <table>
      <thead>
        <tr>
          <th>Изделие</th>
          <th>Размер</th>
          <th>Цвет</th>
          <th>План, шт</th>
          <th>Факт, шт</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><strong>Итого</strong></td>
          <td class="num"><strong>${totalPlanned}</strong></td>
          <td class="num"><strong>${cuttingPlan.items.some(i => i.actualQty !== null) ? totalActual : '—'}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="signature-line">
        <div class="signature-block">
          <div class="label">Ответственный:</div>
          <div class="line"></div>
        </div>
        <div class="signature-block">
          <div class="label">Подпись:</div>
          <div class="line"></div>
        </div>
      </div>
      <div class="date-line">Дата: «___» ___________ 20__ г.</div>
    </div>
  `

  return printDocument(`Раскройный план — ${planName}`, body)
}

// ─── Sewing Task ────────────────────────────────────────────────────────────

async function generateSewingTask(id: string): Promise<string> {
  const sewingTask = await db.sewingTask.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true, code: true } },
      cuttingPlan: {
        select: { label: true, plan: { select: { name: true } } },
      },
      items: {
        include: { product: { select: { name: true, article: true } }, reworks: true },
        orderBy: [{ productId: 'asc' }, { size: 'asc' }, { color: 'asc' }],
      },
    },
  })

  if (!sewingTask) {
    throw new Error('NOT_FOUND')
  }

  const employeeName = sewingTask.employee.name
  const planName = sewingTask.cuttingPlan.plan.name
  const taskDate = formatDate(sewingTask.createdAt)
  const taskNumber = sewingTask.id.slice(-6).toUpperCase()

  let totalQty = 0
  let totalActual = 0
  let totalDefects = 0

  const rows = sewingTask.items
    .map((item) => {
      totalQty += item.quantity
      const actual = item.actualQuantity ?? 0
      totalActual += actual
      const defectTotal = item.reworks.reduce((s, r) => s + r.quantity, 0) + item.fabricDefect
      totalDefects += defectTotal
      return `<tr>
        <td>${item.product.name}</td>
        <td class="num">${item.size}</td>
        <td>${item.color}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${item.actualQuantity ?? '—'}</td>
        <td class="num">${defectTotal > 0 ? defectTotal : '—'}</td>
      </tr>`
    })
    .join('')

  const body = `
    <div class="company-header">
      <div class="company-name">ПРОИЗВОДСТВО</div>
      <div class="company-sub">Производственный учёт</div>
    </div>

    <div class="doc-title">Задание на пошив</div>
    <div class="doc-subtitle">№ ${taskNumber}</div>
    <div class="doc-info">Швея: ${employeeName}&nbsp;&nbsp;|&nbsp;&nbsp;План: ${planName}&nbsp;&nbsp;|&nbsp;&nbsp;Дата: ${taskDate}</div>

    <table>
      <thead>
        <tr>
          <th>Изделие</th>
          <th>Размер</th>
          <th>Цвет</th>
          <th>Кол-во, шт</th>
          <th>Факт, шт</th>
          <th>Брак</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><strong>Итого</strong></td>
          <td class="num"><strong>${totalQty}</strong></td>
          <td class="num"><strong>${sewingTask.items.some(i => i.actualQuantity !== null) ? totalActual : '—'}</strong></td>
          <td class="num"><strong>${totalDefects > 0 ? totalDefects : '—'}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="signature-line">
        <div class="signature-block">
          <div class="label">Выдал:</div>
          <div class="line"></div>
        </div>
        <div class="signature-block">
          <div class="label">Принял:</div>
          <div class="line"></div>
        </div>
      </div>
      <div class="date-line">Дата: «___» ___________ 20__ г.</div>
    </div>
  `

  return printDocument(`Задание на пошив №${taskNumber}`, body)
}

// ─── Packing List ───────────────────────────────────────────────────────────

async function generatePackingList(id: string): Promise<string> {
  // Try to find as Box first
  const box = await db.box.findUnique({
    where: { id },
    include: {
      sellerPlan: { select: { sellerName: true, status: true } },
      boxType: { select: { name: true } },
      items: {
        include: { product: { select: { name: true, article: true } } },
        orderBy: [{ productId: 'asc' }, { size: 'asc' }, { color: 'asc' }],
      },
    },
  })

  if (box) {
    return generatePackingListForBox(box)
  }

  // Try as SellerPlan
  const sellerPlan = await db.sellerPlan.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      boxes: {
        include: {
          items: {
            include: { product: { select: { name: true, article: true } } },
            orderBy: [{ productId: 'asc' }, { size: 'asc' }, { color: 'asc' }],
          },
        },
        orderBy: { boxNumber: 'asc' },
      },
    },
  })

  if (sellerPlan) {
    return generatePackingListForSellerPlan(sellerPlan)
  }

  throw new Error('NOT_FOUND')
}

function generatePackingListForBox(
  box: {
    boxNumber: number
    city: string
    status: string
    sellerPlan: { sellerName: string; status: string }
    boxType: { name: string } | null
    items: {
      product: { name: string; article: string }
      size: string
      color: string
      plannedQty: number
      actualQty: number | null
    }[]
    createdAt: Date | string
  }
): string {
  let totalPlanned = 0
  let totalActual = 0

  const rows = box.items
    .map((item) => {
      totalPlanned += item.plannedQty
      const actual = item.actualQty ?? 0
      totalActual += actual
      return `<tr>
        <td>${item.product.name}</td>
        <td class="num">${item.size}</td>
        <td>${item.color}</td>
        <td class="num">${item.plannedQty}</td>
        <td class="num">${item.actualQty ?? '—'}</td>
      </tr>`
    })
    .join('')

  const body = `
    <div class="company-header">
      <div class="company-name">ПРОИЗВОДСТВО</div>
      <div class="company-sub">Производственный учёт</div>
    </div>

    <div class="doc-title">Упаковочный лист</div>
    <div class="doc-subtitle">Короб № ${box.boxNumber}${box.boxType ? ` (${box.boxType.name})` : ''}</div>
    <div class="doc-info">Город: ${box.city}&nbsp;&nbsp;|&nbsp;&nbsp;Заказ: ${box.sellerPlan.sellerName}&nbsp;&nbsp;|&nbsp;&nbsp;Дата: ${formatDate(box.createdAt)}</div>

    <table>
      <thead>
        <tr>
          <th>Изделие</th>
          <th>Размер</th>
          <th>Цвет</th>
          <th>План, шт</th>
          <th>Факт, шт</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><strong>Итого</strong></td>
          <td class="num"><strong>${totalPlanned}</strong></td>
          <td class="num"><strong>${box.items.some(i => i.actualQty !== null) ? totalActual : '—'}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="signature-line">
        <div class="signature-block">
          <div class="label">Упаковал:</div>
          <div class="line"></div>
        </div>
        <div class="signature-block">
          <div class="label">Проверил:</div>
          <div class="line"></div>
        </div>
      </div>
      <div class="date-line">Дата: «___» ___________ 20__ г.</div>
    </div>
  `

  return printDocument(`Упаковочный лист — Короб №${box.boxNumber}`, body)
}

function generatePackingListForSellerPlan(
  sellerPlan: {
    sellerName: string
    customer: { name: string } | null
    boxes: {
      boxNumber: number
      city: string
      items: {
        product: { name: string; article: string }
        size: string
        color: string
        plannedQty: number
        actualQty: number | null
      }[]
    }[]
    createdAt: Date | string
  }
): string {
  let grandTotalPlanned = 0
  let grandTotalActual = 0

  const boxSections = sellerPlan.boxes
    .map((box) => {
      let boxPlanned = 0
      let boxActual = 0

      const rows = box.items
        .map((item) => {
          boxPlanned += item.plannedQty
          const actual = item.actualQty ?? 0
          boxActual += actual
          return `<tr>
            <td>${item.product.name}</td>
            <td class="num">${item.size}</td>
            <td>${item.color}</td>
            <td class="num">${item.plannedQty}</td>
            <td class="num">${item.actualQty ?? '—'}</td>
          </tr>`
        })
        .join('')

      grandTotalPlanned += boxPlanned
      grandTotalActual += boxActual

      return `
        <h3 style="font-size:11pt; margin: 14px 0 6px; border-bottom: 1px solid #999; padding-bottom: 3px;">Короб № ${box.boxNumber} — г. ${box.city}</h3>
        <table>
          <thead>
            <tr>
              <th>Изделие</th>
              <th>Размер</th>
              <th>Цвет</th>
              <th>План, шт</th>
              <th>Факт, шт</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="3"><strong>Итого по коробу</strong></td>
              <td class="num"><strong>${boxPlanned}</strong></td>
              <td class="num"><strong>${box.items.some(i => i.actualQty !== null) ? boxActual : '—'}</strong></td>
            </tr>
          </tbody>
        </table>
      `
    })
    .join('')

  const customerInfo = sellerPlan.customer ? `Заказчик: ${sellerPlan.customer.name}&nbsp;&nbsp;|&nbsp;&nbsp;` : ''

  const body = `
    <div class="company-header">
      <div class="company-name">ПРОИЗВОДСТВО</div>
      <div class="company-sub">Производственный учёт</div>
    </div>

    <div class="doc-title">Упаковочный лист</div>
    <div class="doc-subtitle">${sellerPlan.sellerName}</div>
    <div class="doc-info">${customerInfo}Коробов: ${sellerPlan.boxes.length}&nbsp;&nbsp;|&nbsp;&nbsp;Дата: ${formatDate(sellerPlan.createdAt)}</div>

    ${boxSections}

    <table style="margin-top: 8px;">
      <tbody>
        <tr class="total-row">
          <td colspan="3" style="font-size:11pt;"><strong>ОБЩИЙ ИТОГ</strong></td>
          <td class="num" style="font-size:11pt;"><strong>${grandTotalPlanned}</strong></td>
          <td class="num" style="font-size:11pt;"><strong>${grandTotalActual > 0 ? grandTotalActual : '—'}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="signature-line">
        <div class="signature-block">
          <div class="label">Упаковал:</div>
          <div class="line"></div>
        </div>
        <div class="signature-block">
          <div class="label">Проверил:</div>
          <div class="line"></div>
        </div>
      </div>
      <div class="date-line">Дата: «___» ___________ 20__ г.</div>
    </div>
  `

  return printDocument(`Упаковочный лист — ${sellerPlan.sellerName}`, body)
}

// ─── Route handler ──────────────────────────────────────────────────────────

export const GET = withAuth(async (request: NextRequest, _ctx, _user: SessionUser) => {
  try {
    const qResult = validateQuery(request, PrintQuerySchema)
    if ('error' in qResult) return qResult.error
    const { type, id } = qResult.data

    let html: string

    switch (type) {
      case 'cutting-plan':
        html = await generateCuttingPlan(id)
        break

      case 'sewing-task':
        html = await generateSewingTask(id)
        break

      case 'packing-list':
        html = await generatePackingList(id)
        break

      default:
        return NextResponse.json(
          { error: `Неизвестный тип документа: ${type}. Доступные: cutting-plan, sewing-task, packing-list` },
          { status: 400 }
        )
    }

    return NextResponse.json(
      { html },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      )
    }
    console.error('Print document error:', error)
    return NextResponse.json(
      { error: 'Ошибка генерации документа для печати' },
      { status: 500 }
    )
  }
})
