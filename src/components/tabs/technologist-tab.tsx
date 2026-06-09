'use client'

import { useState, useCallback, useRef, useMemo, type ReactElement } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  Loader2,
  Ruler,
  ZoomIn,
  ZoomOut,
  Undo2,
  ImagePlus,
  RotateCcw,
  Move,
  Pen,
  ChevronRight,
  Scissors,
  FileCheck,
  Archive,
  Camera,
  FlipHorizontal2,
  Download,
} from 'lucide-react'

import type { Pattern, PatternPiece, Point2D, ScaleCalibration } from '@/types'
import { ScaleCalibrationControl, ScaleCalibrationOverlay, ScaleCalibrationDialog } from '@/components/pattern/scale-calibration'
import { CameraCapture } from '@/components/pattern/camera-capture'
import { SymmetryDialog } from '@/components/pattern/symmetry-dialog'
import { PatternExport } from '@/components/pattern/pattern-export'

// ============ Helpers ============

function calcBoundingBox(points: Point2D[]): { width: number; height: number } {
  if (points.length === 0) return { width: 0, height: 0 }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { width: Math.round((maxX - minX) * 10) / 10, height: Math.round((maxY - minY) * 10) / 10 }
}

function statusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Черновик</Badge>
    case 'ready':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Готово</Badge>
    case 'archived':
      return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Архив</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function nextStatus(current: string): string | null {
  if (current === 'draft') return 'ready'
  if (current === 'ready') return 'archived'
  return null
}

function nextStatusLabel(current: string): string | null {
  if (current === 'draft') return 'Готово'
  if (current === 'ready') return 'В архив'
  return null
}

// ============ SVG Grid Component ============

