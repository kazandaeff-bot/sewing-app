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
import type { Point2D } from '@/types'

type SymmetryAxis = 'vertical' | 'horizontal' | 'custom'

interface SymmetryDialogProps {
  open: boolean
  onClose: () => void
  points: Point2D[]
  grainPoints: Point2D[]
  onApply: (newPoints: Point2D[], newGrainPoints: Point2D[]) => void
  /** Custom axis points, provided when user clicks on canvas in custom mode */
  customAxisPoints?: Point2D[]
  /** Called when user selects "custom" axis — dialog closes and canvas enters axis selection mode */
  onCustomAxisStart?: () => void
}

/** Reflect a point across a vertical axis at x = mirrorX */
function reflectVertical(p: Point2D, mirrorX: number): Point2D {
  return { x: 2 * mirrorX - p.x, y: p.y }
}

/** Reflect a point across a horizontal axis at y = mirrorY */
function reflectHorizontal(p: Point2D, mirrorY: number): Point2D {
  return { x: p.x, y: 2 * mirrorY - p.y }
}

/** Reflect a point across a line defined by two points */
function reflectAcrossLine(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return p

  // Project point onto the line
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  const projX = a.x + t * dx
  const projY = a.y + t * dy

  return {
    x: 2 * projX - p.x,
    y: 2 * projY - p.y,
  }
}

/** Generate symmetric contour: original points + mirrored points (reversed) */
function createSymmetricContour(
  originalPoints: Point2D[],
  mirroredPoints: Point2D[],
): Point2D[] {
  // Combine: original points + mirrored points in reverse order
  // This creates a closed symmetric shape
  const reversed = [...mirroredPoints].reverse()
  return [...originalPoints, ...reversed]
}

