'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Point2D, ScaleCalibration } from '@/types'

interface ScaleCalibrationProps {
  /** Currently stored calibration (if any) */
  calibration: ScaleCalibration | null
  /** Callback when calibration is completed */
  onCalibrate: (calibration: ScaleCalibration) => void
  /** SVG coordinate conversion function */
  svgPoint: (e: React.MouseEvent<SVGSVGElement>) => Point2D
  /** Whether calibration mode is active */
  active: boolean
  /** Toggle calibration mode */
  onToggle: () => void
}

export function ScaleCalibrationControl({
  calibration,
  onCalibrate,
  active,
  onToggle,
}: ScaleCalibrationProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      title="Калибровка масштаба по линейке"
      className={active ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20" />
        <path d="M6 8v8" />
        <path d="M10 8v8" />
        <path d="M14 8v8" />
        <path d="M18 8v8" />
      </svg>
      Калибровка
    </Button>
  )
}

/** Render calibration markers on the SVG canvas */
export function ScaleCalibrationOverlay({
  calPoints,
  scale,
}: {
  calPoints: Point2D[]
  scale: number
}) {
  return (
    <g>
      {calPoints.map((p, i) => (
        <g key={`cal${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={6 / scale}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={2 / scale}
          />
          <text
            x={p.x + 10 / scale}
            y={p.y - 4 / scale}
            fontSize={11 / scale}
            fill="#d97706"
            fontWeight="bold"
          >
            {i === 0 ? 'Л1' : 'Л2'}
          </text>
        </g>
      ))}
      {calPoints.length === 2 && (
        <line
          x1={calPoints[0].x}
          y1={calPoints[0].y}
          x2={calPoints[1].x}
          y2={calPoints[1].y}
          stroke="#f59e0b"
          strokeWidth={2 / scale}
          strokeDasharray="6 3"
        />
      )}
    </g>
  )
}

/** Dialog that asks for the real distance after user clicks 2 points */
export function ScaleCalibrationDialog({
  open,
  onClose,
  point1,
  point2,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  point1: Point2D
  point2: Point2D
  onConfirm: (calibration: ScaleCalibration) => void
}) {
  const { toast } = useToast()
  const [distanceCm, setDistanceCm] = useState('')

  const pixelDistance = Math.sqrt(
    (point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2
  )

  const handleConfirm = useCallback(() => {
    const realCm = parseFloat(distanceCm)
    if (!realCm || realCm <= 0) {
      toast({ title: 'Ошибка', description: 'Введите корректное расстояние', variant: 'destructive' })
      return
    }
    const pixelsPerMm = pixelDistance / (realCm * 10)
    onConfirm({
      point1,
      point2,
      realDistanceCm: realCm,
      pixelsPerMm,
    })
    setDistanceCm('')
  }, [distanceCm, pixelDistance, point1, point2, onConfirm, toast])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Калибровка масштаба</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Укажите реальное расстояние между двумя отмеченными точками на линейке.
          </p>
          <div className="text-sm">
            <span className="text-muted-foreground">Расстояние в пикселях:</span>{' '}
            <span className="font-mono">{pixelDistance.toFixed(1)}</span>
          </div>
          <div className="space-y-2">
            <Label>Реальное расстояние (см)</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={distanceCm}
              onChange={(e) => setDistanceCm(e.target.value)}
              placeholder="Например: 10"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleConfirm}
            disabled={!distanceCm || parseFloat(distanceCm) <= 0}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