function SvgGrid({ width, height, scale }: { width: number; height: number; scale: number }) {
  const gridStep = 10 // 1cm in SVG units (1 unit = 1mm conceptually, 10 units = 1cm)
  const lines: ReactElement[] = []
  for (let x = 0; x <= width; x += gridStep) {
    lines.push(
      <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e5e7eb" strokeWidth={0.5} />,
    )
  }
  for (let y = 0; y <= height; y += gridStep) {
    lines.push(
      <line key={`hz${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />,
    )
  }
  // Major grid every 10cm
  const majorStep = 100
  for (let x = 0; x <= width; x += majorStep) {
    lines.push(
      <line key={`mvx${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#d1d5db" strokeWidth={1} />,
    )
  }
  for (let y = 0; y <= height; y += majorStep) {
    lines.push(
      <line key={`mhz${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#d1d5db" strokeWidth={1} />,
    )
  }
  // Labels
  for (let x = majorStep; x <= width; x += majorStep) {
    lines.push(
      <text key={`lx${x}`} x={x + 2} y={12} fontSize={9 / scale} fill="#9ca3af">{`${x / 10}`}</text>,
    )
  }
  for (let y = majorStep; y <= height; y += majorStep) {
    lines.push(
      <text key={`ly${y}`} x={2} y={y - 2} fontSize={9 / scale} fill="#9ca3af">{`${y / 10}`}</text>,
    )
  }
  return <g>{lines}</g>
}

// ============ Piece Editor (SVG Canvas) ============

interface PieceEditorProps {
  patternId: string
  existingPiece?: PatternPiece | null
  onSave: (piece: PatternPiece) => void
  onCancel: () => void
}

function PieceEditor({ patternId, existingPiece, onSave, onCancel }: PieceEditorProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // State
  const [points, setPoints] = useState<Point2D[]>(existingPiece?.points ?? [])
  const [polygonClosed, setPolygonClosed] = useState(existingPiece ? existingPiece.points.length >= 3 : false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [bgImageData, setBgImageData] = useState<HTMLImageElement | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [cursorPos, setCursorPos] = useState<Point2D | null>(null)
  const [pieceName, setPieceName] = useState(existingPiece?.name ?? '')
  const [pieceSize, setPieceSize] = useState(existingPiece?.size ?? '')
  const [seamAllowance, setSeamAllowance] = useState(existingPiece?.seamAllowance ?? 1)
  const [quantity, setQuantity] = useState(existingPiece?.quantity ?? 1)
  const [grainPoints, setGrainPoints] = useState<Point2D[]>(
    existingPiece && existingPiece.grainAngle !== 0
      ? [
          { x: 0, y: 0 },
          {
            x: Math.round(Math.cos((existingPiece.grainAngle * Math.PI) / 180) * 50 * 10) / 10,
            y: Math.round(Math.sin((existingPiece.grainAngle * Math.PI) / 180) * 50 * 10) / 10,
          },
        ]
      : [],
  )
  const [settingGrain, setSettingGrain] = useState(false)
  const [saving, setSaving] = useState(false)

  // Scale calibration state
  const [calibrating, setCalibrating] = useState(false)
  const [calPoints, setCalPoints] = useState<Point2D[]>([])
  const [calDialogOpen, setCalDialogOpen] = useState(false)
  const [scaleCalibration, setScaleCalibration] = useState<ScaleCalibration | null>(
    existingPiece?.scaleCalibration ?? null,
  )

  // Camera capture state
  const [cameraOpen, setCameraOpen] = useState(false)

  // Symmetry state
  const [symmetryOpen, setSymmetryOpen] = useState(false)
  const [settingCustomAxis, setSettingCustomAxis] = useState(false)
  const [customAxisPoints, setCustomAxisPoints] = useState<Point2D[]>([])

  // Export state
  const [exportOpen, setExportOpen] = useState(false)

  const canvasW = 800
  const canvasH = 600

  // Calculate effective scale (derived from viewBox)
  const scale = canvasW / viewBox.w

  // Handle background image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        setBgImage(url)
        const img = new Image()
        img.onload = () => setBgImageData(img)
        img.src = url
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  // SVG coordinate conversion
  const svgPoint = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): Point2D => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x
      const y = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
    },
    [viewBox],
  )

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Middle button or ctrl+left for panning
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      if (e.button !== 0) return

      const pt = svgPoint(e)

      // Setting grain direction
      if (settingGrain) {
        if (grainPoints.length < 2) {
          setGrainPoints((prev) => [...prev, pt])
          if (grainPoints.length === 1) {
            setSettingGrain(false)
          }
        }
        return
      }

      // Custom symmetry axis — 2 clicks
      if (settingCustomAxis) {
        if (customAxisPoints.length < 2) {
          setCustomAxisPoints((prev) => [...prev, pt])
          if (customAxisPoints.length === 1) {
            // Wait for second click
          } else {
            setSettingCustomAxis(false)
            setSymmetryOpen(true)
          }
        }
        return
      }

      // Calibration mode — 2 clicks on ruler
      if (calibrating) {
        if (calPoints.length < 2) {
          setCalPoints((prev) => [...prev, pt])
          if (calPoints.length === 1) {
            // Wait for second click
          } else {
            setCalibrating(false)
            setCalDialogOpen(true)
          }
        }
        return
      }

      // If polygon is closed, no more points
      if (polygonClosed) return

      // Check if close to first point (close polygon)
      if (points.length >= 3) {
        const first = points[0]
        const dist = Math.sqrt((pt.x - first.x) ** 2 + (pt.y - first.y) ** 2)
        if (dist < 5 / scale) {
          setPolygonClosed(true)
          return
        }
      }

      // Add point
      setPoints((prev) => [...prev, pt])
    },
    [svgPoint, settingGrain, grainPoints, polygonClosed, points, scale, settingCustomAxis, customAxisPoints, calibrating, calPoints],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning) {
        const dx = ((e.clientX - panStart.x) / (svgRef.current?.getBoundingClientRect().width ?? 1)) * viewBox.w
        const dy = ((e.clientY - panStart.y) / (svgRef.current?.getBoundingClientRect().height ?? 1)) * viewBox.h
        setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }))
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      const pt = svgPoint(e)
      setCursorPos(pt)

      // Drag point
      if (dragIdx !== null) {
        setPoints((prev) => prev.map((p, i) => (i === dragIdx ? pt : p)))
      }
    },
    [isPanning, panStart, viewBox, svgPoint, dragIdx],
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDragIdx(null)
  }, [])

  const handlePointDragStart = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation()
      setDragIdx(idx)
    },
    [],
  )

  // Zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const pt = svgPoint(e)
      setViewBox((prev) => {
        const newW = prev.w / factor
        const newH = prev.h / factor
        const newX = pt.x - ((pt.x - prev.x) / prev.w) * newW
        const newY = pt.y - ((pt.y - prev.y) / prev.h) * newH
        return { x: newX, y: newY, w: newW, h: newH }
      })
    },
    [svgPoint],
  )

  // Undo last point
  const undoPoint = useCallback(() => {
    if (polygonClosed) {
      setPolygonClosed(false)
      return
    }
    setPoints((prev) => prev.slice(0, -1))
  }, [polygonClosed])

  // Reset view
  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: canvasW, h: canvasH })
  }, [])

  // Zoom buttons
  const zoomIn = useCallback(() => {
    setViewBox((prev) => {
      const factor = 0.8
      const newW = prev.w * factor
      const newH = prev.h * factor
      const cx = prev.x + prev.w / 2
      const cy = prev.y + prev.h / 2
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }
    })
  }, [])

  const zoomOut = useCallback(() => {
    setViewBox((prev) => {
      const factor = 1.25
      const newW = prev.w * factor
      const newH = prev.h * factor
      const cx = prev.x + prev.w / 2
      const cy = prev.y + prev.h / 2
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }
    })
  }, [])

  // Fit to points
  const fitToPoints = useCallback(() => {
    if (points.length === 0) {
      resetView()
      return
    }
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs) - 20
    const minY = Math.min(...ys) - 20
    const maxX = Math.max(...xs) + 20
    const maxY = Math.max(...ys) + 20
    setViewBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY })
  }, [points, resetView])

  // Grain angle
  const grainAngle = useMemo(() => {
    if (grainPoints.length < 2) return 0
    const dx = grainPoints[1].x - grainPoints[0].x
    const dy = grainPoints[1].y - grainPoints[0].y
    return Math.round((Math.atan2(dy, dx) * 180) / Math.PI)
  }, [grainPoints])

  // Bounding box
  const bbox = useMemo(() => calcBoundingBox(points), [points])

  // Save piece
  const handleSave = useCallback(async () => {
    if (!pieceName.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название детали', variant: 'destructive' })
      return
    }
    if (points.length < 3) {
      toast({ title: 'Ошибка', description: 'Нужно минимум 3 точки', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const body = {
        name: pieceName.trim(),
        size: pieceSize.trim() || null,
        points,
        width: bbox.width,
        height: bbox.height,
        grainAngle,
        seamAllowance,
        quantity,
        notches: null,
        scaleCalibration,
      }

      let res: Response
      if (existingPiece) {
        res = await authFetch(`/api/patterns/${patternId}/pieces/${existingPiece.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await authFetch(`/api/patterns/${patternId}/pieces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Ошибка', description: data.error || 'Не удалось сохранить', variant: 'destructive' })
        return
      }

      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      queryClient.invalidateQueries({ queryKey: ['pattern', patternId] })
      toast({ title: existingPiece ? 'Деталь обновлена' : 'Деталь добавлена' })
      onSave(data)
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить деталь', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [
    pieceName,
    pieceSize,
    points,
    bbox,
    grainAngle,
    seamAllowance,
    quantity,
    scaleCalibration,
    existingPiece,
    patternId,
    onSave,
    toast,
    queryClient,
  ])

  // Build polygon path
  const polygonPath = useMemo(() => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + (polygonClosed ? ' Z' : '')
  }, [points, polygonClosed])

  // Seam allowance offset path (simplified)
  const seamPath = useMemo(() => {
    if (!polygonClosed || points.length < 3 || seamAllowance <= 0) return ''
    const offset = seamAllowance * 10 // Convert cm to SVG units
    // Simple offset: expand bounding box
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const expanded = points.map((p) => {
      const dx = p.x - cx
      const dy = p.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      return { x: p.x + (dx / dist) * offset, y: p.y + (dy / dist) * offset }
    })
    return expanded.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  }, [points, polygonClosed, seamAllowance])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <h3 className="text-lg font-semibold">
          {existingPiece ? `Редактирование: ${existingPiece.name}` : 'Новая деталь'}
        </h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* SVG Canvas */}
        <div className="flex-1" ref={containerRef}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={zoomIn} title="Приблизить">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={zoomOut} title="Отдалить">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fitToPoints} title="Вписать">
              <Ruler className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView} title="Сбросить вид">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              variant={settingGrain ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSettingGrain(!settingGrain)
                setGrainPoints([])
              }}
              title="Долевая нить"
              className={settingGrain ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              <Move className="h-4 w-4 mr-1" />
              Долевая
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={undoPoint}
              disabled={points.length === 0 && !polygonClosed}
              title="Отменить точку"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            {/* Calibration button */}
            <ScaleCalibrationControl
              calibration={scaleCalibration}
              onCalibrate={(cal) => setScaleCalibration(cal)}
              svgPoint={svgPoint}
              active={calibrating}
              onToggle={() => {
                setCalibrating(!calibrating)
                setCalPoints([])
              }}
            />
            {/* Symmetry button (only when polygon closed) */}
            {polygonClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSymmetryOpen(true)}
                title="Симметрия"
              >
                <FlipHorizontal2 className="h-4 w-4 mr-1" />
                Симметрия
              </Button>
            )}
            <Separator orientation="vertical" className="h-6 mx-1" />
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild title="Загрузить подложку">
                <span>
                  <ImagePlus className="h-4 w-4 mr-1" />
                  Подложка
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            {/* Camera capture button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCameraOpen(true)}
              title="Снять камерой"
            >
              <Camera className="h-4 w-4 mr-1" />
              Камера
            </Button>
            {bgImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBgImage(null)
                  setBgImageData(null)
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* SVG */}
          <div className="border rounded-lg overflow-hidden bg-white" style={{ minHeight: '400px' }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              style={{ minHeight: '400px', cursor: settingGrain || calibrating || settingCustomAxis ? 'crosshair' : dragIdx !== null ? 'grabbing' : isPanning ? 'grab' : 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onContextMenu={(e) => {
                e.preventDefault()
                undoPoint()
              }}
            >
              {/* Grid */}
              <SvgGrid width={canvasW * 3} height={canvasH * 3} scale={scale} />

              {/* Background image */}
              {bgImage && bgImageData && (
                <image
                  href={bgImage}
                  x={0}
                  y={0}
                  width={bgImageData.naturalWidth}
                  height={bgImageData.naturalHeight}
                  opacity={0.3}
                />
              )}

              {/* Seam allowance */}
              {seamPath && (
                <path d={seamPath} fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.3)" strokeWidth={1} strokeDasharray="4 2" />
              )}

              {/* Polygon fill */}
              {polygonClosed && polygonPath && (
                <path d={polygonPath} fill="rgba(16,185,129,0.15)" stroke="none" />
              )}

              {/* Polygon outline */}
              {polygonPath && (
                <path d={polygonPath} fill="none" stroke="#059669" strokeWidth={2} />
              )}

              {/* Grain direction */}
              {grainPoints.length === 2 && (
                <line
                  x1={grainPoints[0].x}
                  y1={grainPoints[0].y}
                  x2={grainPoints[1].x}
                  y2={grainPoints[1].y}
                  stroke="#7c3aed"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              )}
              {grainPoints.map((p, i) => (
                <circle
                  key={`grain${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={4 / scale}
                  fill="#7c3aed"
                  stroke="white"
                  strokeWidth={1}
                />
              ))}

              {/* Calibration overlay */}
              {(calibrating || calPoints.length > 0) && (
                <ScaleCalibrationOverlay calPoints={calPoints} scale={scale} />
              )}

              {/* Custom axis points for symmetry */}
              {settingCustomAxis && customAxisPoints.map((p, i) => (
                <circle
                  key={`axis${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={6 / scale}
                  fill="#8b5cf6"
                  stroke="white"
                  strokeWidth={2 / scale}
                />
              ))}

              {/* Points */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={6 / scale}
                    fill={i === 0 ? '#ef4444' : '#059669'}
                    stroke="white"
                    strokeWidth={2 / scale}
                    style={{ cursor: polygonClosed ? 'grab' : 'pointer' }}
                    onMouseDown={(e) => handlePointDragStart(e, i)}
                  />
                  {!polygonClosed && (
                    <text
                      x={p.x + 8 / scale}
                      y={p.y - 4 / scale}
                      fontSize={10 / scale}
                      fill="#374151"
                    >
                      {i + 1}
                    </text>
                  )}
                </g>
              ))}

              {/* Cursor coordinates */}
              {cursorPos && !polygonClosed && !settingGrain && (
                <text
                  x={cursorPos.x + 12 / scale}
                  y={cursorPos.y - 8 / scale}
                  fontSize={11 / scale}
                  fill="#6b7280"
                >
                  {`${cursorPos.x / 10}×${cursorPos.y / 10} см`}
                </text>
              )}

              {/* Close hint */}
              {!polygonClosed && points.length >= 3 && cursorPos && (() => {
                const first = points[0]
                const dist = Math.sqrt((cursorPos.x - first.x) ** 2 + (cursorPos.y - first.y) ** 2)
                if (dist < 10 / scale) {
                  return (
                    <circle
                      cx={first.x}
                      cy={first.y}
                      r={10 / scale}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2 / scale}
                      strokeDasharray="3 2"
                    />
                  )
                }
                return null
              })()}
            </svg>
          </div>

          {/* Canvas info */}
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>1 ед = 1 мм | 10 ед = 1 см</span>
            <span>Масштаб: {(scale * 100).toFixed(0)}%</span>
            <span>Точек: {points.length}</span>
            {polygonClosed && <span className="text-emerald-600 font-medium">Контур замкнут</span>}
            {settingGrain && <span className="text-purple-600 font-medium">Укажите 2 точки долевой</span>}
            {calibrating && <span className="text-amber-600 font-medium">Укажите 2 точки на линейке</span>}
            {scaleCalibration && (
              <span className="text-amber-600 font-medium">
                Масштаб: 1 пикс = {(1 / scaleCalibration.pixelsPerMm).toFixed(3)} мм
              </span>
            )}
            {settingCustomAxis && <span className="text-purple-600 font-medium">Укажите 2 точки оси симметрии</span>}
          </div>
        </div>

        {/* Sidebar - Piece Properties */}
        <div className="lg:w-72 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Параметры детали</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Название *</Label>
                <Select value={pieceName} onValueChange={setPieceName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите деталь" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Спинка">Спинка</SelectItem>
                    <SelectItem value="Полочка">Полочка</SelectItem>
                    <SelectItem value="Рукав">Рукав</SelectItem>
                    <SelectItem value="Воротник">Воротник</SelectItem>
                    <SelectItem value="Манжета">Манжета</SelectItem>
                    <SelectItem value="Карман">Карман</SelectItem>
                    <SelectItem value="Обтачка">Обтачка</SelectItem>
                    <SelectItem value="Пояс">Пояс</SelectItem>
                    <SelectItem value="Кокетка">Кокетка</SelectItem>
                    <SelectItem value="Другое">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pieceName === 'Другое' && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Название (вручную)</Label>
                  <Input
                    value={pieceName === 'Другое' ? '' : pieceName}
                    onChange={(e) => setPieceName(e.target.value)}
                    placeholder="Название детали"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">Размер</Label>
                <Input
                  value={pieceSize}
                  onChange={(e) => setPieceSize(e.target.value)}
                  placeholder="Необязательно"
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-sm">
                  Припуск на шов: {seamAllowance} см
                </Label>
                <Slider
                  value={[seamAllowance]}
                  onValueChange={([v]) => setSeamAllowance(v)}
                  min={0}
                  max={3}
                  step={0.1}
                  className="mt-2"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Количество (крой)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-8 w-8 p-0"
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-sm">Долевая нить</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {grainAngle !== 0 ? `${grainAngle}°` : 'Не задана'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSettingGrain(true)
                      setGrainPoints([])
                    }}
                  >
                    Задать
                  </Button>
                  {grainPoints.length === 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGrainPoints([])}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Ширина:</span>{' '}
                  <span className="font-medium">{bbox.width / 10} см</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Высота:</span>{' '}
                  <span className="font-medium">{bbox.height / 10} см</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Отмена
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saving || points.length < 3 || !pieceName.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ScaleCalibrationDialog
        open={calDialogOpen}
        onClose={() => {
          setCalDialogOpen(false)
          setCalPoints([])
        }}
        point1={calPoints[0] ?? { x: 0, y: 0 }}
        point2={calPoints[1] ?? { x: 0, y: 0 }}
        onConfirm={(cal) => {
          setScaleCalibration(cal)
          setCalPoints([])
          setCalDialogOpen(false)
        }}
      />

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => {
          setBgImage(dataUrl)
          const img = new Image()
          img.onload = () => setBgImageData(img)
          img.src = dataUrl
        }}
      />

      <SymmetryDialog
        open={symmetryOpen}
        onClose={() => {
          setSymmetryOpen(false)
          setCustomAxisPoints([])
        }}
        points={points}
        grainPoints={grainPoints}
        customAxisPoints={customAxisPoints}
        onCustomAxisStart={() => {
          setSettingCustomAxis(true)
          setCustomAxisPoints([])
        }}
        onApply={(newPoints, newGrainPoints) => {
          setPoints(newPoints)
          setPolygonClosed(true)
          if (newGrainPoints.length >= 2) {
            setGrainPoints(newGrainPoints)
          }
        }}
      />
    </div>
  )
}

// ============ Main Technologist Tab ============

type ViewMode = 'list' | 'detail' | 'piece-editor'

export function TechnologistTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Navigation
  const [view, setView] = useState<ViewMode>('list')
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null)
  const [editingPiece, setEditingPiece] = useState<PatternPiece | null>(null)
  const [isNewPiece, setIsNewPiece] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newProductId, setNewProductId] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Delete dialogs
  const [deletePatternOpen, setDeletePatternOpen] = useState(false)
  const [deletePieceOpen, setDeletePieceOpen] = useState(false)
  const [pieceToDelete, setPieceToDelete] = useState<PatternPiece | null>(null)

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Export dialog
  const [exportOpen, setExportOpen] = useState(false)

  // Fetch patterns
  const { data: patterns = [], isLoading: patternsLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: async () => {
      const data = await authFetchJson('/api/patterns')
      return (Array.isArray(data) ? data : []) as Pattern[]
    },
  })

  // Fetch pattern detail
  const { data: patternDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['pattern', selectedPatternId],
    queryFn: async () => {
      if (!selectedPatternId) return null
      const data = await authFetchJson(`/api/patterns/${selectedPatternId}`)
      return data as Pattern
    },
    enabled: !!selectedPatternId && view === 'detail',
  })

  // Fetch products for create dialog
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-patterns'],
    queryFn: async () => {
      const data = await authFetchJson('/api/products')
      return Array.isArray(data) ? data : []
    },
  })

  // Create pattern mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; productId: string; description?: string }) =>
      authFetchJson('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'draft', pieces: [] }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      setCreateOpen(false)
      setNewName('')
      setNewProductId('')
      setNewDescription('')
      toast({ title: 'Лекало создано' })
      // Navigate to the new pattern
      if (data?.id) {
        setSelectedPatternId(data.id)
        setView('detail')
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // Update pattern mutation
  const updatePatternMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetchJson(`/api/patterns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      queryClient.invalidateQueries({ queryKey: ['pattern', selectedPatternId] })
      toast({ title: 'Лекало обновлено' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // Delete pattern mutation
  const deletePatternMutation = useMutation({
    mutationFn: (id: string) => authFetchJson(`/api/patterns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      setDeletePatternOpen(false)
      setView('list')
      setSelectedPatternId(null)
      toast({ title: 'Лекало удалено' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // Delete piece mutation
  const deletePieceMutation = useMutation({
    mutationFn: ({ patternId, pieceId }: { patternId: string; pieceId: string }) =>
      authFetchJson(`/api/patterns/${patternId}/pieces/${pieceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      queryClient.invalidateQueries({ queryKey: ['pattern', selectedPatternId] })
      setDeletePieceOpen(false)
      setPieceToDelete(null)
      toast({ title: 'Деталь удалена' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    if (statusFilter === 'all') return patterns
    return patterns.filter((p) => p.status === statusFilter)
  }, [patterns, statusFilter])

  // Navigate
  const openPattern = useCallback((id: string) => {
    setSelectedPatternId(id)
    setView('detail')
  }, [])

  const openPieceEditor = useCallback((piece?: PatternPiece) => {
    setEditingPiece(piece ?? null)
    setIsNewPiece(!piece)
    setView('piece-editor')
  }, [])

  const goBack = useCallback(() => {
    if (view === 'piece-editor') {
      setView('detail')
      setEditingPiece(null)
    } else if (view === 'detail') {
      setView('list')
      setSelectedPatternId(null)
    }
  }, [view])

  // Handle piece save
  const handlePieceSave = useCallback(
    (_piece: PatternPiece) => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      queryClient.invalidateQueries({ queryKey: ['pattern', selectedPatternId] })
      setView('detail')
      setEditingPiece(null)
    },
    [queryClient, selectedPatternId],
  )

  // ============ Render: Piece Editor ============
  if (view === 'piece-editor' && selectedPatternId) {
    return (
      <PieceEditor
        patternId={selectedPatternId}
        existingPiece={editingPiece}
        onSave={handlePieceSave}
        onCancel={goBack}
      />
    )
  }

  // ============ Render: Pattern Detail ============
  if (view === 'detail' && selectedPatternId) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-muted-foreground">Загрузка...</span>
        </div>
      )
    }

    const pattern = patternDetail
    if (!pattern) {
      return (
        <div className="space-y-4">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>Лекало не найдено</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    const ns = nextStatus(pattern.status)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{pattern.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {pattern.product.name} ({pattern.product.article})
                </span>
                {statusBadge(pattern.status)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setExportOpen(true)}
              disabled={pattern.pieces.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Экспорт
            </Button>
            {ns && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => updatePatternMutation.mutate({ id: pattern.id, data: { status: ns } })}
                disabled={updatePatternMutation.isPending}
              >
                {ns === 'ready' ? <FileCheck className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                {nextStatusLabel(pattern.status)}
              </Button>
            )}
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeletePatternOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {pattern.description && (
          <p className="text-sm text-muted-foreground">{pattern.description}</p>
        )}

        <Separator />

        {/* Pieces */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Детали ({pattern.pieces.length})
          </h3>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => openPieceEditor()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить деталь
          </Button>
        </div>

        {pattern.pieces.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Scissors className="h-12 w-12 mb-3 opacity-30" />
              <p>Нет деталей. Нажмите &laquo;Добавить деталь&raquo; для оцифровки контура.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pattern.pieces.map((piece) => (
              <Card key={piece.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{piece.name}</CardTitle>
                      {piece.size && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Размер: {piece.size}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openPieceEditor(piece)}
                      >
                        <Pen className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => {
                          setPieceToDelete(piece)
                          setDeletePieceOpen(true)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Mini SVG preview */}
                  <div className="border rounded bg-gray-50 overflow-hidden" style={{ height: '120px' }}>
                    <MiniPiecePreview points={piece.points} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Ш×В:</span>{' '}
                      <span className="font-medium">
                        {piece.width / 10}×{piece.height / 10} см
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Кол-во:</span>{' '}
                      <span className="font-medium">{piece.quantity} шт</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Припуск:</span>{' '}
                      <span className="font-medium">{piece.seamAllowance} см</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Долевая:</span>{' '}
                      <span className="font-medium">
                        {piece.grainAngle !== 0 ? `${piece.grainAngle}°` : '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete pattern dialog */}
        <AlertDialog open={deletePatternOpen} onOpenChange={setDeletePatternOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить лекало?</AlertDialogTitle>
              <AlertDialogDescription>
                Лекало &laquo;{pattern.name}&raquo; и все его детали будут удалены без возможности
                восстановления.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deletePatternMutation.mutate(pattern.id)}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete piece dialog */}
        <AlertDialog open={deletePieceOpen} onOpenChange={setDeletePieceOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить деталь?</AlertDialogTitle>
              <AlertDialogDescription>
                Деталь &laquo;{pieceToDelete?.name}&raquo; будет удалена без возможности
                восстановления.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (pieceToDelete && selectedPatternId) {
                    deletePieceMutation.mutate({
                      patternId: selectedPatternId,
                      pieceId: pieceToDelete.id,
                    })
                  }
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Export dialog */}
        {pattern && (
          <PatternExport
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            pattern={pattern}
          />
        )}
      </div>
    )
  }

  // ============ Render: Pattern List ============
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Лекала</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="draft">Черновик</SelectItem>
              <SelectItem value="ready">Готово</SelectItem>
              <SelectItem value="archived">Архив</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Новое лекало
          </Button>
        </div>
      </div>

      {patternsLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-muted-foreground">Загрузка...</span>
        </div>
      ) : filteredPatterns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Scissors className="h-12 w-12 mb-3 opacity-30" />
            <p>
              {statusFilter !== 'all'
                ? 'Нет лекал с выбранным статусом'
                : 'Нет лекал. Создайте первое!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openPattern(pattern.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{pattern.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pattern.product.name} ({pattern.product.article})
                    </p>
                  </div>
                  {statusBadge(pattern.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Деталей:</span>
                  <span className="font-medium">{pattern.pieces.length}</span>
                </div>
                {pattern.pieces.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pattern.pieces.slice(0, 4).map((piece) => (
                      <Badge key={piece.id} variant="outline" className="text-xs">
                        {piece.name}
                      </Badge>
                    ))}
                    {pattern.pieces.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{pattern.pieces.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-end mt-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pattern Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новое лекало</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Футболка базовая"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Изделие *</Label>
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите изделие" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: { id: string; name: string; article: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.article})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Необязательное описание"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (!newName.trim() || !newProductId) {
                  toast({
                    title: 'Ошибка',
                    description: 'Заполните название и выберите изделие',
                    variant: 'destructive',
                  })
                  return
                }
                createMutation.mutate({
                  name: newName.trim(),
                  productId: newProductId,
                  description: newDescription.trim() || undefined,
                })
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Mini Piece Preview ============

function MiniPiecePreview({ points }: { points: Point2D[] }) {
  if (points.length < 3) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        Нет контура
      </div>
    )
  }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const w = maxX - minX || 1
  const h = maxY - minY || 1
  const padding = 5
  const vbW = w + padding * 2
  const vbH = h + padding * 2

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x - minX + padding},${p.y - minY + padding}`)
    .join(' ') + ' Z'

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={path} fill="rgba(16,185,129,0.15)" stroke="#059669" strokeWidth={2} />
    </svg>
  )
}
