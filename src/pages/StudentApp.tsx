import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Brain, Send, Flame, Trophy,
  GraduationCap, LogOut, Loader2, Lock, BookMarked, Map, Target, CheckCircle2,
} from 'lucide-react'
import KnowledgeCanvas from './KnowledgeCanvas'
import WeeklyRoadmap from './WeeklyRoadmap'
import GoalSummary from './GoalSummary'
import WeeklyActivities from './WeeklyActivities'
import ExerciseSheet from './ExerciseSheet'
import { useApp } from '../AppContext'
import type { ChatMessage, WeeklyActivity } from '../types'

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
          {/* first letter of name, filled in below */}
          S
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

type Tab = 'today' | 'goals' | 'roadmap' | 'chat' | 'knowledge' | 'progress'

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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StudentApp() {
  const {
    messages, addMessage, logout: logoutFn, apiKey, model, goalPlan,
    childInfo, weeklyActivities, weeklyTheme, activityCompletions, weekStart,
    isGeneratingActivities, generateWeeklyActivities, submitActivityAnswer,
  } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [activeActivity, setActiveActivity] = useState<WeeklyActivity | null>(null)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
  const [knowledgeError, setKnowledgeError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, streamingContent])

  // Derive context from real data
  const childName = childInfo?.name ?? 'there'
  const childGoal = childInfo?.goal ?? goalPlan?.goalStatement ?? 'Academic excellence'
  const childStreak = childInfo?.streak ?? 0
  const targetYear = childInfo?.targetYear ?? goalPlan?.targetYear ?? null
  const nameInitial = childName.charAt(0).toUpperCase()

  // Derive the primary subject from the goal plan's subject targets
  const primarySubject = goalPlan?.subjectTargets?.[0]?.subject ?? 'your subjects'
  const primarySkill = goalPlan?.subjectTargets?.[0]?.currentLevel
    ? `improving from ${goalPlan.subjectTargets[0].currentLevel} to ${goalPlan.subjectTargets[0].targetLevel}`
    : 'reaching your goals'

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isThinking) return
    setInput('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'student',
      content: text,
      timestamp: new Date().toISOString(),
      subject: primarySubject,
    }
    addMessage(userMsg)
    setIsThinking(true)
    setStreamingContent('')

    if (!apiKey) {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: '⚠️ No API key configured. A parent needs to add a Claude API key in Settings to enable the AI tutor.',
        timestamp: new Date().toISOString(),
        subject: primarySubject,
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
          subject: primarySubject,
          skill: primarySkill,
          goal: childGoal,
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
        id: crypto.randomUUID(),
        sender: 'ai',
        content: fullContent,
        timestamp: new Date().toISOString(),
        subject: primarySubject,
      }
      addMessage(aiMsg)
      setStreamingContent('')
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: `⚠️ Error: ${error.message}. Please check the API key in Settings.`,
        timestamp: new Date().toISOString(),
        subject: primarySubject,
      }
      addMessage(aiMsg)
      setStreamingContent('')
      setIsThinking(false)
    }
  }

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

  const logout = async () => { await logoutFn(); navigate('/') }

  // ── Progress tab — compute from real activityCompletions ─────────────────
  const todayDay = DAYS[new Date().getDay()]
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Count completions per weekday from activityCompletions
  const completionsByDay: Record<string, number> = {}
  weekDays.forEach(d => { completionsByDay[d] = 0 })
  activityCompletions.forEach(c => {
    const d = new Date(c.completedAt)
    const dayLabel = DAYS[d.getDay()]
    if (completionsByDay[dayLabel] !== undefined) {
      completionsByDay[dayLabel]++
    }
  })
  const maxCompletions = Math.max(...Object.values(completionsByDay), 1)

  // Subject breakdown from activityCompletions
  const subjectMap: Record<string, { correct: number; total: number; color: string }> = {}
  weeklyActivities.forEach(act => {
    if (!subjectMap[act.subject]) {
      subjectMap[act.subject] = { correct: 0, total: 0, color: act.subjectColor }
    }
    subjectMap[act.subject].total++
    const comp = activityCompletions.find(c => c.activityId === act.id)
    if (comp?.isCorrect) subjectMap[act.subject].correct++
  })
  const subjectEntries = Object.entries(subjectMap)

  const totalDone = activityCompletions.length
  const totalActivities = weeklyActivities.length

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
            <p className="text-xs text-gray-400 leading-none">Hi {childName}! 👋</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {childStreak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">{childStreak} day streak</span>
            </div>
          )}
          <button onClick={logout} className="text-gray-400 hover:text-gray-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-white border-b border-gray-100 flex px-2 sticky top-[57px] z-20 overflow-x-auto">
        {([
          { key: 'today',    label: 'Today',      icon: BookOpen },
          { key: 'goals',    label: 'Goals',      icon: Target },
          { key: 'roadmap',  label: 'Study Plan', icon: Map },
          { key: 'chat',     label: 'AI Tutor',   icon: Brain },
          { key: 'knowledge',label: 'Knowledge',  icon: BookMarked },
          { key: 'progress', label: 'Progress',   icon: Trophy },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
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
        {/* TODAY — Weekly activities */}
        {activeTab === 'today' && (
          <WeeklyActivities
            activities={weeklyActivities}
            completions={activityCompletions}
            weekTheme={weeklyTheme}
            isGenerating={isGeneratingActivities}
            canStart={!!apiKey}
            canGenerate={!!apiKey && !!goalPlan}
            onGenerate={generateWeeklyActivities}
            onStartActivity={setActiveActivity}
          />
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
                <p className="text-xs text-gray-400">
                  {primarySubject !== 'your subjects'
                    ? `Focused on ${primarySubject} • Goal: ${childGoal}`
                    : 'Ask me anything about your studies'}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-gray-300" />
                <span className="text-xs text-gray-400">Parent-visible</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-2">
              {messages.map(m => (
                <div key={m.id} className={`flex items-end gap-2 mb-3 ${m.sender !== 'ai' ? 'flex-row-reverse' : ''}`}>
                  {m.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-brand-600" />
                    </div>
                  )}
                  {m.sender !== 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                      {nameInitial}
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'ai'
                      ? 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      : 'bg-brand-600 text-white rounded-br-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isThinking && !streamingContent && <TypingIndicator />}
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
                placeholder="Ask your tutor anything…"
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

        {/* GOALS */}
        {activeTab === 'goals' && (
          <div className="space-y-5">
            {goalPlan
              ? <GoalSummary plan={goalPlan} showReset={false} />
              : (
                <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-6 h-6 text-brand-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 mb-1">No goal set yet</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Ask a parent to run the <span className="font-semibold text-brand-600">Goal Setting Session</span> — it takes 5 minutes and builds a personalised plan with your why, habits, and obstacle strategies.
                  </p>
                </div>
              )
            }
          </div>
        )}

        {/* STUDY PLAN (weekly roadmap) */}
        {activeTab === 'roadmap' && (
          <WeeklyRoadmap
            goalPlan={goalPlan}
            onPracticeInChat={(prompt) => {
              setInput(prompt)
              setActiveTab('chat')
            }}
            onViewKnowledgeMap={() => setActiveTab('knowledge')}
          />
        )}

        {/* KNOWLEDGE BASE — infinite canvas */}
        {activeTab === 'knowledge' && (
          <KnowledgeCanvas
            items={knowledgeItems}
            loading={knowledgeLoading}
            error={knowledgeError}
            apiKey={apiKey}
            model={model}
            studentGoal={childGoal}
            onAnalyse={loadKnowledge}
            onPracticeInChat={(item, exercise) => {
              setActiveTab('chat')
              const msg: import('../types').ChatMessage = {
                id: crypto.randomUUID(),
                sender: 'ai',
                content: exercise,
                timestamp: new Date().toISOString(),
                subject: item.subject,
              }
              addMessage(msg)
            }}
          />
        )}

        {/* PROGRESS */}
        {activeTab === 'progress' && (
          <div className="space-y-5">
            {/* Weekly activity chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-1">This Week's Activities</h3>
              <p className="text-xs text-gray-400 mb-4">{totalDone} of {totalActivities} completed</p>
              <div className="flex items-end gap-2 h-20">
                {weekDays.map(d => {
                  const count = completionsByDay[d] ?? 0
                  const h = count > 0 ? Math.max((count / maxCompletions) * 64, 10) : 4
                  const isToday = d === todayDay
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-lg transition-all ${
                          isToday ? 'bg-brand-500' : count > 0 ? 'bg-brand-200' : 'bg-gray-100'
                        }`}
                        style={{ height: `${h}px` }}
                      />
                      <span className={`text-[10px] font-medium ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>{d}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Subject breakdown */}
            {subjectEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Subject Accuracy This Week</h3>
                <div className="space-y-3">
                  {subjectEntries.map(([subject, data]) => {
                    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
                    return (
                      <div key={subject}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{subject}</span>
                          <span className="text-xs font-bold text-gray-500">{data.correct}/{data.total} correct</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: data.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent completions */}
            {activityCompletions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Completions</h3>
                <div className="space-y-2">
                  {[...activityCompletions].reverse().slice(0, 5).map(c => {
                    const act = weeklyActivities.find(a => a.id === c.activityId)
                    return (
                      <div key={c.activityId} className="flex items-center gap-3 py-1">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${c.isCorrect ? 'text-green-500' : 'text-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{act?.title ?? 'Activity'}</p>
                          <p className="text-xs text-gray-400">{c.score}/100 · {act?.subject ?? ''}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Goal reminder */}
            <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-5 text-white">
              <p className="text-brand-200 text-xs font-semibold uppercase tracking-wide mb-1">Your Goal</p>
              <h3 className="font-bold text-xl mb-1">{childGoal}</h3>
              {targetYear && (
                <p className="text-brand-100 text-sm">
                  Class of {targetYear} · {targetYear - new Date().getFullYear()} years to go · Keep it up! 🚀
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Exercise modal — rendered at StudentApp root so portal has no stacking-context ancestors */}
      {activeActivity && (
        <ExerciseSheet
          activity={activeActivity}
          childAge={childInfo?.age ?? null}
          childGrade={childInfo?.grade ?? null}
          apiKey={apiKey}
          model={model}
          weekStart={weekStart}
          onClose={() => setActiveActivity(null)}
          onSubmitted={(comp) => {
            submitActivityAnswer(comp)
            setActiveActivity(null)
          }}
        />
      )}
    </div>
  )
}
