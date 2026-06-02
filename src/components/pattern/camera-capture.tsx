'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Camera, RotateCcw, Check } from 'lucide-react'

interface CameraCaptureProps {
  open: boolean
  onClose: () => void
  onCapture: (dataUrl: string) => void
}

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null)
    setCameraReady(false)
    setCapturedImage(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Доступ к камере запрещён. Разрешите доступ в настройках браузера.')
      } else if (err.name === 'NotFoundError') {
        setError('Камера не найдена. Подключите камеру и попробуйте снова.')
      } else {
        setError('Не удалось получить доступ к камере.')
      }
    }
  }, [])

  // Draw overlay using a ref-based callback to avoid circular dependency
  const drawOverlayRef = useRef<() => void>(() => {})

  useEffect(() => {
    drawOverlayRef.current = () => {
      const video = videoRef.current
      const overlay = overlayCanvasRef.current
      if (!video || !overlay) return

      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) return

      overlay.width = w
      overlay.height = h

      const ctx = overlay.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, w, h)

      // Semi-transparent optimal capture zone rectangle
      const margin = w * 0.08
      const zoneX = margin
      const zoneY = margin
      const zoneW = w - margin * 2
      const zoneH = h - margin * 2

      // Dark areas outside the capture zone
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(0, 0, w, zoneY)
      ctx.fillRect(0, zoneY + zoneH, w, h - zoneY - zoneH)
      ctx.fillRect(0, zoneY, zoneX, zoneH)
      ctx.fillRect(zoneX + zoneW, zoneY, w - zoneX - zoneW, zoneH)

      // Capture zone border
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.strokeRect(zoneX, zoneY, zoneW, zoneH)
      ctx.setLineDash([])

      // Ruler zone (bottom-right corner)
      const rulerZoneW = zoneW * 0.25
      const rulerZoneH = zoneH * 0.2
      const rulerX = zoneX + zoneW - rulerZoneW
      const rulerY = zoneY + zoneH - rulerZoneH

      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)'
      ctx.fillRect(rulerX, rulerY, rulerZoneW, rulerZoneH)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)'
      ctx.lineWidth = 3
      ctx.strokeRect(rulerX, rulerY, rulerZoneW, rulerZoneH)

      // Ruler label
      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)'
      ctx.font = `bold ${Math.max(16, h * 0.025)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('\uD83D\uDCCF Линейка сюда', rulerX + rulerZoneW / 2, rulerY + rulerZoneH / 2 + 6)

      // Crosshair at center
      const cx = w / 2
      const cy = h / 2
      const crossSize = 30
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx - crossSize, cy)
      ctx.lineTo(cx + crossSize, cy)
      ctx.moveTo(cx, cy - crossSize)
      ctx.lineTo(cx, cy + crossSize)
      ctx.stroke()

      // Center circle
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.stroke()

      // Perspective grid lines
      const gridColor = 'rgba(16, 185, 129, 0.25)'
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      const numVLines = 8
      for (let i = 1; i < numVLines; i++) {
        const x = zoneX + (zoneW / numVLines) * i
        ctx.beginPath()
        ctx.moveTo(x, zoneY)
        ctx.lineTo(x, zoneY + zoneH)
        ctx.stroke()
      }
      const numHLines = 6
      for (let i = 1; i < numHLines; i++) {
        const y = zoneY + (zoneH / numHLines) * i
        ctx.beginPath()
        ctx.moveTo(zoneX, y)
        ctx.lineTo(zoneX + zoneW, y)
        ctx.stroke()
      }

      // Diagonal convergence lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(zoneX, zoneY)
      ctx.lineTo(cx, cy)
      ctx.moveTo(zoneX + zoneW, zoneY)
      ctx.lineTo(cx, cy)
      ctx.moveTo(zoneX, zoneY + zoneH)
      ctx.lineTo(cx, cy)
      ctx.moveTo(zoneX + zoneW, zoneY + zoneH)
      ctx.lineTo(cx, cy)
      ctx.stroke()

      // Text hints
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = `${Math.max(14, h * 0.022)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('Расположите линейку в отмеченной зоне', cx, zoneY + 30)
      ctx.fillText('Держите телефон параллельно поверхности', cx, zoneY + 55)
    }
  }, [])

  // Animation loop
  useEffect(() => {
    if (!cameraReady || capturedImage || !open) return

    let running = true
    const loop = () => {
      if (!running) return
      drawOverlayRef.current()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [cameraReady, capturedImage, open])

  // Start camera when dialog opens
  const hasStartedRef = useRef(false)
  useEffect(() => {
    if (open && !hasStartedRef.current) {
      hasStartedRef.current = true
      startCamera()
    }
    if (!open && hasStartedRef.current) {
      hasStartedRef.current = false
      stopCamera()
      setCameraReady(false)
      setCapturedImage(null)
      setError(null)
    }
  }, [open, startCamera, stopCamera])

  // Capture frame
  const handleCapture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedImage(dataUrl)
  }, [])

  // Retake
  const handleRetake = useCallback(() => {
    setCapturedImage(null)
  }, [])

  // Use captured image as background
  const handleUseImage = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage)
      stopCamera()
      onClose()
    }
  }, [capturedImage, onCapture, stopCamera, onClose])

  // Close dialog
  const handleClose = useCallback(() => {
    stopCamera()
    setCapturedImage(null)
    setError(null)
    onClose()
  }, [stopCamera, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Съёмка камерой</DialogTitle>
        </DialogHeader>

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-white gap-4">
              <p className="text-center text-sm">{error}</p>
              <Button variant="outline" onClick={startCamera}>
                Попробовать снова
              </Button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Снятый кадр"
              className="w-full h-auto"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-auto"
                playsInline
                muted
                style={{ display: cameraReady ? 'block' : 'none' }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: cameraReady ? 'block' : 'none' }}
              />
              {!cameraReady && (
                <div className="flex items-center justify-center py-12 text-white">
                  <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mr-3" />
                  <span>Запуск камеры...</span>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          {capturedImage ? (
            <>
              <Button variant="outline" onClick={handleRetake}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Переснять
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleUseImage}
              >
                <Check className="h-4 w-4 mr-1" />
                Использовать
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCapture}
                disabled={!cameraReady}
              >
                <Camera className="h-4 w-4 mr-1" />
                Снять
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
