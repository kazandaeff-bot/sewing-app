'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { authFetch } from '@/components/auth-provider'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Scissors,
  Save,
  RefreshCw,
  Sparkles,
  RotateCw,
  FlipHorizontal2,
  Grid3x3,
  Maximize,
  ChevronRight,
  Percent,
  Ruler,
  Check,
  Lock,
} from 'lucide-react'

import type { NestingLayout, NestingItem, PatternPiece, Point2D, Pattern } from '@/types'

// ============ Color Palette for Pieces ============

const PIECE_COLORS = [
  { fill: 'rgba(16,185,129,0.30)', stroke: '#059669' },   // emerald
  { fill: 'rgba(59,130,246,0.30)', stroke: '#2563eb' },    // blue
  { fill: 'rgba(245,158,11,0.30)', stroke: '#d97706' },    // amber
  { fill: 'rgba(239,68,68,0.30)', stroke: '#dc2626' },     // red
  { fill: 'rgba(139,92,246,0.30)', stroke: '#7c3aed' },    // violet
  { fill: 'rgba(236,72,153,0.30)', stroke: '#db2777' },    // pink
  { fill: 'rgba(20,184,166,0.30)', stroke: '#0d9488' },    // teal
  { fill: 'rgba(249,115,22,0.30)', stroke: '#ea580c' },    // orange
  { fill: 'rgba(168,85,247,0.30)', stroke: '#9333ea' },    // purple
  { fill: 'rgba(34,197,94,0.30)', stroke: '#16a34a' },     // green
]

function getPieceColor(index: number) {
  return PIECE_COLORS[index % PIECE_COLORS.length]
}

// ============ Status Badge ============

function nestingStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Черновик</Badge>
    case 'arranged':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Разложено</Badge>
    case 'confirmed':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Утверждено</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function nestingStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Черновик'
    case 'arranged': return 'Разложено'
    case 'confirmed': return 'Утверждено'
    default: return status
  }
}

// ============ Transform helpers ============

function transformPoint(
  p: Point2D,
  rotation: number,
  flipped: boolean,
  pieceWidth: number,
  pieceHeight: number,
): Point2D {
  let x = p.x
  let y = p.y

  // Flip horizontally around center
  if (flipped) {
    x = pieceWidth - x
  }

  // Rotate around center
  const cx = pieceWidth / 2
  const cy = pieceHeight / 2
  const rad = (rotation * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad)

  // After rotation, recompute bounding box offset
  return { x: cx + rx, y: cy + ry }
}

