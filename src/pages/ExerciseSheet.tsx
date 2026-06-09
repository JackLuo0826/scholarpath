import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Lightbulb, PenLine, Type, CheckCircle2, XCircle, Loader2, Send } from 'lucide-react'
import type { WeeklyActivity, ActivityCompletion } from '../types'
import DrawingCanvas from '../components/DrawingCanvas'

interface Props {
  activity: WeeklyActivity
  childAge: number | null
  childGrade: string | null
  apiKey: string
  model: string
  weekStart: string
  onClose: () => void
  onSubmitted: (completion: ActivityCompletion) => void
}

type InputMode = 'type' | 'draw'
type Phase = 'answering' | 'checking' | 'feedback'

export default function ExerciseSheet({
  activity, childAge, childGrade, apiKey, model, weekStart, onClose, onSubmitted,
}: Props) {
  const [typedAnswer, setTypedAnswer] = useState('')
  const [drawnBase64, setDrawnBase64] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [phase, setPhase] = useState<Phase>('answering')
  const [completion, setCompletion] = useState<ActivityCompletion | null>(null)
  const [error, setError] = useState('')
  const [inputModeState, setInputModeState] = useState<InputMode>('type')
  const [drawWidth, setDrawWidth] = useState(560)

  // Lock body scroll while modal is open; also capture window width for canvas
  useEffect(() => {
    setDrawWidth(Math.min(560, window.innerWidth - 40))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canDraw = activity.type === 'exercise' || activity.type === 'quiz'
  const hasAnswer = inputModeState === 'type' ? typedAnswer.trim().length > 0 : drawnBase64.length > 0

  const difficultyColor = {
    foundation: 'text-green-600 bg-green-50',
    developing: 'text-amber-600 bg-amber-50',
    advanced: 'text-purple-600 bg-purple-50',
  }[activity.difficulty]

  const typeLabel = { exercise: '✏️ Exercise', quiz: '📝 Quiz', todo: '✅ Task', reading: '📖 Reading' }

  // ── Submit answer to /api/check-answer ─────────────────────────────────────
  const submit = async () => {
    setError('')
    setPhase('checking')

    const body: Record<string, unknown> = {
      question: activity.question,
      subject: activity.subject,
      activityTitle: activity.title,
      activityType: activity.type,
      childAge: childAge ?? 13,
      childGrade: childGrade ?? '',
      apiKey,
      model,
    }
    if (inputModeState === 'type') {
      body.answerText = typedAnswer
    } else {
      body.answerImageBase64 = drawnBase64
    }

    try {
      const resp = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()

      const completionRecord: ActivityCompletion = {
        activityId: activity.id,
        weekStart,
        answerText: inputModeState === 'type' ? typedAnswer : undefined,
        answerImageBase64: inputModeState === 'draw' ? drawnBase64 : undefined,
        isCorrect: data.isCorrect,
        score: data.score,
        feedback: data.feedback,
        explanation: data.explanation,
        encouragement: data.encouragement,
        completedAt: new Date().toISOString(),
      }
      setCompletion(completionRecord)
      setPhase('feedback')
      onSubmitted(completionRecord)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setPhase('answering')
    }
  }

  // Render via portal so the modal escapes any parent stacking contexts
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: 'relative', width: '100%', maxWidth: '672px', backgroundColor: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '95vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, borderBottom: '1px solid #f3f4f6', padding: '20px 20px 16px', borderRadius: '24px 24px 0 0' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X style={{ width: 16, height: 16, color: '#6b7280' }} />
          </button>
          <div className="flex items-center gap-2 mb-1 pr-10 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">{typeLabel[activity.type]}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-semibold" style={{ color: activity.subjectColor }}>{activity.subject}</span>
            <span className="text-gray-300">·</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${difficultyColor}`}>
              {activity.difficulty}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">~{activity.durationMin} min</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{activity.title}</h2>
          {activity.description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{activity.description}</p>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Question */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Question / Task</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{activity.question}</p>
          </div>

          {/* Hint toggle */}
          {activity.hint && phase === 'answering' && (
            <div>
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Show hint
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">{activity.hint}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Answer input phase ─────────────────────────────────────── */}
          {phase === 'answering' && (
            <>
              {/* Mode toggle (only for exercise/quiz) */}
              {canDraw && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInputModeState('type')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-sm font-semibold transition-colors ${
                      inputModeState === 'type'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputModeState('draw')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-sm font-semibold transition-colors ${
                      inputModeState === 'draw'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                    Draw
                  </button>
                </div>
              )}

              {inputModeState === 'type' ? (
                <textarea
                  className="w-full border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent leading-relaxed"
                  rows={5}
                  placeholder="Write your answer here…"
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                />
              ) : (
                <DrawingCanvas
                  width={drawWidth}
                  height={300}
                  onExport={setDrawnBase64}
                  className="w-full"
                />
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={!hasAnswer}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-700 transition-colors disabled:opacity-40 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Submit Answer
              </button>
            </>
          )}

          {/* ── Checking phase ─────────────────────────────────────────── */}
          {phase === 'checking' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Checking your answer…</p>
            </div>
          )}

          {/* ── Feedback phase ─────────────────────────────────────────── */}
          {phase === 'feedback' && completion && (
            <div className="space-y-4">
              {/* Score banner */}
              <div className={`rounded-2xl p-4 flex items-center gap-4 ${
                completion.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  completion.isCorrect ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {completion.isCorrect
                    ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                    : <XCircle className="w-6 h-6 text-amber-600" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-base font-bold ${completion.isCorrect ? 'text-green-800' : 'text-amber-800'}`}>
                      {completion.isCorrect ? 'Well done!' : 'Good try!'}
                    </span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                      completion.isCorrect ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'
                    }`}>
                      {completion.score}/100
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${completion.isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                    {completion.feedback}
                  </p>
                </div>
              </div>

              {/* Explanation */}
              {completion.explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
                  <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1.5">Here's the idea</p>
                  <p className="text-sm text-blue-900 leading-relaxed">{completion.explanation}</p>
                </div>
              )}

              {/* Encouragement */}
              <div className="bg-brand-50 rounded-2xl px-4 py-3">
                <p className="text-sm text-brand-800 font-medium leading-relaxed">✨ {completion.encouragement}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-brand-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-700 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>

        <div className="pb-8" />
      </div>
    </div>,
    document.body
  )
}

// Suppress the unused variable warning — inputMode is intentionally replaced by inputModeState
void inputMode
