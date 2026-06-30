import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronRight, ChevronLeft, Upload, X, Loader2, CheckCircle2, XCircle,
  PenLine, Type, Lightbulb, Star, RotateCcw, Camera,
} from 'lucide-react'
import DrawingCanvas from '../components/DrawingCanvas'
import type { AssessmentQuestion, AssessmentAnswer, SubjectLevel, QuestionScore } from '../types'

interface Props {
  childAge: number | null
  childGrade: string | null
  childName: string
  apiKey: string
  model: string
  existingLevels: SubjectLevel[]
  onLevelSaved: (level: SubjectLevel) => void
}

type Step = 'subject' | 'upload' | 'generating' | 'quiz' | 'submitting' | 'results'
type InputMode = 'type' | 'draw'

interface SubjectOption {
  name: string
  icon: string
  color: string
}

const SUBJECTS: SubjectOption[] = [
  { name: 'Mathematics', icon: '📐', color: '#6366f1' },
  { name: 'English',     icon: '📝', color: '#8b5cf6' },
  { name: 'Science',     icon: '🔬', color: '#06b6d4' },
  { name: 'French',      icon: '🗣️', color: '#ec4899' },
  { name: 'Physics',     icon: '⚛️',  color: '#f59e0b' },
  { name: 'Chemistry',   icon: '🧪', color: '#10b981' },
  { name: 'Biology',     icon: '🧬', color: '#22c55e' },
  { name: 'History',     icon: '📜', color: '#dc2626' },
  { name: 'Geography',   icon: '🌍', color: '#2563eb' },
  { name: 'Economics',   icon: '📊', color: '#7c3aed' },
  { name: 'Computing',   icon: '💻', color: '#0f172a' },
]