export function SymmetryDialog({
  open,
  onClose,
  points,
  grainPoints,
  onApply,
  customAxisPoints = [],
  onCustomAxisStart,
}: SymmetryDialogProps) {
  const [axis, setAxis] = useState<SymmetryAxis>('vertical')

  // Calculate mirror axis position based on current points
  const mirrorAxis = useMemo(() => {
    if (points.length === 0) return { mirrorX: 0, mirrorY: 0 }

    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      mirrorX: (minX + maxX) / 2,
      mirrorY: (minY + maxY) / 2,
    }
  }, [points])

  // Calculate mirrored points for preview
  const mirroredPoints = useMemo(() => {
    if (points.length === 0) return []

    if (axis === 'vertical') {
      return points.map((p) => reflectVertical(p, mirrorAxis.mirrorX))
    } else if (axis === 'horizontal') {
      return points.map((p) => reflectHorizontal(p, mirrorAxis.mirrorY))
    } else if (axis === 'custom' && customAxisPoints.length === 2) {
      return points.map((p) => reflectAcrossLine(p, customAxisPoints[0], customAxisPoints[1]))
    }
    return []
  }, [points, axis, mirrorAxis, customAxisPoints])

  // Mirror grain points
  const mirroredGrainPoints = useMemo(() => {
    if (grainPoints.length < 2) return []

    if (axis === 'vertical') {
      return grainPoints.map((p) => reflectVertical(p, mirrorAxis.mirrorX))
    } else if (axis === 'horizontal') {
      return grainPoints.map((p) => reflectHorizontal(p, mirrorAxis.mirrorY))
    } else if (axis === 'custom' && customAxisPoints.length === 2) {
      return grainPoints.map((p) => reflectAcrossLine(p, customAxisPoints[0], customAxisPoints[1]))
    }
    return []
  }, [grainPoints, axis, mirrorAxis, customAxisPoints])

  // Combined grain line for symmetric shape: original + mirrored
  const newGrainPoints = useMemo(() => {
    if (grainPoints.length < 2 || mirroredGrainPoints.length < 2) return grainPoints
    // Keep the original grain line for the combined shape
    return grainPoints
  }, [grainPoints, mirroredGrainPoints])

  const handleApply = useCallback(() => {
    if (mirroredPoints.length === 0) return

    const symmetricPoints = createSymmetricContour(points, mirroredPoints)
    onApply(symmetricPoints, newGrainPoints)
    onClose()
  }, [points, mirroredPoints, newGrainPoints, onApply, onClose])

  // Build preview SVG
  const previewSvg = useMemo(() => {
    if (points.length === 0) return null

    const allPts = [...points, ...mirroredPoints]
    const xs = allPts.map((p) => p.x)
    const ys = allPts.map((p) => p.y)
    const minX = Math.min(...xs) - 20
    const minY = Math.min(...ys) - 20
    const maxX = Math.max(...xs) + 20
    const maxY = Math.max(...ys) + 20
    const w = maxX - minX
    const h = maxY - minY

    const origPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x - minX},${p.y - minY}`)
      .join(' ') + ' Z'
    const mirrorPath = mirroredPoints.length > 0
      ? mirroredPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x - minX},${p.y - minY}`)
          .join(' ') + ' Z'
      : ''

    // Axis line
    let axisLine = ''
    if (axis === 'vertical') {
      const ax = mirrorAxis.mirrorX - minX
      axisLine = `M${ax},0 L${ax},${h}`
    } else if (axis === 'horizontal') {
      const ay = mirrorAxis.mirrorY - minY
      axisLine = `M0,${ay} L${w},${ay}`
    } else if (axis === 'custom' && customAxisPoints.length === 2) {
      const a = { x: customAxisPoints[0].x - minX, y: customAxisPoints[0].y - minY }
      const b = { x: customAxisPoints[1].x - minX, y: customAxisPoints[1].y - minY }
      // Extend line
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      axisLine = `M${a.x - (dx / len) * 500},${a.y - (dy / len) * 500} L${b.x + (dx / len) * 500},${b.y + (dy / len) * 500}`
    }

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48 bg-white rounded border">
        {/* Mirror axis */}
        {axisLine && (
          <path d={axisLine} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" fill="none" />
        )}
        {/* Original outline */}
        {points.length >= 3 && (
          <path d={origPath} fill="rgba(16,185,129,0.15)" stroke="#059669" strokeWidth={1.5} />
        )}
        {/* Mirrored outline (ghost) */}
        {mirroredPoints.length >= 3 && (
          <path d={mirrorPath} fill="rgba(16,185,129,0.08)" stroke="#059669" strokeWidth={1} strokeDasharray="4 2" />
        )}
      </svg>
    )
  }, [points, mirroredPoints, axis, mirrorAxis, customAxisPoints])

  const canApply = useMemo(() => {
    if (axis === 'custom') return customAxisPoints.length === 2 && mirroredPoints.length > 0
    return mirroredPoints.length > 0
  }, [axis, customAxisPoints, mirroredPoints])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Симметрия</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Ось симметрии</Label>
            <RadioGroup value={axis} onValueChange={(v) => setAxis(v as SymmetryAxis)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vertical" id="sym-vertical" />
                <Label htmlFor="sym-vertical" className="cursor-pointer">
                  Вертикальная (зеркало лево-право)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="horizontal" id="sym-horizontal" />
                <Label htmlFor="sym-horizontal" className="cursor-pointer">
                  Горизонтальная (зеркало верх-низ)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="sym-custom" />
                <Label htmlFor="sym-custom" className="cursor-pointer">
                  Произвольная (2 точки на холсте)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {axis === 'custom' && customAxisPoints.length < 2 && (
            <div className="space-y-2">
              <p className="text-sm text-amber-600">
                Укажите 2 точки оси симметрии на холсте (после закрытия диалога)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  if (onCustomAxisStart) onCustomAxisStart()
                }}
              >
                Указать на холсте
              </Button>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Предпросмотр</Label>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-emerald-600" /> Оригинал
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 border-t border-dashed border-emerald-600" /> Зеркальная
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 border-t border-dashed border-amber-500" /> Ось
              </span>
            </div>
            {previewSvg}
          </div>

          {canApply && (
            <p className="text-sm text-muted-foreground">
              Будет создан симметричный контур из {points.length + mirroredPoints.length} точек.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApply}
            disabled={!canApply}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
