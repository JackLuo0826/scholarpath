import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Brain, Send, CheckCircle2, Circle, Flame, Trophy,
  GraduationCap, LogOut, ChevronRight, Loader2, Lock, BookMarked,
  Sparkles, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react'
import { useApp } from '../AppContext'
import { MOCK_CHILD, MOCK_DAILY_TASKS } from '../mockData'
import type { ChatMessage, DailyTask } from '../types'

const TASK_TYPE_COLORS: Record<DailyTask['type'], string> = {
  lesson:   'bg-blue-100 text-blue-700',
  exercise: 'bg-purple-100 text-purple-700',
  test:     'bg-red-100 text-red-700',
  review:   'bg-amber-100 text-amber-700',
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
        <Brain className="w-4 h-4 text-brand-600" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAI = msg.sender === 'ai'
  return (
    <div className={`flex items-end gap-2 mb-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-brand-600" />
        </div>
      )}
      {!isAI && (
        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          E
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isAI
            ? 'bg-gray-100 text-gray-800 rounded-bl-sm'
            : 'bg-brand-600 text-white rounded-br-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

type Tab = 'today' | 'chat' | 'knowledge' | 'progress'

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

export default function StudentApp() {
  const { messages, addMessage, setUser, apiKey, model } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [tasks, setTasks] = useState(MOCK_DAILY_TASKS)
  const [streamingContent, setStreamingContent] = useState('')
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
  const [knowledgeError, setKnowledgeError] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [exerciseContent, setExerciseContent] = useState<Record<string, string>>({})
  const [exerciseLoading, setExerciseLoading] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, streamingContent])

  const completedCount = tasks.filter(t => t.completed).length
  const totalMin = tasks.reduce((s, t) => s + t.durationMin, 0)
  const doneMin = tasks.filter(t => t.completed).reduce((s, t) => s + t.durationMin, 0)

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isThinking) return
    setInput('')

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student',
      content: text,
      timestamp: new Date().toISOString(),
      subject: 'Mathematics',
    }
    addMessage(userMsg)
    setIsThinking(true)
    setStreamingContent('')

    if (!apiKey) {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: '⚠️ No API key configured. A parent needs to add a Claude API key in Settings to enable the AI tutor.',
        timestamp: new Date().toISOString(),
        subject: 'Mathematics',
      }
      addMessage(aiMsg)
      setIsThinking(false)
      return
    }

    try {
      const allMessages = [...messages, userMsg]
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          apiKey,
          model,
          subject: 'Mathematics',
          skill: 'Quadratic Equations',
          goal: MOCK_CHILD.goal,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'API error')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      setIsThinking(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                setStreamingContent(fullContent)
              }
              if (parsed.error) throw new Error(parsed.error)
            } catch {}
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: fullContent,
        timestamp: new Date().toISOString(),
        subject: 'Mathematics',
      }
      addMessage(aiMsg)
      setStreamingContent('')
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: `⚠️ Error: ${error.message}. Please check the API key in Settings.`,
        timestamp: new Date().toISOString(),
        subject: 'Mathematics',
      }
      addMessage(aiMsg)
      setStreamingContent('')
      setIsThinking(false)
    }
  }

  const toggleTask = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

  const loadKnowledge = async () => {
    if (!apiKey) { setKnowledgeError('No API key — ask a parent to add one in Settings.'); return }
    setKnowledgeLoading(true)
    setKnowledgeError('')
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, apiKey, model }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setKnowledgeItems(data.topics || [])
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setKnowledgeError(error.message)
    } finally {
      setKnowledgeLoading(false)
    }
  }

  const generateExercise = async (item: KnowledgeItem) => {
    if (!apiKey) return
    setExerciseLoading(item.id)
    setExerciseContent(prev => ({ ...prev, [item.id]: '' }))
    try {
      const res = await fetch('/api/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: item.topic,
          concept: item.concept,
          mastery: item.mastery,
          apiKey,
          model,
          studentGoal: MOCK_CHILD.goal,
        }),
      })
      if (!res.ok) throw new Error('Exercise generation failed')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) { full += parsed.text; setExerciseContent(prev => ({ ...prev, [item.id]: full })) }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setExerciseContent(prev => ({ ...prev, [item.id]: `⚠️ ${error.message}` }))
    } finally {
      setExerciseLoading(null)
    }
  }

  const practiceInChat = (item: KnowledgeItem) => {
    const exercise = exerciseContent[item.id]
    if (!exercise) return
    setActiveTab('chat')
    const msg: import('../types').ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      content: exercise,
      timestamp: new Date().toISOString(),
      subject: item.subject,
    }
    addMessage(msg)
  }

  const logout = () => { setUser(null); navigate('/') }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">ScholarPath</span>
            <p className="text-xs text-gray-400 leading-none">Hi Emma! 👋</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600">{MOCK_CHILD.streak} day streak</span>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-white border-b border-gray-100 flex px-2 sticky top-[57px] z-20">
        {([
          { key: 'today',     label: "Today",     icon: BookOpen },
          { key: 'chat',      label: 'AI Tutor',  icon: Brain },
          { key: 'knowledge', label: 'Knowledge', icon: BookMarked },
          { key: 'progress',  label: 'Progress',  icon: Trophy },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {/* TODAY'S PLAN */}
        {activeTab === 'today' && (
          <div>
            <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-5 text-white mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg">Today's Goals</h2>
                  <p className="text-brand-100 text-sm">Monday · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">{completedCount}/{tasks.length}</div>
                  <div className="text-brand-200 text-xs">tasks done</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all"
                  style={{ width: `${(doneMin / totalMin) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-brand-200">{doneMin} min done</span>
                <span className="text-xs text-brand-200">{totalMin} min total</span>
              </div>
            </div>

            <div className="space-y-3">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-all ${
                    task.completed ? 'opacity-60 border-gray-100' : 'border-gray-200 shadow-sm'
                  }`}
                >
                  <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                    {task.completed
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-gray-300" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: task.subjectColor }}>{task.subject}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TASK_TYPE_COLORS[task.type]}`}>
                        {task.type}
                      </span>
                    </div>
                    <p className={`text-sm font-medium text-gray-900 ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.durationMin} min</p>
                  </div>
                  {!task.completed && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                    >
                      Start <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <Brain className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">ScholarPath AI Tutor</p>
                <p className="text-xs text-gray-400">Currently: Mathematics • Quadratic Equations</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-gray-300" />
                <span className="text-xs text-gray-400">Parent-visible</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-2">
              {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
              {isThinking && <TypingIndicator />}
              {streamingContent && (
                <ChatBubble msg={{ id: 'streaming', sender: 'ai', content: streamingContent, timestamp: new Date().toISOString() }} />
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white rounded-2xl border border-gray-200 flex items-end gap-2 p-2 mt-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Ask your tutor anything about today's topic…"
                rows={1}
                className="flex-1 resize-none text-sm outline-none px-2 py-1.5 text-gray-800 placeholder:text-gray-400 max-h-28"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isThinking}
                className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-brand-700 transition-colors flex-shrink-0"
              >
                {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* KNOWLEDGE BASE */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Knowledge Base</h2>
                <p className="text-xs text-gray-500 mt-0.5">Topics extracted from your chat sessions</p>
              </div>
              <button
                onClick={loadKnowledge}
                disabled={knowledgeLoading}
                className="flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {knowledgeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {knowledgeLoading ? 'Analysing…' : 'Analyse Chats'}
              </button>
            </div>

            {knowledgeError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {knowledgeError}
              </div>
            )}

            {!knowledgeLoading && knowledgeItems.length === 0 && !knowledgeError && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No knowledge items yet</p>
                <p className="text-xs text-gray-400 mt-1">Chat with your tutor, then tap "Analyse Chats" to build your knowledge base.</p>
              </div>
            )}

            {knowledgeItems.map(item => {
              const masteryColors = {
                beginner:   { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-400' },
                developing: { bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
                confident:  { bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
              }
              const colors = masteryColors[item.mastery] || masteryColors.developing
              const isExpanded = expandedItem === item.id
              const exercise = exerciseContent[item.id]
              const isGenerating = exerciseLoading === item.id

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{item.concept}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${colors.badge}`}>
                          {item.mastery}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.topic} · {item.subject}</p>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{item.summary}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 border-t border-gray-50 pt-3">
                      {item.evidence && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">From your chat</p>
                          <p className="text-xs text-gray-600 italic">"{item.evidence}"</p>
                        </div>
                      )}

                      {item.suggestedExercise && (
                        <div className="bg-brand-50 rounded-xl p-3">
                          <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-wide mb-1">Suggested practice</p>
                          <p className="text-xs text-brand-800">{item.suggestedExercise}</p>
                        </div>
                      )}

                      {exercise && (
                        <div className="bg-purple-50 rounded-xl p-4">
                          <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide mb-2">Generated Exercise</p>
                          <p className="text-xs text-purple-900 leading-relaxed whitespace-pre-wrap">{exercise}</p>
                          <button
                            onClick={() => practiceInChat(item)}
                            className="mt-3 w-full bg-brand-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Brain className="w-3.5 h-3.5" /> Practice this in Chat
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => generateExercise(item)}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-1.5 border border-brand-200 text-brand-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-brand-50 disabled:opacity-50 transition-colors"
                      >
                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isGenerating ? 'Generating…' : exercise ? 'Regenerate Exercise' : 'Generate Exercise'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* PROGRESS */}
        {activeTab === 'progress' && (
          <div className="space-y-5">
            {/* Weekly chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">This Week</h3>
              <div className="flex items-end gap-2 h-24">
                {MOCK_CHILD.weeklyStats.map(d => {
                  const maxMin = Math.max(...MOCK_CHILD.weeklyStats.map(x => x.minutes), 1)
                  const h = d.minutes > 0 ? Math.max((d.minutes / maxMin) * 80, 8) : 4
                  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-lg transition-all ${
                          d.day === today ? 'bg-brand-500' : d.minutes > 0 ? 'bg-brand-200' : 'bg-gray-100'
                        }`}
                        style={{ height: `${h}px` }}
                      />
                      <span className={`text-[10px] font-medium ${d.day === today ? 'text-brand-600' : 'text-gray-400'}`}>{d.day}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {MOCK_CHILD.totalMinutesThisWeek} min studied this week
                <span className="ml-2 text-green-600 font-semibold">+18% vs last week 🎉</span>
              </p>
            </div>

            {/* Subject levels */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Subject Levels</h3>
              <div className="space-y-4">
                {MOCK_CHILD.subjects.map(s => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        {s.icon} {s.name}
                      </span>
                      <span className="text-xs font-bold text-gray-500">Level {s.currentLevel}/10</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${s.progressPercent}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal reminder */}
            <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-5 text-white">
              <p className="text-brand-200 text-xs font-semibold uppercase tracking-wide mb-1">Your Goal</p>
              <h3 className="font-bold text-xl mb-1">{MOCK_CHILD.goal}</h3>
              <p className="text-brand-100 text-sm">
                Class of {MOCK_CHILD.targetYear} ·{' '}
                {MOCK_CHILD.targetYear - new Date().getFullYear()} years to go · Keep it up! 🚀
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
