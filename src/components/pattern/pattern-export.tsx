'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Download, FileText } from 'lucide-react'
import type { Pattern, PatternPiece, Point2D, ScaleCalibration } from '@/types'

type ExportMode = 'plotter' | 'a4'

interface PatternExportProps {
  open: boolean
  onClose: () => void
  pattern: Pattern
}

// ============ SVG Generation Helpers ============

/** Convert points to SVG path data, with optional offset for seam allowance */
function pointsToPath(points: Point2D[], offsetX: number, offsetY: number): string {
  if (points.length === 0) return ''
  return (
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x + offsetX).toFixed(2)},${(p.y + offsetY).toFixed(2)}`)
      .join(' ') + ' Z'
  )
}

/** Compute seam allowance offset points (simple outward expansion from centroid) */
function computeSeamAllowancePoints(points: Point2D[], allowanceMm: number): Point2D[] {
  if (points.length < 3 || allowanceMm <= 0) return points

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2

  return points.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    return {
      x: p.x + (dx / dist) * allowanceMm,
      y: p.y + (dy / dist) * allowanceMm,
    }
  })
}

/** Convert piece points from pixel coords to mm using calibration, or use as-is (assuming 1 unit = 1mm) */
function piecePointsToMm(
  points: Point2D[],
  calibration: ScaleCalibration | null,
): Point2D[] {
  if (!calibration || calibration.pixelsPerMm <= 0) {
    // No calibration: assume points are already in mm (1 SVG unit = 1mm)
    return points
  }
  // Scale: convert pixel coordinates to mm
  const factor = 1 / calibration.pixelsPerMm
  return points.map((p) => ({
    x: Math.round(p.x * factor * 100) / 100,
    y: Math.round(p.y * factor * 100) / 100,
  }))
}

/** Generate a clean plotter SVG at 1:1 scale */
function generatePlotterSvg(pattern: Pattern): string {
  const MARGIN = 20 // mm margin
  const REF_SQUARE = 10 // 1cm reference square

  // Convert all pieces to mm coordinates
  const piecesMm = pattern.pieces.map((piece) => {
    const pts = piecePointsToMm(piece.points, piece.scaleCalibration ?? null)
    const seamAllowanceMm = (piece.seamAllowance ?? 0) * 10 // cm to mm
    const seamPts = computeSeamAllowancePoints(pts, seamAllowanceMm)
    return { piece, pts, seamPts, seamAllowanceMm }
  })

  // Calculate bounding boxes and layout positions (simple row layout)
  let currentX = MARGIN
  let currentY = MARGIN
  let rowMaxHeight = 0
  const maxPageWidth = 2000 // mm (plotter roll width)

  const layoutPieces = piecesMm.map(({ piece, pts, seamPts, seamAllowanceMm }) => {
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const seamXs = seamPts.map((p) => p.x)
    const seamYs = seamPts.map((p) => p.y)

    const minX = Math.min(...xs, ...seamXs)
    const minY = Math.min(...ys, ...seamYs)
    const maxX = Math.max(...xs, ...seamXs)
    const maxY = Math.max(...ys, ...seamYs)

    const w = maxX - minX
    const h = maxY - minY

    // Position piece
    if (currentX + w + MARGIN > maxPageWidth && currentX > MARGIN) {
      currentX = MARGIN
      currentY += rowMaxHeight + MARGIN
      rowMaxHeight = 0
    }

    const offsetX = currentX - minX
    const offsetY = currentY - minY

    currentX += w + MARGIN
    rowMaxHeight = Math.max(rowMaxHeight, h)

    return { piece, pts, seamPts, seamAllowanceMm, offsetX, offsetY, w, h }
  })

  const totalWidth = Math.max(
    MARGIN * 2 + REF_SQUARE + 5,
    ...layoutPieces.map((lp) => lp.offsetX + lp.w + MARGIN),
  )
  const totalHeight = currentY + rowMaxHeight + MARGIN

  // Build SVG content
  let svgContent = ''

  // Reference square
  const refX = MARGIN
  const refY = totalHeight - MARGIN - REF_SQUARE
  svgContent += `<rect x="${refX}" y="${refY}" width="${REF_SQUARE}" height="${REF_SQUARE}" fill="none" stroke="black" stroke-width="0.5"/>`
  svgContent += `<text x="${refX + REF_SQUARE / 2}" y="${refY + REF_SQUARE + 8}" font-size="6" text-anchor="middle" fill="black">1 см</text>`

  // Pattern name
  svgContent += `<text x="${MARGIN}" y="12" font-size="8" font-weight="bold" fill="black">${escapeXml(pattern.name)}</text>`

  layoutPieces.forEach(({ piece, pts, seamPts, seamAllowanceMm, offsetX, offsetY }) => {
    // Seam allowance (dashed)
    if (seamAllowanceMm > 0 && seamPts.length >= 3) {
      svgContent += `<path d="${pointsToPath(seamPts, offsetX, offsetY)}" fill="none" stroke="black" stroke-width="0.3" stroke-dasharray="3,2"/>`
    }

    // Contour line (solid)
    svgContent += `<path d="${pointsToPath(pts, offsetX, offsetY)}" fill="none" stroke="black" stroke-width="0.5"/>`

    // Grain line (dash-dot)
    if (piece.grainAngle !== 0) {
      const cX = pts.reduce((s, p) => s + p.x, 0) / pts.length + offsetX
      const cY = pts.reduce((s, p) => s + p.y, 0) / pts.length + offsetY
      const grainLen = 40 // mm
      const rad = (piece.grainAngle * Math.PI) / 180
      const gX1 = cX - Math.cos(rad) * grainLen / 2
      const gY1 = cY - Math.sin(rad) * grainLen / 2
      const gX2 = cX + Math.cos(rad) * grainLen / 2
      const gY2 = cY + Math.sin(rad) * grainLen / 2
      svgContent += `<line x1="${gX1.toFixed(2)}" y1="${gY1.toFixed(2)}" x2="${gX2.toFixed(2)}" y2="${gY2.toFixed(2)}" stroke="black" stroke-width="0.3" stroke-dasharray="5,2,1,2"/>`
      // Arrow heads
      const arrowSize = 3
      svgContent += `<polygon points="${gX2.toFixed(2)},${gY2.toFixed(2)} ${(gX2 - Math.cos(rad - 0.4) * arrowSize).toFixed(2)},${(gY2 - Math.sin(rad - 0.4) * arrowSize).toFixed(2)} ${(gX2 - Math.cos(rad + 0.4) * arrowSize).toFixed(2)},${(gY2 - Math.sin(rad + 0.4) * arrowSize).toFixed(2)}" fill="black"/>`
    }

    // Piece name label
    const labelX = pts.reduce((s, p) => s + p.x, 0) / pts.length + offsetX
    const labelY = pts.reduce((s, p) => s + p.y, 0) / pts.length + offsetY
    svgContent += `<text x="${labelX.toFixed(2)}" y="${(labelY - 3).toFixed(2)}" font-size="7" font-weight="bold" text-anchor="middle" fill="black">${escapeXml(piece.name)}</text>`
    if (piece.size) {
      svgContent += `<text x="${labelX.toFixed(2)}" y="${(labelY + 5).toFixed(2)}" font-size="5" text-anchor="middle" fill="black">р. ${escapeXml(piece.size)}</text>`
    }
  })

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight.toFixed(2)}" width="${totalWidth.toFixed(2)}mm" height="${totalHeight.toFixed(2)}mm">
  <style>
    text { font-family: Arial, sans-serif; }
  </style>
  ${svgContent}
</svg>`

  return svg
}

