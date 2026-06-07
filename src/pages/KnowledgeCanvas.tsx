import { useRef, useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2, Brain, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface KnowledgeItem {
  id: string
  subject: string
  topic: string
  concept: string
  summary: string
  mastery: 'beginner' | 'developing' | 'confident'
  evidence: string
  suggestedExercise: string
}

interface Node {
  id: string
  type: 'root' | 'topic' | 'concept'
  label: string
  x: number
  y: number
  item?: KnowledgeItem
}

interface Edge {
  from: string
  to: string
}

interface Props {
  items: KnowledgeItem[]
  loading: boolean
  error: string
  apiKey: string
  model: string
  studentGoal: string
  onAnalyse: () => void
  onPracticeInChat: (item: KnowledgeItem, exercise: string) => void
}

const MASTERY_COLORS = {
  beginner:   { border: '#fca5a5', bg: '#fff5f5', badge: '#fee2e2', badgeText: '#b91c1c', dot: '#f87171' },
  developing: { border: '#fcd34d', bg: '#fffdf0', badge: '#fef3c7', badgeText: '#92400e', dot: '#f59e0b' },
  confident:  { border: '#6ee7b7', bg: '#f0fdf4', badge: '#dcfce7', badgeText: '#166534', dot: '#22c55e' },
}

function layoutNodes(items: KnowledgeItem[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Root node
  nodes.push({ id: 'root', type: 'root', label: '📚 Knowledge Base', x: 0, y: 0 })

  // Group by topic
  const topicMap = new Map<string, KnowledgeItem[]>()
  for (const item of items) {
    const key = item.topic
    if (!topicMap.has(key)) topicMap.set(key, [])
    topicMap.get(key)!.push(item)
  }

  const topics = Array.from(topicMap.entries())
  const topicRadius = Math.max(300, topics.length * 120)

  topics.forEach(([topic, topicItems], ti) => {
    const angle = (2 * Math.PI * ti) / topics.length - Math.PI / 2
    const tx = Math.cos(angle) * topicRadius
    const ty = Math.sin(angle) * topicRadius
    const topicId = `topic-${ti}`

    nodes.push({ id: topicId, type: 'topic', label: topic, x: tx, y: ty })
    edges.push({ from: 'root', to: topicId })

    const conceptRadius = Math.max(180, topicItems.length * 70)
    topicItems.forEach((item, ci) => {
      const spread = topicItems.length === 1 ? 0 : (2 * Math.PI * ci) / topicItems.length
      const baseAngle = angle
      const ca = baseAngle + spread - (Math.PI * (topicItems.length - 1)) / topicItems.length
      const cx = tx + Math.cos(ca) * conceptRadius
      const cy = ty + Math.sin(ca) * conceptRadius

      nodes.push({ id: item.id, type: 'concept', label: item.concept, x: cx, y: cy, item })
      edges.push({ from: topicId, to: item.id })
    })
  })

  return { nodes, edges }
}

export default function KnowledgeCanvas({
  items, loading, error, apiKey, model, studentGoal, onAnalyse, onPracticeInChat
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [exerciseContent, setExerciseContent] = useState<Record<string, string>>({})
  const [exerciseLoading, setExerciseLoading] = useState<string | null>(null)
  const lastTouches = useRef<TouchList | null>(null)

  const { nodes, edges } = layoutNodes(items)

  // Centre on mount / items change
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      setPan({ x: width / 2, y: height / 2 })
    }
  }, [items.length])

  // ── Pan ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.kb-node')) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    setPan({
      x: dragStart.current.panX + e.clientX - dragStart.current.x,
      y: dragStart.current.panY + e.clientY - dragStart.current.y,
    })
  }, [dragging])

  const onMouseUp = useCallback(() => setDragging(false), [])

  // ── Zoom ─────────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(z => Math.min(10, Math.max(0.05, z * factor)))
  }, [])

  // ── Touch ────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    lastTouches.current = e.touches
    if (e.touches.length === 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y }
    }
  }, [pan])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && !(e.target as HTMLElement).closest('.kb-node')) {
      setPan({
        x: dragStart.current.panX + e.touches[0].clientX - dragStart.current.x,
        y: dragStart.current.panY + e.touches[0].clientY - dragStart.current.y,
      })
    } else if (e.touches.length === 2 && lastTouches.current && lastTouches.current.length === 2) {
      const prev = Math.hypot(
        lastTouches.current[0].clientX - lastTouches.current[1].clientX,
        lastTouches.current[0].clientY - lastTouches.current[1].clientY,
      )
      const curr = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      setZoom(z => Math.min(10, Math.max(0.05, z * (curr / prev))))
    }
    lastTouches.current = e.touches
  }, [])

  // ── Exercise ─────────────────────────────────────────────────────────────
  const generateExercise = async (item: KnowledgeItem) => {
    if (!apiKey) return
    setExerciseLoading(item.id)
    setExerciseContent(prev => ({ ...prev, [item.id]: '' }))
    try {
      const res = await fetch('/api/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: item.topic, concept: item.concept, mastery: item.mastery, apiKey, model, studentGoal }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6)
            if (d === '[DONE]') break
            try { const p = JSON.parse(d); if (p.text) { full += p.text; setExerciseContent(prev => ({ ...prev, [item.id]: full })) } } catch {}
          }
        }
      }
    } catch { /* ignore */ }
    finally { setExerciseLoading(null) }
  }

  const resetView = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      setPan({ x: width / 2, y: height / 2 })
      setZoom(1)
    }
  }

  // Node bounds for SVG (need to know node sizes for edge endpoints)
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={onAnalyse}
          disabled={loading}
          className="flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Analysing…' : 'Analyse Chats'}
        </button>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 shadow-lg max-w-xs">
            {error}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.05, z * 0.8))} className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={resetView} className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
          <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <div className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-500 text-center shadow">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-5xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-gray-500">Your knowledge map is empty</p>
            <p className="text-xs text-gray-400 mt-1">Chat with your tutor, then tap "Analyse Chats"</p>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden bg-gray-50 rounded-2xl border border-gray-200"
        style={{ cursor: dragging ? 'grabbing' : 'grab', backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: `${32 * zoom}px ${32 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { lastTouches.current = null }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>

          {/* SVG edges */}
          <svg style={{ position: 'absolute', overflow: 'visible', top: 0, left: 0, pointerEvents: 'none' }}>
            {edges.map(e => {
              const from = nodeById.get(e.from)
              const to = nodeById.get(e.to)
              if (!from || !to) return null
              return (
                <line
                  key={`${e.from}-${e.to}`}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="#cbd5e1" strokeWidth={2 / zoom} strokeDasharray={to.type === 'concept' ? `${6/zoom},${4/zoom}` : undefined}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const mc = node.item ? MASTERY_COLORS[node.item.mastery] : null
            const isSelected = selectedNode?.id === node.id

            if (node.type === 'root') {
              return (
                <div key={node.id} className="kb-node absolute" style={{ transform: 'translate(-50%, -50%)', left: node.x, top: node.y }}>
                  <div className="bg-brand-600 text-white rounded-2xl px-5 py-3 shadow-lg text-sm font-bold whitespace-nowrap select-none">
                    {node.label}
                  </div>
                </div>
              )
            }

            if (node.type === 'topic') {
              return (
                <div key={node.id} className="kb-node absolute" style={{ transform: 'translate(-50%, -50%)', left: node.x, top: node.y }}>
                  <div className="bg-white border-2 border-brand-200 text-brand-800 rounded-xl px-4 py-2 shadow text-xs font-semibold whitespace-nowrap select-none">
                    {node.label}
                  </div>
                </div>
              )
            }

            // Concept node
            const item = node.item!
            const exercise = exerciseContent[item.id]
            const isGenerating = exerciseLoading === item.id

            return (
              <div
                key={node.id}
                className="kb-node absolute"
                style={{ transform: 'translate(-50%, -50%)', left: node.x, top: node.y, width: isSelected ? 280 : 160, zIndex: isSelected ? 10 : 1 }}
              >
                <div
                  className="rounded-2xl border-2 shadow-md transition-all duration-200 cursor-pointer select-none"
                  style={{ borderColor: isSelected ? mc!.dot : mc!.border, backgroundColor: mc!.bg }}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                >
                  {/* Header */}
                  <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mc!.dot }} />
                        <span className="text-xs font-semibold text-gray-900 leading-tight">{item.concept}</span>
                      </div>
                      <span className="text-[10px] font-medium capitalize px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: mc!.badge, color: mc!.badgeText }}>
                        {item.mastery}
                      </span>
                    </div>
                    {isSelected && (
                      <button onClick={e => { e.stopPropagation(); setSelectedNode(null) }} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Expanded */}
                  {isSelected && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2" onClick={e => e.stopPropagation()}>
                      <p className="text-[11px] text-gray-600 leading-relaxed">{item.summary}</p>
                      {item.evidence && (
                        <div className="bg-white/70 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">From chat</p>
                          <p className="text-[10px] text-gray-600 italic mt-0.5">"{item.evidence}"</p>
                        </div>
                      )}
                      {exercise && (
                        <div className="bg-white/80 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-purple-500 uppercase tracking-wide mb-1">Exercise</p>
                          <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">{exercise}</p>
                          <button
                            onClick={() => onPracticeInChat(item, exercise)}
                            className="mt-2 w-full bg-brand-600 text-white text-[10px] font-semibold py-1.5 rounded-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Brain className="w-3 h-3" /> Practice in Chat
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => generateExercise(item)}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-1 border text-[10px] font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        style={{ borderColor: mc!.dot, color: mc!.badgeText, backgroundColor: mc!.badge + '80' }}
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {isGenerating ? 'Generating…' : exercise ? 'Regenerate' : 'Generate Exercise'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
