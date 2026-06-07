import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X, Brain, Target, ChevronRight } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  apiKey: string
  model: string
  onClose: () => void
  onPlanReady: (conversation: Message[], plan: GoalPlan) => void
}

export interface GoalPlan {
  goalStatement: string
  targetYear: number
  currentYear: number
  intrinsicWhy: string
  wishOutcome: string
  yearsToGoal: number
  roadmap: {
    year: number
    label: string
    theme: string
    milestones: {
      quarter: string
      title: string
      description: string
      category: 'academic' | 'test' | 'extracurricular' | 'application' | 'habit'
      metric: string
    }[]
  }[]
  subjectTargets: {
    subject: string
    currentLevel: string
    targetLevel: string
    keyActions: string[]
  }[]
  obstaclePlans: {
    obstacle: string
    type: 'internal' | 'external'
    implementationIntention: string
    contingency: string
  }[]
  weeklyHabits: {
    habit: string
    frequency: string
    rationale: string
  }[]
  keyDates: {
    date: string
    event: string
    importance: string
  }[]
  sdtCheck: {
    autonomy: string
    competence: string
    relatedness: string
  }
  coachNote: string
}

const STEP_LABELS = [
  'Your Dream',
  'Specific Goal',
  'Timeline',
  'Current Level',
  'Your Why',
  'Obstacles',
  'Your Strengths',
]

const OPENING_MESSAGE = `Hi! I'm your goal-setting coach 🎯

Over the next few minutes, I'll ask you 7 questions to understand your ambitions and challenges. Based on your answers, I'll build a personalised long-term roadmap just for you — with milestones, study habits, and a plan for every obstacle.

This is based on the same science used by top athletes and high achievers. Ready? Let's start with the big picture...

**What's your dream — where do you want to be in 5 to 10 years? Don't hold back, think big. 🌟**`

export default function GoalWizard({ apiKey, model, onClose, onPlanReady }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [streaming, setStreaming] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || streaming || generatingPlan) return
    setInput('')
    setError('')

    const userMsg: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setStreaming(true)

    try {
      const res = await fetch('/api/goal-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          currentStep,
          apiKey,
          model,
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''
      let planReady = false

      // Add placeholder AI message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              aiContent += parsed.text
              // Remove [PLAN_READY] from display
              const displayContent = aiContent.replace('[PLAN_READY]', '').trim()
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: displayContent },
              ])
            }
            if (parsed.done) {
              planReady = parsed.planReady
            }
          } catch {}
        }
      }

      setStreaming(false)

      if (planReady) {
        // Generate the full plan
        setGeneratingPlan(true)
        const finalConversation = [...updatedMessages, { role: 'assistant' as const, content: aiContent }]

        const planRes = await fetch('/api/goal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation: finalConversation, apiKey, model }),
        })

        if (!planRes.ok) throw new Error('Plan generation failed')
        const plan = await planRes.json()
        if (plan.error) throw new Error(plan.error)

        setGeneratingPlan(false)
        onPlanReady(finalConversation, plan)
      } else {
        setCurrentStep(s => Math.min(s + 1, 7))
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      setStreaming(false)
      setGeneratingPlan(false)
    }
  }

  // Render markdown-lite (bold only)
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Goal Setting Session</p>
              <p className="text-xs text-gray-400">Science-backed roadmap builder</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Step {Math.min(currentStep, 7)} of 7 — {STEP_LABELS[Math.min(currentStep, 7) - 1]}</span>
            <span className="text-xs text-gray-400">{Math.round((Math.min(currentStep, 7) / 7) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(Math.min(currentStep, 7) / 7) * 100}%` }}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 h-1 rounded-full transition-colors ${i < currentStep ? 'bg-brand-500' : i === currentStep - 1 ? 'bg-brand-300' : 'bg-gray-100'}`}
                title={label}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="w-3.5 h-3.5 text-brand-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content ? renderContent(msg.content) : (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {generatingPlan && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Brain className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-brand-700">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  <span className="font-medium">Building your personalised roadmap…</span>
                </div>
                <p className="text-xs text-brand-500 mt-1">Applying WOOP, SMART milestones, and implementation intentions</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!generatingPlan && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Type your answer…"
                rows={2}
                className="flex-1 resize-none text-sm outline-none px-2 py-1.5 bg-transparent text-gray-800 placeholder:text-gray-400 max-h-28"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-brand-700 transition-colors flex-shrink-0"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Based on WOOP · Goal Setting Theory · Self-Determination Theory · Implementation Intentions
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
