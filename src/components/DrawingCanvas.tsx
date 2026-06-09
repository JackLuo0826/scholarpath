import { useRef, useEffect, useCallback, useState } from 'react'
import { Undo2, Trash2 } from 'lucide-react'

interface Props {
  width?: number
  height?: number
  onExport?: (base64Png: string) => void
  className?: string
}

interface Stroke {
  points: { x: number; y: number; pressure: number }[]
  color: string
  baseWidth: number
}

export default function DrawingCanvas({ width = 600, height = 340, onExport, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  const INK_COLOR = '#1e293b'
  const BASE_WIDTH = 2.5

  // ── Re-draw all strokes onto canvas ────────────────────────────────────────
  const redraw = useCallback((committed: Stroke[], active: Stroke | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const paintStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = stroke.color

      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1]
        const curr = stroke.points[i]
        const pressure = curr.pressure > 0 ? curr.pressure : 0.5
        ctx.lineWidth = stroke.baseWidth * (0.5 + pressure * 1.5)
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(curr.x, curr.y)
        ctx.stroke()
      }
    }

    committed.forEach(paintStroke)
    if (active) paintStroke(active)
  }, [])

  // Keep canvas sharp on hi-DPI screens
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [width, height])

  // Notify parent whenever strokes change
  useEffect(() => {
    if (onExport && strokes.length > 0) {
      onExport(exportPng())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes])

  // ── Pointer helpers (works for Apple Pencil, finger, mouse) ───────────────
  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Ignore finger touch when stylus is present (prevents palm rejection issues)
    if (e.pointerType === 'touch' && e.pressure === 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = canvasPoint(e)
    isDrawing.current = true
    lastPoint.current = pt
    const newStroke: Stroke = {
      points: [pt],
      color: INK_COLOR,
      baseWidth: BASE_WIDTH,
    }
    setCurrentStroke(newStroke)
    redraw(strokes, newStroke)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !currentStroke) return
    const pt = canvasPoint(e)
    // Skip near-duplicate points to keep data lean
    if (lastPoint.current) {
      const dx = pt.x - lastPoint.current.x
      const dy = pt.y - lastPoint.current.y
      if (dx * dx + dy * dy < 1) return
    }
    lastPoint.current = pt
    const updated: Stroke = { ...currentStroke, points: [...currentStroke.points, pt] }
    setCurrentStroke(updated)
    redraw(strokes, updated)
  }

  const onPointerUp = () => {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false
    lastPoint.current = null
    if (currentStroke.points.length > 1) {
      const committed = [...strokes, currentStroke]
      setStrokes(committed)
      redraw(committed, null)
      if (onExport) onExport(exportPng())
    }
    setCurrentStroke(null)
  }

  // ── Export canvas as base64 PNG ─────────────────────────────────────────────
  const exportPng = (): string => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    // Create a white-background export canvas
    const offscreen = document.createElement('canvas')
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    const ctx = offscreen.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)
    ctx.drawImage(canvas, 0, 0)
    return offscreen.toDataURL('image/png').replace('data:image/png;base64,', '')
  }

  const undo = () => {
    const committed = strokes.slice(0, -1)
    setStrokes(committed)
    redraw(committed, null)
    if (onExport) onExport(committed.length > 0 ? exportPng() : '')
  }

  const clear = () => {
    setStrokes([])
    setCurrentStroke(null)
    isDrawing.current = false
    redraw([], null)
    if (onExport) onExport('')
  }

  const isEmpty = strokes.length === 0 && !currentStroke

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden bg-white border-2 border-dashed border-gray-200 cursor-crosshair"
        style={{ width, height }}
      >
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-sm text-gray-300 font-medium">Draw your answer here ✏️</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none', display: 'block' }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={strokes.length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Undo
        </button>
        <button
          onClick={clear}
          disabled={isEmpty}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
        <span className="ml-auto text-[10px] text-gray-300 font-medium">
          {isEmpty ? 'Apple Pencil or finger' : `${strokes.length} stroke${strokes.length !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  )
}
