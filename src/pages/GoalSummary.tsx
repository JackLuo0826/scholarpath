/**
 * GoalSummary — the motivational / WOOP layer of a GoalPlan.
 * Shows: goal statement, why, coach note, obstacle plans, weekly habits, SDT check.
 * Does NOT show the year-by-year academic roadmap (that lives in GoalPlan.tsx).
 */
import { useState } from 'react'
import { Target, Heart, Shield, Zap, BarChart2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import type { GoalPlan } from './GoalWizard'

interface Props {
  plan: GoalPlan
  onReset?: () => void          // optional — only shown in parent view
  showReset?: boolean
}

export default function GoalSummary({ plan, onReset, showReset = true }: Props) {
  const [showObstacles, setShowObstacles] = useState(false)
  const [showHabits, setShowHabits] = useState(true)
  const [showSdt, setShowSdt] = useState(false)

  return (
    <div className="space-y-4">

      {/* Goal statement */}
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
          {showReset && onReset && (
            <button
              onClick={onReset}
              title="Start over"
              className="text-brand-300 hover:text-white transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {plan.coachNote && (
          <div className="mt-4 bg-white/10 rounded-xl p-3">
            <p className="text-sm text-brand-100 italic leading-relaxed">"{plan.coachNote}"</p>
          </div>
        )}
      </div>

      {/* Intrinsic why */}
      {plan.intrinsicWhy && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Heart className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Your Why</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{plan.intrinsicWhy}</p>
        </div>
      )}

      {/* Weekly habits */}
      {plan.weeklyHabits?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHabits(v => !v)}
            className="w-full px-5 py-3 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Weekly Habits</h3>
            <span className="text-xs text-gray-400 ml-1">({plan.weeklyHabits.length})</span>
            <div className="ml-auto">{showHabits ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</div>
          </button>
          {showHabits && (
            <div className="divide-y divide-gray-50">
              {plan.weeklyHabits.map((h, i) => (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <span className="text-base flex-shrink-0 leading-none mt-0.5">⚡</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{h.habit}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-brand-600">{h.frequency}</span>
                      {h.rationale && ` · ${h.rationale}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <span className="text-xs text-gray-400 ml-1">(WOOP · Implementation Intentions)</span>
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

      {/* SDT check */}
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
                { key: 'autonomy',    label: '🧭 Autonomy',    value: plan.sdtCheck.autonomy },
                { key: 'competence',  label: '💪 Competence',  value: plan.sdtCheck.competence },
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

      <div className="pb-2" />
    </div>
  )
}