const LEVEL_META = {
  foundation: { label: 'Foundation', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', stars: 1 },
  developing:  { label: 'Developing',  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', stars: 2 },
  advanced:    { label: 'Advanced',    color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', stars: 3 },
  expert:      { label: 'Expert',      color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', stars: 4 },
}

export default function LevelAssessment({
  childAge, childGrade, childName, apiKey, model, existingLevels, onLevelSaved,
}: Props) {
  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('subject')
  const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null)

  // ── Upload step ───────────────────────────────────────────────────────────
  const [uploadedImages, setUploadedImages] = useState<string[]>([])  // base64
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([])
  const [inputMode, setInputMode] = useState<InputMode>('type')
  const [typedAnswer, setTypedAnswer] = useState('')
  const [drawnBase64, setDrawnBase64] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(600)

  // ── Results state ─────────────────────────────────────────────────────────
  const [questionScores, setQuestionScores] = useState<QuestionScore[]>([])
  const [overallScore, setOverallScore] = useState(0)
  const [resultLevel, setResultLevel] = useState<SubjectLevel | null>(null)
  const [resultFeedback, setResultFeedback] = useState('')
  const [resultReport, setResultReport] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)

  // ── Error ─────────────────────────────────────────────────────────────────
  const [error, setError] = useState('')

  // Measure container for canvas sizing
  useEffect(() => {
    const update = () => setCanvasWidth(Math.min(640, window.innerWidth - 64))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Reset per-question answer state when navigating
  useEffect(() => {
    const existing = answers.find(a => a.questionId === questions[currentQ]?.id)
    setTypedAnswer(existing?.answerText ?? '')
    setDrawnBase64(existing?.answerImageBase64 ?? '')
    setShowHint(false)
    // If current question is drawing type, default to draw mode
    if (questions[currentQ]?.type === 'drawing') {
      setInputMode('draw')
    } else {
      setInputMode('type')
    }
  }, [currentQ, questions]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).slice(0, 3 - uploadedImages.length).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) setUploadedImages(prev => [...prev, result].slice(0, 3))
      }
      reader.readAsDataURL(file)
    })
  }, [uploadedImages.length])

  const removeImage = (idx: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx))
  }

  const generateAssessment = async (skipImages = false) => {
    setError('')
    setStep('generating')
    try {
      const body: Record<string, unknown> = {
        subject: selectedSubject!.name,
        childAge: childAge ?? 13,
        childGrade: childGrade ?? '',
        childName,
        apiKey,
        model,
      }
      if (!skipImages && uploadedImages.length > 0) {
        body.exerciseImages = uploadedImages
      }
      const resp = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      const qs: AssessmentQuestion[] = data.questions || []
      if (qs.length === 0) throw new Error('No questions returned. Please try again.')
      setQuestions(qs)
      setAnswers(qs.map(q => ({ questionId: q.id })))
      setCurrentQ(0)
      setStep('quiz')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate assessment. Please try again.')
      setStep('upload')
    }
  }

  const saveCurrentAnswer = useCallback(() => {
    const q = questions[currentQ]
    if (!q) return
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== q.id)
      const answer: AssessmentAnswer = { questionId: q.id }
      if (q.type === 'multiple-choice') {
        // Multiple choice is handled separately
      } else if (inputMode === 'draw' && drawnBase64) {
        answer.answerImageBase64 = drawnBase64
      } else if (typedAnswer.trim()) {
        answer.answerText = typedAnswer.trim()
      }
      return [...filtered, answer]
    })
  }, [questions, currentQ, inputMode, drawnBase64, typedAnswer])

  const selectOption = (option: string) => {
    const q = questions[currentQ]
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== q.id)
      return [...filtered, { questionId: q.id, selectedOption: option }]
    })
  }

  const goNext = () => {
    saveCurrentAnswer()
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    }
  }

  const goPrev = () => {
    saveCurrentAnswer()
    if (currentQ > 0) setCurrentQ(currentQ - 1)
  }

  const submitAssessment = async () => {
    saveCurrentAnswer()
    setStep('submitting')
    setError('')

    // Use the latest answers (after saveCurrentAnswer updates state async — use a local snapshot)
    const finalAnswers = [...answers]
    const q = questions[currentQ]
    if (q) {
      const idx = finalAnswers.findIndex(a => a.questionId === q.id)
      const answer: AssessmentAnswer = { questionId: q.id }
      if (q.type !== 'multiple-choice') {
        if (inputMode === 'draw' && drawnBase64) answer.answerImageBase64 = drawnBase64
        else if (typedAnswer.trim()) answer.answerText = typedAnswer.trim()
      }
      if (idx >= 0) finalAnswers[idx] = { ...finalAnswers[idx], ...answer }
    }

    try {
      const resp = await fetch('/api/score-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject!.name,
          childAge: childAge ?? 13,
          childGrade: childGrade ?? '',
          childName,
          questions,
          answers: finalAnswers,
          apiKey,
          model,
        }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()

      setQuestionScores(data.questionScores || [])
      setOverallScore(data.overallScore ?? 0)
      setResultFeedback(data.feedback || '')
      setResultReport(data.subjectReport || '')

      const level: SubjectLevel = {
        subject: selectedSubject!.name,
        level: data.level || 'developing',
        levelLabel: data.levelLabel || `${childGrade} ${selectedSubject!.name}`,
        score: data.overallScore ?? 0,
        assessedAt: new Date().toISOString(),
      }
      setResultLevel(level)
      onLevelSaved(level)
      setStep('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scoring failed. Please try again.')
      setStep('quiz')
    }
  }

  const retake = () => {
    setStep('subject')
    setSelectedSubject(null)
    setUploadedImages([])
    setQuestions([])
    setAnswers([])
    setCurrentQ(0)
    setResultLevel(null)
    setQuestionScores([])
    setError('')
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const currentQuestion = questions[currentQ]
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id)

  const answeredCount = answers.filter(a =>
    a.selectedOption || a.answerText || a.answerImageBase64
  ).length

  // ── STEP: subject selection ───────────────────────────────────────────────
  if (step === 'subject') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Assess Your Level</h2>
          <p className="text-sm text-gray-500">
            Choose a subject to start a personalised diagnostic assessment. The AI will create questions matched to your year level.
          </p>
        </div>

        {/* Existing levels summary */}
        {existingLevels.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your Current Levels</p>
            <div className="flex flex-wrap gap-2">
              {existingLevels.map(sl => {
                const meta = LEVEL_META[sl.level]
                return (
                  <div
                    key={sl.subject}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                    style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
                  >
                    {sl.subject} · {meta.label}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SUBJECTS.map(subj => {
            const existing = existingLevels.find(l => l.subject === subj.name)
            const meta = existing ? LEVEL_META[existing.level] : null
            return (
              <button
                key={subj.name}
                onClick={() => { setSelectedSubject(subj); setStep('upload') }}
                className="relative bg-white border-2 border-gray-100 rounded-2xl p-4 text-left hover:border-brand-300 hover:shadow-sm transition-all active:scale-95"
              >
                <div className="text-2xl mb-2">{subj.icon}</div>
                <p className="text-sm font-semibold text-gray-900">{subj.name}</p>
                {existing && meta && (
                  <span
                    className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                  >
                    {meta.label}
                  </span>
                )}
                {!existing && (
                  <p className="text-xs text-gray-400 mt-0.5">Not assessed</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── STEP: upload recent work ──────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="space-y-5">
        <button onClick={() => setStep('subject')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: selectedSubject!.color + '20' }}>
            {selectedSubject!.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{selectedSubject!.name} Assessment</h2>
            <p className="text-sm text-gray-500">Step 1 of 2 — Optional: upload recent work</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-sm text-blue-800 font-medium mb-1">Why upload? (optional)</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            If you upload photos of recent exercises or homework, the AI will analyse them to calibrate the questions more precisely to where you are right now. You can also skip this and go straight to the assessment.
          </p>
        </div>

        {/* Upload area */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFileUpload(e.target.files)}
          />

          {uploadedImages.length < 3 && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:border-brand-400 hover:bg-brand-50 transition-all"
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Upload photo</span>
                <span className="text-xs text-gray-400">JPG, PNG</span>
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment')
                    fileInputRef.current.click()
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:border-brand-400 hover:bg-brand-50 transition-all"
              >
                <Camera className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Take photo</span>
                <span className="text-xs text-gray-400">Use camera</span>
              </button>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} alt={`Work sample ${idx + 1}`} className="w-24 h-24 object-cover rounded-xl border border-gray-100" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadedImages.length > 0 && (
            <p className="text-xs text-gray-400 mb-3">{uploadedImages.length}/3 photo{uploadedImages.length !== 1 ? 's' : ''} added · {3 - uploadedImages.length} more allowed</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => generateAssessment(false)}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold py-4 rounded-2xl hover:bg-brand-700 transition-colors shadow-sm text-base"
          >
            {uploadedImages.length > 0 ? (
              <><Upload className="w-4 h-4" /> Use photos &amp; Start Assessment</>
            ) : (
              <><ChevronRight className="w-4 h-4" /> Start Assessment</>
            )}
          </button>
          {uploadedImages.length > 0 && (
            <button
              onClick={() => generateAssessment(true)}
              className="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Skip photos — start without them
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── STEP: generating ─────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ backgroundColor: selectedSubject!.color + '20' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: selectedSubject!.color }} />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Creating your assessment</h3>
          <p className="text-sm text-gray-500">
            {uploadedImages.length > 0
              ? 'Analysing your work and generating personalised questions…'
              : `Building a ${selectedSubject!.name} diagnostic quiz for your level…`}
          </p>
        </div>
      </div>
    )
  }

  // ── STEP: quiz ───────────────────────────────────────────────────────────
  if (step === 'quiz' && currentQuestion) {
    const isLastQuestion = currentQ === questions.length - 1
    const difficultyColors = {
      foundation: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
      developing:  { text: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200' },
      advanced:    { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    }
    const dc = difficultyColors[currentQuestion.difficulty]
    const canDraw = currentQuestion.type !== 'multiple-choice'

    return (
      <div className="space-y-5">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900">
              Question {currentQ + 1} <span className="text-gray-400 font-normal">of {questions.length}</span>
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${dc.text} ${dc.bg} ${dc.border}`}>
              {currentQuestion.difficulty}
            </span>
          </div>
          <span className="text-xs text-gray-400 font-medium">{answeredCount}/{questions.length} answered</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, backgroundColor: selectedSubject!.color }}
          />
        </div>

        {/* Topic tag */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{currentQuestion.topic}</p>

        {/* Question */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
          <p className="text-base leading-relaxed text-gray-900 font-medium whitespace-pre-line">{currentQuestion.question}</p>
        </div>

        {/* Hint */}
        {currentQuestion.hint && (
          <div>
            {!showHint ? (
              <button
                onClick={() => setShowHint(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Show hint
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">{currentQuestion.hint}</p>
              </div>
            )}
          </div>
        )}

        {/* Multiple choice */}
        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map(option => {
              const isSelected = currentAnswer?.selectedOption === option
              return (
                <button
                  key={option}
                  onClick={() => selectOption(option)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}

        {/* Text / draw input for non-MC questions */}
        {currentQuestion.type !== 'multiple-choice' && (
          <>
            {canDraw && (
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode('type')}
                  className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    inputMode === 'type' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Type className="w-4 h-4" /> Type
                </button>
                <button
                  onClick={() => setInputMode('draw')}
                  className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    inputMode === 'draw' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <PenLine className="w-4 h-4" /> Draw / Write
                </button>
              </div>
            )}

            {inputMode === 'type' ? (
              <textarea
                className="w-full border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent leading-relaxed"
                rows={currentQuestion.type === 'long-answer' ? 7 : 4}
                placeholder={currentQuestion.type === 'long-answer' ? 'Write your detailed answer here…' : 'Write your answer here…'}
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
              />
            ) : (
              <DrawingCanvas
                width={canvasWidth}
                height={380}
                onExport={setDrawnBase64}
                className="w-full"
              />
            )}
          </>
        )}

        {/* Skip note */}
        <p className="text-xs text-gray-400 text-center">
          You can skip any question — just tap Next without answering.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <button
              onClick={goPrev}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {!isLastQuestion ? (
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-700 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submitAssessment}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-700 transition-colors shadow-sm"
            >
              Submit Assessment <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Question dots navigation */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
          {questions.map((q, i) => {
            const a = answers.find(ans => ans.questionId === q.id)
            const isAnswered = !!(a?.selectedOption || a?.answerText || a?.answerImageBase64)
            const isCurrent = i === currentQ
            return (
              <button
                key={q.id}
                onClick={() => { saveCurrentAnswer(); setCurrentQ(i) }}
                className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'text-white scale-110'
                    : isAnswered
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                style={isCurrent ? { backgroundColor: selectedSubject!.color } : undefined}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── STEP: submitting ─────────────────────────────────────────────────────
  if (step === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ backgroundColor: selectedSubject!.color + '20' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: selectedSubject!.color }} />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Marking your assessment…</h3>
          <p className="text-sm text-gray-500">The AI is reviewing your answers and determining your level.</p>
        </div>
      </div>
    )
  }

  // ── STEP: results ────────────────────────────────────────────────────────
  if (step === 'results' && resultLevel) {
    const meta = LEVEL_META[resultLevel.level]

    return (
      <div className="space-y-5">
        {/* Level badge */}
        <div
          className="rounded-3xl p-6 border-2 text-center"
          style={{ backgroundColor: meta.bg, borderColor: meta.border }}
        >
          <div className="text-3xl mb-2">{selectedSubject!.icon}</div>
          <p className="text-sm font-semibold mb-1" style={{ color: meta.color }}>
            {selectedSubject!.name} Assessment Complete
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{resultLevel.levelLabel}</h2>

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4].map(n => (
              <Star
                key={n}
                className="w-6 h-6"
                fill={n <= meta.stars ? meta.color : 'transparent'}
                style={{ color: meta.color, opacity: n <= meta.stars ? 1 : 0.25 }}
              />
            ))}
          </div>

          {/* Score */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg"
            style={{ backgroundColor: meta.border, color: meta.color }}
          >
            {overallScore}/100
          </div>
        </div>

        {/* Feedback */}
        {resultFeedback && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">What the AI found</p>
            <p className="text-sm text-gray-800 leading-relaxed">{resultFeedback}</p>
          </div>
        )}

        {/* Subject report */}
        {resultReport && (
          <div className="bg-brand-50 rounded-2xl p-4">
            <p className="text-sm text-brand-900 leading-relaxed font-medium">💡 {resultReport}</p>
          </div>
        )}

        {/* Per-question breakdown */}
        {questionScores.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <button
              onClick={() => setShowBreakdown(prev => !prev)}
              className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors"
            >
              Question breakdown
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
            </button>

            {showBreakdown && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {questions.map((q, i) => {
                  const qs = questionScores.find(s => s.questionId === q.id)
                  if (!qs) return null
                  return (
                    <div key={q.id} className="flex items-start gap-3">
                      {qs.isCorrect
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600 mb-0.5">
                          Q{i + 1} · {q.topic} · {qs.score}/100
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">{qs.feedback}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={retake}
            className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Assess another
          </button>
          <button
            onClick={retake}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return null
}