function getTransformedBBox(
  points: Point2D[],
  rotation: number,
  flipped: boolean,
  pieceWidth: number,
  pieceHeight: number,
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  const transformed = points.map((p) => transformPoint(p, rotation, flipped, pieceWidth, pieceHeight))
  const xs = transformed.map((p) => p.x)
  const ys = transformed.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

function getEffectiveDimensions(
  piece: PatternPiece,
  rotation: number,
): { w: number; h: number } {
  if (rotation === 90 || rotation === 270) {
    return { w: piece.height, h: piece.width }
  }
  return { w: piece.width, h: piece.height }
}

// ============ Nesting Canvas Component ============

interface NestingCanvasProps {
  layout: NestingLayout
  items: NestingItem[]
  onItemMove: (itemId: string, x: number, y: number) => void
  onItemMoveEnd: () => void
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onRotateItem: (itemId: string, rotation: number) => void
  onFlipItem: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
}

function NestingCanvas({
  layout,
  items,
  onItemMove,
  onItemMoveEnd,
  selectedItemId,
  onSelectItem,
  onRotateItem,
  onFlipItem,
  onDeleteItem,
}: NestingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Canvas display state
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 20, y: 20 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 })

  const SNAP_SIZE = 1 // 1 cm snap

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          w: Math.max(800, entry.contentRect.width),
          h: Math.max(500, entry.contentRect.height),
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Coordinate transforms: fabric cm → screen px
  const fabricToScreen = useCallback(
    (fx: number, fy: number): { sx: number; sy: number } => {
      return {
        sx: fx * zoom + panOffset.x,
        sy: fy * zoom + panOffset.y,
      }
    },
    [zoom, panOffset],
  )

  // Screen px → fabric cm
  const screenToFabric = useCallback(
    (sx: number, sy: number): { fx: number; fy: number } => {
      return {
        fx: (sx - panOffset.x) / zoom,
        fy: (sy - panOffset.y) / zoom,
      }
    },
    [zoom, panOffset],
  )

  // Compute fabric length for display
  const fabricLength = useMemo(() => {
    if (layout.fabricLength > 0) return layout.fabricLength
    // Estimate from items
    let maxBottom = 50 // minimum 50cm
    for (const item of items) {
      const dims = getEffectiveDimensions(item.patternPiece, item.rotation)
      const bottom = item.y + dims.h
      if (bottom > maxBottom) maxBottom = bottom
    }
    return maxBottom + 10
  }, [layout.fabricLength, items])

  // Build a piece color map (by patternPieceId, stable across renders)
  const pieceColorMap = useMemo(() => {
    const map: Record<string, { fill: string; stroke: string }> = {}
    const seenIds: string[] = []
    for (const item of items) {
      if (!(item.patternPieceId in map)) {
        const idx = seenIds.length
        seenIds.push(item.patternPieceId)
        map[item.patternPieceId] = getPieceColor(idx)
      }
    }
    return map
  }, [items])

  // Hit test: which item is at fabric coords?
  const hitTest = useCallback(
    (fx: number, fy: number): NestingItem | null => {
      // Iterate in reverse (top-most first)
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        const dims = getEffectiveDimensions(item.patternPiece, item.rotation)
        if (fx >= item.x && fx <= item.x + dims.w && fy >= item.y && fy <= item.y + dims.h) {
          return item
        }
      }
      return null
    },
    [items],
  )

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = canvasSize
    canvas.width = w * (typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    canvas.height = h * (typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(typeof window !== 'undefined' ? window.devicePixelRatio : 1, typeof window !== 'undefined' ? window.devicePixelRatio : 1)

    // Clear
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, w, h)

    const fw = layout.fabricWidth
    const fl = fabricLength

    // Draw fabric area
    const fabricTopLeft = fabricToScreen(0, 0)
    const fabricBottomRight = fabricToScreen(fw, fl)
    const fabricW = fabricBottomRight.sx - fabricTopLeft.sx
    const fabricH = fabricBottomRight.sy - fabricTopLeft.sy

    // Fabric background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(fabricTopLeft.sx, fabricTopLeft.sy, fabricW, fabricH)

    // Fabric border
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.strokeRect(fabricTopLeft.sx, fabricTopLeft.sy, fabricW, fabricH)

    // Grid
    const gridStep = 10 // 10 cm
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    for (let cm = gridStep; cm < fw; cm += gridStep) {
      const sx = fabricToScreen(cm, 0).sx
      ctx.beginPath()
      ctx.moveTo(sx, fabricTopLeft.sy)
      ctx.lineTo(sx, fabricBottomRight.sy)
      ctx.stroke()
    }
    for (let cm = gridStep; cm < fl; cm += gridStep) {
      const sy = fabricToScreen(0, cm).sy
      ctx.beginPath()
      ctx.moveTo(fabricTopLeft.sx, sy)
      ctx.lineTo(fabricBottomRight.sx, sy)
      ctx.stroke()
    }

    // Major grid every 50cm
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    const majorStep = 50
    for (let cm = majorStep; cm < fw; cm += majorStep) {
      const sx = fabricToScreen(cm, 0).sx
      ctx.beginPath()
      ctx.moveTo(sx, fabricTopLeft.sy)
      ctx.lineTo(sx, fabricBottomRight.sy)
      ctx.stroke()
    }
    for (let cm = majorStep; cm < fl; cm += majorStep) {
      const sy = fabricToScreen(0, cm).sy
      ctx.beginPath()
      ctx.moveTo(fabricTopLeft.sx, sy)
      ctx.lineTo(fabricBottomRight.sx, sy)
      ctx.stroke()
    }

    // Grid labels (cm values)
    ctx.fillStyle = '#9ca3af'
    ctx.font = `${Math.max(9, 11 * zoom / 2)}px sans-serif`
    ctx.textAlign = 'left'
    for (let cm = majorStep; cm < fw; cm += majorStep) {
      const sx = fabricToScreen(cm, 0).sx
      ctx.fillText(`${cm}`, sx + 2, fabricTopLeft.sy - 3)
    }
    ctx.textAlign = 'right'
    for (let cm = majorStep; cm < fl; cm += majorStep) {
      const sy = fabricToScreen(0, cm).sy
      ctx.fillText(`${cm}`, fabricTopLeft.sx - 3, sy + 4)
    }

    // Width/Length labels
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${fw} см`, fabricTopLeft.sx + fabricW / 2, fabricTopLeft.sy - 10)
    ctx.save()
    ctx.translate(fabricTopLeft.sx - 16, fabricTopLeft.sy + fabricH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${Math.round(fl)} см`, 0, 0)
    ctx.restore()

    // Draw pieces
    for (const item of items) {
      const piece = item.patternPiece
      const points = piece.points
      if (!points || points.length < 3) continue

      const color = pieceColorMap[item.patternPieceId] || PIECE_COLORS[0]
      const isSelected = item.id === selectedItemId
      const isDragging = item.id === draggingItemId

      const itemScreenPos = fabricToScreen(item.x, item.y)
      const scale = zoom

      ctx.save()
      ctx.translate(itemScreenPos.sx, itemScreenPos.sy)
      ctx.scale(scale, scale)

      // Apply rotation around item center
      const dims = getEffectiveDimensions(piece, item.rotation)
      ctx.translate(dims.w / 2, dims.h / 2)
      ctx.rotate((item.rotation * Math.PI) / 180)
      if (item.flipped) {
        ctx.scale(-1, 1)
      }
      ctx.translate(-piece.width / 2, -piece.height / 2)

      // Draw polygon
      ctx.beginPath()
      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.closePath()

      // Fill
      ctx.fillStyle = isDragging ? color.fill.replace('0.30', '0.15') : color.fill
      ctx.fill()

      // Stroke
      ctx.strokeStyle = isSelected ? '#000000' : color.stroke
      ctx.lineWidth = isSelected ? 2 / scale : 1 / scale
      if (isSelected) {
        ctx.setLineDash([5 / scale, 3 / scale])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Label
      ctx.fillStyle = '#1f2937'
      const fontSize = Math.max(8, Math.min(14, Math.min(piece.width, piece.height) / 4))
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = piece.name.length > 12 ? piece.name.substring(0, 11) + '…' : piece.name
      ctx.fillText(label, piece.width / 2, piece.height / 2)

      // Size label if exists
      if (piece.size) {
        ctx.font = `${fontSize * 0.75}px sans-serif`
        ctx.fillStyle = '#6b7280'
        ctx.fillText(piece.size, piece.width / 2, piece.height / 2 + fontSize * 0.9)
      }

      ctx.restore()
    }

    // Selection indicator
    if (selectedItemId) {
      const selItem = items.find((it) => it.id === selectedItemId)
      if (selItem) {
        const dims = getEffectiveDimensions(selItem.patternPiece, selItem.rotation)
        const sPos = fabricToScreen(selItem.x, selItem.y)
        ctx.strokeStyle = '#059669'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(sPos.sx, sPos.sy, dims.w * zoom, dims.h * zoom)
        ctx.setLineDash([])
      }
    }

    // Scale indicator
    ctx.fillStyle = '#6b7280'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Масштаб: ${(zoom * 100).toFixed(0)}%`, 10, canvasSize.h - 10)
  }, [canvasSize, layout.fabricWidth, fabricLength, items, zoom, panOffset, selectedItemId, draggingItemId, pieceColorMap, fabricToScreen])

  // Redraw on state change
  useEffect(() => {
    draw()
  }, [draw])

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      // Middle button or ctrl+left for panning
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      if (e.button !== 0) return

      const { fx, fy } = screenToFabric(sx, sy)
      const hitItem = hitTest(fx, fy)

      if (hitItem) {
        onSelectItem(hitItem.id)
        setDraggingItemId(hitItem.id)
        setDragOffset({ x: fx - hitItem.x, y: fy - hitItem.y })
      } else {
        onSelectItem(null)
      }
    },
    [screenToFabric, hitTest, onSelectItem],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      if (draggingItemId) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        let { fx, fy } = screenToFabric(sx, sy)

        fx -= dragOffset.x
        fy -= dragOffset.y

        // Snap to grid
        if (snapToGrid) {
          fx = Math.round(fx / SNAP_SIZE) * SNAP_SIZE
          fy = Math.round(fy / SNAP_SIZE) * SNAP_SIZE
        }

        // Clamp to fabric bounds
        fx = Math.max(0, fx)
        fy = Math.max(0, fy)

        onItemMove(draggingItemId, Math.round(fx * 10) / 10, Math.round(fy * 10) / 10)
      }
    },
    [isPanning, panStart, draggingItemId, dragOffset, screenToFabric, snapToGrid, onItemMove],
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    if (draggingItemId) {
      setDraggingItemId(null)
      onItemMoveEnd()
    }
  }, [draggingItemId, onItemMoveEnd])

  // Zoom with scroll wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(5, Math.max(0.2, zoom * factor))

      // Zoom toward cursor
      const fx = (sx - panOffset.x) / zoom
      const fy = (sy - panOffset.y) / zoom
      const newPanX = sx - fx * newZoom
      const newPanY = sy - fy * newZoom

      setZoom(newZoom)
      setPanOffset({ x: newPanX, y: newPanY })
    },
    [zoom, panOffset],
  )

  // Zoom buttons
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(5, prev * 1.25))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.2, prev / 1.25))
  }, [])

  // Fit to fabric
  const fitToView = useCallback(() => {
    const padding = 40
    const availW = canvasSize.w - padding * 2
    const availH = canvasSize.h - padding * 2
    const scaleX = availW / layout.fabricWidth
    const scaleY = availH / fabricLength
    const newZoom = Math.min(scaleX, scaleY)
    setZoom(newZoom)
    setPanOffset({
      x: padding + (availW - layout.fabricWidth * newZoom) / 2,
      y: padding + (availH - fabricLength * newZoom) / 2,
    })
  }, [canvasSize, layout.fabricWidth, fabricLength])

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 20, y: 20 })
  }, [])

  // Selected item controls
  const selectedItem = items.find((it) => it.id === selectedItemId)

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="outline" size="sm" onClick={zoomIn} title="Приблизить">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={zoomOut} title="Отдалить">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={fitToView} title="Вписать в экран">
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={resetView} title="Сбросить вид">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-2 text-sm">
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Привязка</span>
          <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} className="data-[state=checked]:bg-emerald-600" />
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        {/* Selected item actions */}
        {selectedItem && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedItem.patternPiece.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextRot = ((selectedItem.rotation + 90) % 360) as 0 | 90 | 180 | 270
                onRotateItem(selectedItem.id, nextRot)
              }}
              title="Повернуть на 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFlipItem(selectedItem.id)}
              title="Отразить"
            >
              <FlipHorizontal2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDeleteItem(selectedItem.id)}
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="border rounded-lg overflow-hidden bg-gray-50" style={{ minHeight: '500px' }}>
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.w, height: canvasSize.h, cursor: isPanning ? 'grab' : draggingItemId ? 'grabbing' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>1 ед = 1 см</span>
        <span>Масштаб: {(zoom * 100).toFixed(0)}%</span>
        <span>Ширина ткани: {layout.fabricWidth} см</span>
        <span>Длина раскладки: {Math.round(fabricLength)} см</span>
        {selectedItem && (
          <span className="text-emerald-700">
            Позиция: ({selectedItem.x}, {selectedItem.y}) | Поворот: {selectedItem.rotation}°{selectedItem.flipped ? ' | Отражено' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ============ Main Cutter Tab Component ============

type ViewMode = 'list' | 'editor'

export function CutterTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Navigation
  const [view, setView] = useState<ViewMode>('list')
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPatternId, setNewPatternId] = useState('')
  const [newFabricWidth, setNewFabricWidth] = useState(150)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [layoutToDelete, setLayoutToDelete] = useState<NestingLayout | null>(null)

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Editor state — local items for drag operations (before save)
  const [localItems, setLocalItems] = useState<NestingItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [prevUtilization, setPrevUtilization] = useState<number | null>(null)
  const [autoArrangeLoading, setAutoArrangeLoading] = useState(false)

  // ---- Data fetching ----

  const { data: layouts = [], isLoading: layoutsLoading } = useQuery({
    queryKey: ['nesting'],
    queryFn: async () => {
      const r = await authFetch('/api/nesting')
      const data = await r.json()
      return (Array.isArray(data) ? data : []) as NestingLayout[]
    },
  })

  const { data: layoutDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['nesting', selectedLayoutId],
    queryFn: async () => {
      if (!selectedLayoutId) return null
      const r = await authFetch(`/api/nesting/${selectedLayoutId}`)
      const data = await r.json()
      return data as NestingLayout
    },
    enabled: !!selectedLayoutId && view === 'editor',
  })

  const { data: patterns = [] } = useQuery({
    queryKey: ['patterns-for-nesting'],
    queryFn: async () => {
      const r = await authFetch('/api/patterns')
      const data = await r.json()
      return (Array.isArray(data) ? data : []) as Pattern[]
    },
  })

  // Only patterns with ready status
  const readyPatterns = useMemo(() => patterns.filter((p) => p.status === 'ready'), [patterns])

  // Sync local items when detail loads — derive from server data when no unsaved changes
  const effectiveLocalItems = useMemo(() => {
    if (hasUnsavedChanges) return localItems
    return layoutDetail?.items ?? []
  }, [hasUnsavedChanges, localItems, layoutDetail?.items])

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; patternId?: string; fabricWidth: number; items: { patternPieceId: string; x: number; y: number; rotation: number; flipped: boolean }[] }) => {
      const r = await authFetch('/api/nesting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.error || 'Ошибка создания')
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nesting'] })
      setCreateOpen(false)
      setNewName('')
      setNewPatternId('')
      setNewFabricWidth(150)
      toast({ title: 'Раскладка создана' })
      if (data?.id) {
        setSelectedLayoutId(data.id)
        setView('editor')
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const r = await authFetch(`/api/nesting/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.error || 'Ошибка сохранения')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nesting'] })
      queryClient.invalidateQueries({ queryKey: ['nesting', selectedLayoutId] })
      setHasUnsavedChanges(false)
      toast({ title: 'Раскладка сохранена' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/nesting/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nesting'] })
      setDeleteOpen(false)
      setLayoutToDelete(null)
      if (selectedLayoutId === layoutToDelete?.id) {
        setView('list')
        setSelectedLayoutId(null)
      }
      toast({ title: 'Раскладка удалена' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить раскладку', variant: 'destructive' })
    },
  })

  // ---- Handlers ----

  const openLayout = useCallback((id: string) => {
    setSelectedLayoutId(id)
    setView('editor')
    setSelectedItemId(null)
    setHasUnsavedChanges(false)
    setPrevUtilization(null)
  }, [])

  const goBack = useCallback(() => {
    if (hasUnsavedChanges) {
      // Simple confirmation
      if (!window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return
    }
    setView('list')
    setSelectedLayoutId(null)
    setSelectedItemId(null)
    setHasUnsavedChanges(false)
  }, [hasUnsavedChanges])

  const handleCreate = useCallback(() => {
    if (!newName.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название раскладки', variant: 'destructive' })
      return
    }

    // Build items from pattern pieces
    const items: { patternPieceId: string; x: number; y: number; rotation: number; flipped: boolean }[] = []
    if (newPatternId) {
      const pattern = patterns.find((p) => p.id === newPatternId)
      if (pattern) {
        let yOffset = 0
        for (const piece of pattern.pieces) {
          for (let i = 0; i < piece.quantity; i++) {
            items.push({
              patternPieceId: piece.id,
              x: 0,
              y: yOffset,
              rotation: 0,
              flipped: false,
            })
            yOffset += piece.height + 1
          }
        }
      }
    }

    createMutation.mutate({
      name: newName.trim(),
      patternId: newPatternId || undefined,
      fabricWidth: newFabricWidth,
      items,
    })
  }, [newName, newPatternId, newFabricWidth, patterns, createMutation, toast])

  // Drag handler
  const handleItemMove = useCallback((itemId: string, x: number, y: number) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, x, y } : item)),
    )
    setHasUnsavedChanges(true)
  }, [])

  const handleItemMoveEnd = useCallback(() => {
    // Will be saved via Save button
  }, [])

  // Rotate
  const handleRotateItem = useCallback((itemId: string, rotation: number) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, rotation } : item)),
    )
    setHasUnsavedChanges(true)
  }, [])

  // Flip
  const handleFlipItem = useCallback((itemId: string) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, flipped: !item.flipped } : item)),
    )
    setHasUnsavedChanges(true)
  }, [])

  // Delete item from layout
  const handleDeleteItem = useCallback((itemId: string) => {
    setLocalItems((prev) => prev.filter((item) => item.id !== itemId))
    if (selectedItemId === itemId) setSelectedItemId(null)
    setHasUnsavedChanges(true)
  }, [selectedItemId])

  // Save
  const handleSave = useCallback(() => {
    if (!selectedLayoutId) return

    // Calculate utilization
    let totalPieceArea = 0
    let maxBottom = 0
    for (const item of effectiveLocalItems) {
      const dims = getEffectiveDimensions(item.patternPiece, item.rotation)
      totalPieceArea += dims.w * dims.h
      const bottom = item.y + dims.h
      if (bottom > maxBottom) maxBottom = bottom
    }

    const fabricWidth = layoutDetail?.fabricWidth ?? 150
    const fabricLength = maxBottom
    const totalFabricArea = fabricWidth * fabricLength
    const utilization = totalFabricArea > 0 ? Math.round((totalPieceArea / totalFabricArea) * 10000) / 100 : 0

    updateMutation.mutate({
      id: selectedLayoutId,
      data: {
        fabricLength,
        utilization,
        items: effectiveLocalItems.map((item) => ({
          patternPieceId: item.patternPieceId,
          x: item.x,
          y: item.y,
          rotation: item.rotation,
          flipped: item.flipped,
        })),
      },
    })
  }, [selectedLayoutId, effectiveLocalItems, layoutDetail, updateMutation])

  // Recalculate
  const handleRecalculate = useCallback(() => {
    if (!selectedLayoutId || !layoutDetail) return

    let totalPieceArea = 0
    let maxBottom = 0
    for (const item of effectiveLocalItems) {
      const dims = getEffectiveDimensions(item.patternPiece, item.rotation)
      totalPieceArea += dims.w * dims.h
      const bottom = item.y + dims.h
      if (bottom > maxBottom) maxBottom = bottom
    }

    const fabricWidth = layoutDetail.fabricWidth
    const fabricLength = maxBottom
    const totalFabricArea = fabricWidth * fabricLength
    const utilization = totalFabricArea > 0 ? Math.round((totalPieceArea / totalFabricArea) * 10000) / 100 : 0

    updateMutation.mutate({
      id: selectedLayoutId,
      data: {
        fabricLength,
        utilization,
        items: effectiveLocalItems.map((item) => ({
          patternPieceId: item.patternPieceId,
          x: item.x,
          y: item.y,
          rotation: item.rotation,
          flipped: item.flipped,
        })),
      },
    })
  }, [selectedLayoutId, layoutDetail, effectiveLocalItems, updateMutation])

  // Auto arrange
  const handleAutoArrange = useCallback(async () => {
    if (!selectedLayoutId) return
    setAutoArrangeLoading(true)
    setPrevUtilization(layoutDetail?.utilization ?? null)
    try {
      const r = await authFetch(`/api/nesting/${selectedLayoutId}/auto-arrange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await r.json()
      if (!r.ok) {
        toast({ title: 'Ошибка', description: data.error || 'Ошибка автоматической раскладки', variant: 'destructive' })
        return
      }
      queryClient.invalidateQueries({ queryKey: ['nesting'] })
      queryClient.invalidateQueries({ queryKey: ['nesting', selectedLayoutId] })
      toast({ title: 'Автоматическая раскладка выполнена', description: `Использование ткани: ${data.utilization?.toFixed(1)}%` })
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить авт. раскладку', variant: 'destructive' })
    } finally {
      setAutoArrangeLoading(false)
    }
  }, [selectedLayoutId, layoutDetail, queryClient, toast])

  // Status change
  const handleStatusChange = useCallback((status: string) => {
    if (!selectedLayoutId) return
    updateMutation.mutate({
      id: selectedLayoutId,
      data: { status },
    })
  }, [selectedLayoutId, updateMutation])

  // Update fabric width
  const handleFabricWidthChange = useCallback((newWidth: number) => {
    if (!selectedLayoutId) return
    updateMutation.mutate({
      id: selectedLayoutId,
      data: { fabricWidth: newWidth },
    })
  }, [selectedLayoutId, updateMutation])

  // ---- Filtered layouts ----

  const filteredLayouts = useMemo(() => {
    if (statusFilter === 'all') return layouts
    return layouts.filter((l) => l.status === statusFilter)
  }, [layouts, statusFilter])

  // ---- Utilization for current editor ----

  const editorUtilization = useMemo(() => {
    if (effectiveLocalItems.length === 0) return 0
    let totalPieceArea = 0
    let maxBottom = 0
    for (const item of effectiveLocalItems) {
      const dims = getEffectiveDimensions(item.patternPiece, item.rotation)
      totalPieceArea += dims.w * dims.h
      const bottom = item.y + dims.h
      if (bottom > maxBottom) maxBottom = bottom
    }
    const fabricWidth = layoutDetail?.fabricWidth ?? 150
    const totalFabricArea = fabricWidth * maxBottom
    return totalFabricArea > 0 ? Math.round((totalPieceArea / totalFabricArea) * 10000) / 100 : 0
  }, [effectiveLocalItems, layoutDetail])

  const editorFabricLength = useMemo(() => {
    let maxBottom = 50
    for (const item of effectiveLocalItems) {
      const dims = getEffectiveDimensions(item.patternPiece, item.rotation)
      const bottom = item.y + dims.h
      if (bottom > maxBottom) maxBottom = bottom
    }
    return maxBottom
  }, [effectiveLocalItems])

  // ============ Render: Editor View ============

  if (view === 'editor' && selectedLayoutId) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-muted-foreground">Загрузка раскладки...</span>
        </div>
      )
    }

    const layout = layoutDetail
    if (!layout) {
      return (
        <div className="space-y-4">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>Раскладка не найдена</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    const effectiveLayout = { ...layout, fabricLength: editorFabricLength, items: effectiveLocalItems }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{layout.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {layout.pattern && (
                  <span className="text-sm text-muted-foreground">
                    Лекало: {layout.pattern.name}
                  </span>
                )}
                {nestingStatusBadge(layout.status)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                Несохранено
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4">
          {/* Canvas area */}
          <div className="flex-1 min-w-0">
            <NestingCanvas
              layout={effectiveLayout}
              items={effectiveLocalItems}
              onItemMove={handleItemMove}
              onItemMoveEnd={handleItemMoveEnd}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onRotateItem={handleRotateItem}
              onFlipItem={handleFlipItem}
              onDeleteItem={handleDeleteItem}
            />
          </div>

          {/* Sidebar */}
          <div className="xl:w-80 space-y-4 shrink-0">
            {/* Utilization badge */}
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Использование ткани</span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-700">
                    {editorUtilization.toFixed(1)}%
                  </span>
                </div>
                {prevUtilization !== null && layout.utilization !== prevUtilization && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Было: {prevUtilization.toFixed(1)}% → Стало: {editorUtilization.toFixed(1)}%
                  </div>
                )}
                <div className="mt-2 w-full bg-emerald-200 rounded-full h-2">
                  <div
                    className="bg-emerald-600 rounded-full h-2 transition-all"
                    style={{ width: `${Math.min(100, editorUtilization)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Layout info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Параметры раскладки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ширина ткани:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={layout.fabricWidth}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (v > 0) handleFabricWidthChange(v)
                      }}
                      className="h-7 text-sm w-20"
                      min={1}
                    />
                    <span className="text-muted-foreground text-xs">см</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Длина раскладки:</span>
                  </div>
                  <div>
                    <span className="font-medium">{Math.round(editorFabricLength)} см</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Деталей:</span>
                  </div>
                  <div>
                    <span className="font-medium">{effectiveLocalItems.length}</span>
                  </div>
                </div>

                <Separator />

                {/* Status controls */}
                <div className="space-y-2">
                  <Label className="text-sm">Статус</Label>
                  <div className="flex gap-1 flex-wrap">
                    {(['draft', 'arranged', 'confirmed'] as const).map((s) => (
                      <Button
                        key={s}
                        variant={layout.status === s ? 'default' : 'outline'}
                        size="sm"
                        className={layout.status === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                        onClick={() => handleStatusChange(s)}
                        disabled={updateMutation.isPending}
                      >
                        {s === 'draft' && 'Черновик'}
                        {s === 'arranged' && 'Разложено'}
                        {s === 'confirmed' && (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Утверждено
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !hasUnsavedChanges}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Сохранить
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAutoArrange}
                  disabled={autoArrangeLoading || layout.status === 'confirmed'}
                >
                  {autoArrangeLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Автоматическая раскладка
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRecalculate}
                  disabled={updateMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Пересчитать
                </Button>
              </CardContent>
            </Card>

            {/* Piece list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Детали
                  <Badge variant="outline" className="font-normal">{effectiveLocalItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-64">
                  <div className="space-y-0.5">
                    {effectiveLocalItems.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Нет деталей
                      </div>
                    ) : (
                      effectiveLocalItems.map((item, idx) => {
                        const color = getPieceColor(
                          effectiveLocalItems.findIndex((li, i) => i < idx + 1 && li.patternPieceId === item.patternPieceId) !== idx
                            ? effectiveLocalItems.indexOf(effectiveLocalItems.find((li) => li.patternPieceId === item.patternPieceId)!)
                            : idx
                        )
                        return (
                          <button
                            key={item.id}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                              selectedItemId === item.id ? 'bg-emerald-50 text-emerald-700' : ''
                            }`}
                            onClick={() => setSelectedItemId(item.id)}
                          >
                            <div
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: color.stroke }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium">{item.patternPiece.name}</div>
                              <div className="text-xs text-muted-foreground">
                                ({item.x}, {item.y}) {item.rotation > 0 ? `${item.rotation}°` : ''}{item.flipped ? ' отр.' : ''}
                              </div>
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          </button>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ============ Render: List View ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Scissors className="h-5 w-5 text-emerald-600" />
            Раскладка лекал
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Размещение деталей лекал на ткани для раскроя
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Новая раскладка
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Статус:</span>
        {['all', 'draft', 'arranged', 'confirmed'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            className={statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' && 'Все'}
            {s === 'draft' && 'Черновик'}
            {s === 'arranged' && 'Разложено'}
            {s === 'confirmed' && 'Утверждено'}
          </Button>
        ))}
      </div>

      {/* Layouts list */}
      {layoutsLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-muted-foreground">Загрузка...</span>
        </div>
      ) : filteredLayouts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Scissors className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">
              {statusFilter === 'all' ? 'Нет раскладок' : `Нет раскладок со статусом «${nestingStatusLabel(statusFilter)}»`}
            </p>
            <p className="text-sm mt-1 mb-4">Создайте новую раскладку для размещения деталей на ткани</p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Новая раскладка
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLayouts.map((layout) => (
            <Card
              key={layout.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openLayout(layout.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate group-hover:text-emerald-700 transition-colors">
                      {layout.name}
                    </CardTitle>
                    {layout.pattern && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Лекало: {layout.pattern.name}
                      </p>
                    )}
                  </div>
                  {nestingStatusBadge(layout.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Ширина:</span>
                    <span className="font-medium">{layout.fabricWidth} см</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Исп.:</span>
                    <span className={`font-bold ${layout.utilization >= 70 ? 'text-emerald-600' : layout.utilization >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {layout.utilization.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {layout.items.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {layout.items.length} {layout.items.length === 1 ? 'деталь' : layout.items.length < 5 ? 'детали' : 'деталей'}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setLayoutToDelete(layout)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая раскладка</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Футболка базовая — р.46"
              />
            </div>
            <div className="space-y-2">
              <Label>Лекало</Label>
              <Select value={newPatternId} onValueChange={setNewPatternId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите лекало (готовое)" />
                </SelectTrigger>
                <SelectContent>
                  {readyPatterns.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Нет готовых лекал
                    </div>
                  ) : (
                    readyPatterns.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.pieces.length} дет.)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {newPatternId && (() => {
                const p = patterns.find((pt) => pt.id === newPatternId)
                if (!p) return null
                return (
                  <p className="text-xs text-muted-foreground">
                    {p.pieces.length} дет., суммарно {p.pieces.reduce((s, pc) => s + pc.quantity, 0)} шт. для кроя
                  </p>
                )
              })()}
            </div>
            <div className="space-y-2">
              <Label>Ширина рулона (см)</Label>
              <Input
                type="number"
                value={newFabricWidth}
                onChange={(e) => setNewFabricWidth(parseFloat(e.target.value) || 150)}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить раскладку?</AlertDialogTitle>
            <AlertDialogDescription>
              Раскладка &laquo;{layoutToDelete?.name}&raquo; будет удалена без возможности восстановления.
              Все позиции раскладки также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => layoutToDelete && deleteMutation.mutate(layoutToDelete.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
