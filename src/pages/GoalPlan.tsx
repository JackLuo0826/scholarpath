import { useState } from 'react'
import { Target, ChevronDown, ChevronUp, BookOpen, Zap, Shield, Calendar, Heart, BarChart2, RefreshCw } from 'lucide-react'

import type { GoalPlan } from './GoalWizard'

interface Props {
  plan: GoalPlan
  onReset: () => void
}

const CATEGORY_STYLES = {
  academic:       { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  test:           { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  extracurricular:{ bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  application:    { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  habit:          { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-400' },
}

export default function GoalPlan({ plan, onReset }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(plan.roadmap[0]?.year ?? null)
  const [showObstacles, setShowObstacles] = useState(false)
  const [showHabits, setShowHabits] = useState(false)
  const [showSdt, setShowSdt] = useState(false)

  return (
    <div className="space-y-5">

      {/* Goal statement card */}
      <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-brand-200" />
              <span className="text-xs font-semibold text-brand-200 uppercase tracking-wide">Long-Term Goal</span>
            </div>
            <h2 className="font-bold text-lg leading-snug mb-3">{plan.goalStatement}</h2>
            <div className="flex items-center gap-3 text-brand-200 text-xs">
              <span>📅 Target: {plan.targetYear}</span>
              <span>·</span>
              <span>⏱ {plan.yearsToGoal} year{plan.yearsToGoal !== 1 ? 's' : ''} away</span>
            </div>
          </div>
          <button
            onClick={onReset}
            title="Start over"
            className="text-brand-300 hover:text-white transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {plan.coachNote && (
          <div className="mt-4 bg-white/10 rounded-xl p-3">
            <p className="text-sm text-brand-100 italic leading-relaxed">"{plan.coachNote}"</p>
          </div>
        )}
      </div>

      {/* Why card */}
      {plan.intrinsicWhy && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Heart className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Your Why</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{plan.intrinsicWhy}</p>
        </div>
      )}

      {/* Year-by-year roadmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Year-by-Year Roadmap</h3>
          <span className="ml-auto text-xs text-gray-400">Backward-planned from {plan.targetYear}</span>
        </div>

        <div className="divide-y divide-gray-50">
          {plan.roadmap.map((yr, yi) => {
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
                      const style = CATEGORY_STYLES[m.category] || CATEGORY_STYLES.academic
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

      {/* Obstacle plans (WOOP) */}
      {plan.obstaclePlans?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowObstacles(v => !v)}
            className="w-full px-5 py-3 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Shield className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Obstacle Plans</h3>
            <span className="text-xs text-gray-400 ml-1">(WOOP + Implementation Intentions)</span>
            <div className="ml-auto">{showObstacles ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</div>
          </button>
          {showObstacles && (
            <div className="divide-y divide-gray-50">
              {plan.obstaclePlans.map((op, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${op.type === 'internal' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {op.type}
                    </span>
                    <p className="text-sm font-semibold text-gray-900">{op.obstacle}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">Implementation Intention</p>
                    <p className="text-xs text-indigo-900 italic leading-relaxed">"{op.implementationIntention}"</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Contingency</p>
                    <p className="text-xs text-gray-700">{op.contingency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly habits */}
      {plan.weeklyHabits?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHabits(v => !v)}
            className="w-full px-5 py-3 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Zap className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Weekly Habits</h3>
            <div className="ml-auto">{showHabits ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</div>
          </button>
          {showHabits && (
            <div className="divide-y divide-gray-50">
              {plan.weeklyHabits.map((h, i) => (
                <div key={i} className="px-5 py-3.5">
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">⚡</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{h.habit}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-brand-600">{h.frequency}</span>
                        {h.rationale && ` · ${h.rationale}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SDT Check */}
      {plan.sdtCheck && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSdt(v => !v)}
            className="w-full px-5 py-3 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Motivation Health Check</h3>
            <span className="text-xs text-gray-400 ml-1">(Self-Determination Theory)</span>
            <div className="ml-auto">{showSdt ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</div>
          </button>
          {showSdt && (
            <div className="px-5 py-4 space-y-3">
              {[
                { key: 'autonomy', label: '🧭 Autonomy', value: plan.sdtCheck.autonomy },
                { key: 'competence', label: '💪 Competence', value: plan.sdtCheck.competence },
                { key: 'relatedness', label: '🤝 Relatedness', value: plan.sdtCheck.relatedness },
              ].map(item => (
                <div key={item.key} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">{item.label}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          )}
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
