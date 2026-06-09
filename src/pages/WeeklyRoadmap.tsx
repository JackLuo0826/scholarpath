import { Target, Calendar, BookMarked, ChevronRight, MapPin, CheckCircle2, BookOpen, FlaskConical, Swords, Heart } from 'lucide-react'
import type { GoalPlan } from './GoalWizard'

interface Props {
  goalPlan: GoalPlan | null
  onPracticeInChat: (prompt: string) => void
  onViewKnowledgeMap: () => void
}

// Derive current quarter (1-4) from calendar month
function currentQuarterNum(): number {
  return Math.floor(new Date().getMonth() / 3) + 1
}

const QUARTER_LABEL: Record<number, string> = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' }
const QUARTER_MONTHS: Record<number, string> = {
  1: 'Jan–Mar', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dec',
}

const CATEGORY_STYLES = {
  academic:        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400',   label: 'Academic' },
  test:            { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400', label: 'Test Prep' },
  extracurricular: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400',  label: 'Extra-curricular' },
  application:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400', label: 'Application' },
  habit:           { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-400',   label: 'Habit' },
}

const CATEGORY_ICONS = {
  academic:        BookOpen,
  test:            Swords,
  extracurricular: Heart,
  application:     CheckCircle2,
  habit:           Zap,
}

function practicePrompt(milestone: { title: string; description: string; category: string }, subject?: string): string {
  const base = `I'm working on a goal milestone: "${milestone.title}". ${milestone.description}`
  if (milestone.category === 'test' || milestone.category === 'academic') {
    return `${base}\n\nCan you give me a practice exercise or quiz questions related to this? I want to make real progress on it.`
  }
  if (milestone.category === 'habit') {
    return `${base}\n\nCan you help me build an action plan and accountability system for this habit?`
  }
  if (milestone.category === 'application') {
    return `${base}\n\nCan you help me break this down into concrete next steps I can start this week?`
  }
  return `${base}${subject ? ` (Subject: ${subject})` : ''}\n\nCan you help me make progress on this milestone with a focused exercise or task?`
}

export default function WeeklyRoadmap({ goalPlan, onPracticeInChat, onViewKnowledgeMap }: Props) {
  const nowYear = new Date().getFullYear()
  const qNum = currentQuarterNum()
  const qLabel = QUARTER_LABEL[qNum]

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!goalPlan) {
    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">No roadmap yet</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Ask a parent to run the <span className="font-semibold text-brand-600">Goal Setting Session</span> — it takes 5 minutes and builds a personalised year-by-year plan just for you.
          </p>
        </div>
      </div>
    )
  }

  // ── Find this year's roadmap entry (fall back to first entry) ──────────────
  const yearEntry = goalPlan.roadmap.find(r => r.year === nowYear) ?? goalPlan.roadmap[0]

  // Split milestones into: this quarter vs rest of year
  const thisQMilestones = yearEntry?.milestones.filter(m => m.quarter === qLabel) ?? []
  const upcomingMilestones = yearEntry?.milestones.filter(m => m.quarter !== qLabel) ?? []

  return (
    <div className="space-y-5">

      {/* ── Goal banner ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-brand-200" />
          <span className="text-xs font-semibold text-brand-200 uppercase tracking-wide">Your Long-Term Goal</span>
        </div>
        <h2 className="font-bold text-base leading-snug mb-3">{goalPlan.goalStatement}</h2>
        <div className="flex items-center gap-3 text-brand-200 text-xs flex-wrap">
          <span>🎯 Target: {goalPlan.targetYear}</span>
          <span>·</span>
          <span>⏱ {goalPlan.yearsToGoal} year{goalPlan.yearsToGoal !== 1 ? 's' : ''} away</span>
          {yearEntry && <><span>·</span><span>📍 {yearEntry.label}</span></>}
        </div>
      </div>

      {/* ── Quick-access links ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onViewKnowledgeMap}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition-colors shadow-sm"
        >
          <BookMarked className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>Knowledge Map</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-auto" />
        </button>
        <button
          onClick={() => onPracticeInChat('What should I focus on studying this week to make progress toward my goal? Give me a specific 30-minute exercise.')}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition-colors shadow-sm"
        >
          <FlaskConical className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span>Quick Practice</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-auto" />
        </button>
      </div>

      {/* ── This quarter ──────────────────────────────────────────────────── */}
      {yearEntry && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-500" />
            <h3 className="font-semibold text-gray-900 text-sm">
              This Quarter — {qLabel} {QUARTER_MONTHS[qNum]}
            </h3>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {yearEntry.theme}
            </span>
          </div>

          {thisQMilestones.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No milestones scheduled for {qLabel} — check upcoming quarters below.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {thisQMilestones.map((m, i) => {
                const style = CATEGORY_STYLES[m.category] ?? CATEGORY_STYLES.academic
                const Icon = CATEGORY_ICONS[m.category] ?? BookOpen
                return (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${style.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}>{style.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{m.description}</p>
                        {m.metric && (
                          <div className={`mt-2 ${style.bg} rounded-lg px-2.5 py-1.5 border ${style.border}`}>
                            <span className="text-[10px] font-semibold text-gray-500">📏 Measure: </span>
                            <span className="text-[10px] text-gray-700">{m.metric}</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onPracticeInChat(practicePrompt(m))}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${style.bg} ${style.text} hover:opacity-80 transition-opacity`}
                          >
                            <FlaskConical className="w-3 h-3" />
                            Practice
                          </button>
                          <button
                            onClick={onViewKnowledgeMap}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <BookMarked className="w-3 h-3" />
                            Knowledge Map
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming milestones (rest of year) ────────────────────────────── */}
      {upcomingMilestones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Later This Year</h3>
            <span className="ml-auto text-xs text-gray-400">{upcomingMilestones.length} milestones</span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingMilestones.map((m, i) => {
              const style = CATEGORY_STYLES[m.category] ?? CATEGORY_STYLES.academic
              return (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold ${style.text}`}>{m.quarter}</span>
                      <span className="text-[10px] text-gray-400">·</span>
                      <span className={`text-[10px] font-semibold uppercase ${style.text}`}>{style.label}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{m.description}</p>
                  </div>
                  <button
                    onClick={() => onPracticeInChat(practicePrompt(m))}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                  >
                    Practise <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Subject targets ───────────────────────────────────────────────── */}
      {goalPlan.subjectTargets?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Subject Targets</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {goalPlan.subjectTargets.map(sub => (
              <div key={sub.subject} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{sub.subject}</p>
                  <button
                    onClick={() => onPracticeInChat(`I'm working on ${sub.subject}. My current level is: ${sub.currentLevel}. My target is: ${sub.targetLevel}. Please give me a focused practice session or quiz to help me improve.`)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                  >
                    Practice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-2 text-xs mb-2">
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Now</p>
                    <p className="text-gray-700">{sub.currentLevel}</p>
                  </div>
                  <div className="flex items-center text-gray-300">→</div>
                  <div className="flex-1 bg-brand-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-brand-400 uppercase mb-0.5">Target</p>
                    <p className="text-brand-800">{sub.targetLevel}</p>
                  </div>
                </div>
                {sub.keyActions.length > 0 && (
                  <ul className="space-y-1">
                    {sub.keyActions.slice(0, 3).map((a, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="text-brand-400 mt-0.5">•</span>{a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pb-4" />
    </div>
  )
}