/** Generate A4 tiling as individual SVG files (returned as array for download) */
function generateA4Svgs(pattern: Pattern): { name: string; svg: string }[] {
  const A4_W = 210 // mm
  const A4_H = 297 // mm
  const OVERLAP = 5 // mm overlap for gluing
  const MARGIN = 5 // mm from edge
  const PRINTABLE_W = A4_W - MARGIN * 2
  const PRINTABLE_H = A4_H - MARGIN * 2

  // First generate the full plotter SVG content (we'll clip it per page)
  const plotterSvg = generatePlotterSvg(pattern)

  // For simplicity, we'll generate the full pattern and then tile it
  // Convert all pieces to mm coordinates and find total bounds
  const allPts: Point2D[] = []
  pattern.pieces.forEach((piece) => {
    const pts = piecePointsToMm(piece.points, piece.scaleCalibration ?? null)
    const seamAllowanceMm = (piece.seamAllowance ?? 0) * 10
    const seamPts = computeSeamAllowancePoints(pts, seamAllowanceMm)
    allPts.push(...pts, ...seamPts)
  })

  if (allPts.length === 0) return []

  const xs = allPts.map((p) => p.x)
  const ys = allPts.map((p) => p.y)
  const totalMinX = Math.min(...xs) - 15
  const totalMinY = Math.min(...ys) - 15
  const totalMaxX = Math.max(...xs) + 15
  const totalMaxY = Math.max(...ys) + 15
  const totalWidth = totalMaxX - totalMinX
  const totalHeight = totalMaxY - totalMinY

  // Calculate grid of pages
  const cols = Math.ceil(totalWidth / (PRINTABLE_W - OVERLAP))
  const rows = Math.ceil(totalHeight / (PRINTABLE_H - OVERLAP))

  if (cols <= 0 || rows <= 0) return []

  const pages: { name: string; svg: string }[] = []
  const colLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pageLabel = `${colLabels[col] || col + 1}${row + 1}`
      const pageName = `pattern-${pattern.name}-A4-${pageLabel}`

      const clipX = totalMinX + col * (PRINTABLE_W - OVERLAP)
      const clipY = totalMinY + row * (PRINTABLE_H - OVERLAP)
      const clipW = PRINTABLE_W
      const clipH = PRINTABLE_H

      let pageContent = ''

      // Clip path for this page
      pageContent += `<defs><clipPath id="pageClip"><rect x="${clipX}" y="${clipY}" width="${clipW}" height="${clipH}"/></clipPath></defs>`

      // Alignment marks (crosshairs + triangles at corners)
      const marks = [
        { x: clipX, y: clipY },
        { x: clipX + clipW, y: clipY },
        { x: clipX, y: clipY + clipH },
        { x: clipX + clipW, y: clipY + clipH },
      ]
      marks.forEach((m) => {
        // Crosshair
        pageContent += `<line x1="${m.x - 5}" y1="${m.y}" x2="${m.x + 5}" y2="${m.y}" stroke="#999" stroke-width="0.3"/>`
        pageContent += `<line x1="${m.x}" y1="${m.y - 5}" x2="${m.x}" y2="${m.y + 5}" stroke="#999" stroke-width="0.3"/>`
        // Small triangle
        pageContent += `<polygon points="${m.x},${m.y - 3} ${m.x + 3},${m.y + 2} ${m.x - 3},${m.y + 2}" fill="none" stroke="#999" stroke-width="0.3"/>`
      })

      // Dashed cut lines at page boundaries
      pageContent += `<rect x="${clipX}" y="${clipY}" width="${clipW}" height="${clipH}" fill="none" stroke="#ccc" stroke-width="0.3" stroke-dasharray="4,2"/>`

      // Draw pieces (clipped)
      const pageOffsetX = 0 // No offset, pieces already have absolute coords in the full view
      const pageOffsetY = 0

      pageContent += `<g clip-path="url(#pageClip)">`

      // Render each piece
      pattern.pieces.forEach((piece) => {
        const pts = piecePointsToMm(piece.points, piece.scaleCalibration ?? null)
        const seamAllowanceMm = (piece.seamAllowance ?? 0) * 10
        const seamPts = computeSeamAllowancePoints(pts, seamAllowanceMm)

        // Seam allowance
        if (seamAllowanceMm > 0 && seamPts.length >= 3) {
          pageContent += `<path d="${pointsToPath(seamPts, pageOffsetX, pageOffsetY)}" fill="none" stroke="black" stroke-width="0.3" stroke-dasharray="3,2"/>`
        }
        // Contour
        pageContent += `<path d="${pointsToPath(pts, pageOffsetX, pageOffsetY)}" fill="none" stroke="black" stroke-width="0.5"/>`
        // Grain line
        if (piece.grainAngle !== 0) {
          const cX = pts.reduce((s, p) => s + p.x, 0) / pts.length + pageOffsetX
          const cY = pts.reduce((s, p) => s + p.y, 0) / pts.length + pageOffsetY
          const grainLen = 40
          const rad = (piece.grainAngle * Math.PI) / 180
          const gX1 = cX - Math.cos(rad) * grainLen / 2
          const gY1 = cY - Math.sin(rad) * grainLen / 2
          const gX2 = cX + Math.cos(rad) * grainLen / 2
          const gY2 = cY + Math.sin(rad) * grainLen / 2
          pageContent += `<line x1="${gX1.toFixed(2)}" y1="${gY1.toFixed(2)}" x2="${gX2.toFixed(2)}" y2="${gY2.toFixed(2)}" stroke="black" stroke-width="0.3" stroke-dasharray="5,2,1,2"/>`
        }
        // Label (only if center is within page bounds)
        const labelX = pts.reduce((s, p) => s + p.x, 0) / pts.length + pageOffsetX
        const labelY = pts.reduce((s, p) => s + p.y, 0) / pts.length + pageOffsetY
        if (labelX >= clipX && labelX <= clipX + clipW && labelY >= clipY && labelY <= clipY + clipH) {
          pageContent += `<text x="${labelX.toFixed(2)}" y="${(labelY - 3).toFixed(2)}" font-size="7" font-weight="bold" text-anchor="middle" fill="black">${escapeXml(piece.name)}</text>`
        }
      })

      pageContent += `</g>`

      // Page label
      pageContent += `<text x="${clipX + 5}" y="${clipY + 8}" font-size="8" font-weight="bold" fill="black">${pageLabel}</text>`

      // Small overview map
      const mapW = 30
      const mapH = Math.min(40, (totalHeight / totalWidth) * mapW)
      const mapX = clipX + clipW - mapW - 3
      const mapY = clipY + 3
      pageContent += `<rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" fill="white" stroke="#999" stroke-width="0.3"/>`
      // Highlight current page on map
      const pageMapX = mapX + (col / cols) * mapW
      const pageMapY = mapY + (row / rows) * mapH
      const pageMapW = mapW / cols
      const pageMapH = mapH / rows
      pageContent += `<rect x="${pageMapX}" y="${pageMapY}" width="${pageMapW}" height="${pageMapH}" fill="rgba(16,185,129,0.4)" stroke="#059669" stroke-width="0.3"/>`

      // Overlap zone indicator
      if (OVERLAP > 0) {
        // Right overlap
        if (col < cols - 1) {
          pageContent += `<rect x="${clipX + clipW - OVERLAP}" y="${clipY}" width="${OVERLAP}" height="${clipH}" fill="rgba(245,158,11,0.08)" stroke="none"/>`
        }
        // Bottom overlap
        if (row < rows - 1) {
          pageContent += `<rect x="${clipX}" y="${clipY + clipH - OVERLAP}" width="${clipW}" height="${OVERLAP}" fill="rgba(245,158,11,0.08)" stroke="none"/>`
        }
      }

      // Reference square
      const refSqX = clipX + 5
      const refSqY = clipY + clipH - 15
      pageContent += `<rect x="${refSqX}" y="${refSqY}" width="10" height="10" fill="none" stroke="black" stroke-width="0.3"/>`
      pageContent += `<text x="${refSqX + 5}" y="${refSqY + 18}" font-size="4" text-anchor="middle" fill="black">1 см</text>`

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${clipX} ${clipY} ${clipW} ${clipH}" width="${A4_W}mm" height="${A4_H}mm">
  <style>
    text { font-family: Arial, sans-serif; }
  </style>
  ${pageContent}
</svg>`

      pages.push({ name: pageName, svg })
    }
  }

  return pages
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function downloadSvg(svgContent: string, filename: string) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadMultipleSvgs(pages: { name: string; svg: string }[]) {
  // Download each SVG individually (ZIP would need a library, so we download sequentially)
  pages.forEach((page, i) => {
    setTimeout(() => {
      downloadSvg(page.svg, `${page.name}.svg`)
    }, i * 300) // Stagger downloads to avoid browser blocking
  })
}

export function PatternExport({ open, onClose, pattern }: PatternExportProps) {
  const { toast } = useToast()
  const [mode, setMode] = useState<ExportMode>('plotter')

  const handleExport = useCallback(() => {
    try {
      if (mode === 'plotter') {
        const svg = generatePlotterSvg(pattern)
        const filename = `pattern-${pattern.name}-plotter.svg`
        downloadSvg(svg, filename)
        toast({ title: 'Экспорт завершён', description: `Файл ${filename} сохранён` })
      } else {
        const pages = generateA4Svgs(pattern)
        if (pages.length === 0) {
          toast({ title: 'Нет данных', description: 'Нет деталей для экспорта', variant: 'destructive' })
          return
        }
        downloadMultipleSvgs(pages)
        toast({
          title: 'Экспорт завершён',
          description: `Скачано ${pages.length} страниц А4`,
        })
      }
    } catch (err) {
      console.error('Export error:', err)
      toast({ title: 'Ошибка экспорта', description: 'Не удалось сгенерировать файл', variant: 'destructive' })
    }
  }, [mode, pattern, toast])

  // Preview info
  const previewInfo = useMemo(() => {
    if (pattern.pieces.length === 0) return null

    const A4_W = 210
    const A4_H = 297
    const OVERLAP = 5
    const MARGIN = 5

    const allPts: Point2D[] = []
    pattern.pieces.forEach((piece) => {
      const pts = piecePointsToMm(piece.points, piece.scaleCalibration ?? null)
      const seamAllowanceMm = (piece.seamAllowance ?? 0) * 10
      const seamPts = computeSeamAllowancePoints(pts, seamAllowanceMm)
      allPts.push(...pts, ...seamPts)
    })

    if (allPts.length === 0) return null

    const xs = allPts.map((p) => p.x)
    const ys = allPts.map((p) => p.y)
    const totalWidth = Math.max(...xs) - Math.min(...xs) + 30
    const totalHeight = Math.max(...ys) - Math.min(...ys) + 30

    const cols = Math.ceil(totalWidth / (A4_W - MARGIN * 2 - OVERLAP))
    const rows = Math.ceil(totalHeight / (A4_H - MARGIN * 2 - OVERLAP))

    return {
      totalWidth: totalWidth.toFixed(0),
      totalHeight: totalHeight.toFixed(0),
      a4Pages: cols * rows,
      cols,
      rows,
    }
  }, [pattern])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Экспорт лекала</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ExportMode)}>
            <div className="flex items-start space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => setMode('plotter')}>
              <RadioGroupItem value="plotter" id="export-plotter" className="mt-0.5" />
              <div>
                <Label htmlFor="export-plotter" className="cursor-pointer font-medium">
                  Плоттер
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Один SVG-файл в масштабе 1:1 для плоттерной резки
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50" onClick={() => setMode('a4')}>
              <RadioGroupItem value="a4" id="export-a4" className="mt-0.5" />
              <div>
                <Label htmlFor="export-a4" className="cursor-pointer font-medium">
                  А4 (разбивка на страницы)
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Несколько SVG-файлов формата А4 с метками совмещения
                </p>
              </div>
            </div>
          </RadioGroup>

          {previewInfo && (
            <div className="text-sm space-y-1 p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Размер:</span>
                <span>{previewInfo.totalWidth} × {previewInfo.totalHeight} мм</span>
              </div>
              {mode === 'a4' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Страниц А4:</span>
                    <span>{previewInfo.a4Pages} ({previewInfo.cols}×{previewInfo.rows})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Нахлёст для склейки:</span>
                    <span>5 мм</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Деталей:</span>
                <span>{pattern.pieces.length}</span>
              </div>
            </div>
          )}

          {mode === 'plotter' && (
            <p className="text-xs text-muted-foreground">
              SVG в масштабе 1:1. Контур — сплошная линия, припуск — пунктирная, долевая — штрих-пунктирная. Эталонный квадрат 1 см в углу.
            </p>
          )}
          {mode === 'a4' && (
            <p className="text-xs text-muted-foreground">
              Каждая страница содержит метки совмещения (кресты + треугольники), номер страницы и мини-карту расположения. Серая зона — нахлёст для склейки.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleExport}
            disabled={pattern.pieces.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Скачать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
