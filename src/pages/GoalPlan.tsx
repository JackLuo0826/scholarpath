/**
 * GoalPlan — the academic / study-plan layer of a GoalPlan.
 * Shows: year-by-year roadmap, subject targets, key dates.
 * Does NOT show the motivational layer (goal statement, why, habits, obstacles).
 * That lives in GoalSummary.tsx.
 */
import { useState } from 'react'
import { BookOpen, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import type { GoalPlan } from './GoalWizard'

interface Props {
  plan: GoalPlan
}

const CATEGORY_STYLES = {
  academic:        { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  test:            { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  extracurricular: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  application:     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  habit:           { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-400' },
}

export default function GoalPlan({ plan }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(plan.roadmap[0]?.year ?? null)

  return (
    <div className="space-y-5">

      {/* Year-by-year roadmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Year-by-Year Roadmap</h3>
          <span className="ml-auto text-xs text-gray-400">Backward-planned from {plan.targetYear}</span>
        </div>

        <div className="divide-y divide-gray-50">
          {plan.roadmap.map((yr) => {
            const isExpanded = expandedYear === yr.year
            return (
              <div key={yr.year}>
                <button
                  onClick={() => setExpandedYear(isExpanded ? null : yr.year)}
                  className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700 font-bold text-sm">
                    {yr.year}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{yr.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{yr.theme}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{yr.milestones.length} milestones</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 space-y-2.5">
                    {yr.milestones.map((m, mi) => {
                      const style = CATEGORY_STYLES[m.category] ?? CATEGORY_STYLES.academic
                      return (
                        <div key={mi} className={`rounded-xl p-3 ${style.bg}`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}>{m.quarter} · {m.category}</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">{m.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{m.description}</p>
                              {m.metric && (
                                <div className="mt-1.5 bg-white/60 rounded-lg px-2 py-1">
                                  <span className="text-[10px] font-semibold text-gray-500">📏 Measure: </span>
                                  <span className="text-[10px] text-gray-700">{m.metric}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Subject targets */}
      {plan.subjectTargets?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Subject Targets</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {plan.subjectTargets.map(sub => (
              <div key={sub.subject} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{sub.subject}</p>
                </div>
                <div className="flex gap-3 text-xs mb-2">
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
                <ul className="space-y-1">
                  {sub.keyActions.map((a, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-brand-400 mt-0.5">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key dates */}
      {plan.keyDates?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Key Dates</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {plan.keyDates.map((d, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div className="bg-brand-50 text-brand-700 text-xs font-bold rounded-lg px-2.5 py-1.5 flex-shrink-0">{d.date}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.event}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.importance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pb-4" />
    </div>
  )
}
