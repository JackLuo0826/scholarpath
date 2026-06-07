import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Brain, Send, CheckCircle2, Circle, Flame, Trophy,
  GraduationCap, LogOut, ChevronRight, Loader2, Lock, BookMarked,
} from 'lucide-react'
import KnowledgeCanvas from './KnowledgeCanvas'
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

            