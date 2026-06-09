import { Loader2, RefreshCw, CheckCircle2, Lock, Sparkles, Clock, Target } from 'lucide-react'
import type { WeeklyActivity, ActivityCompletion } from '../types'

interface Props {
  activities: WeeklyActivity[]
  completions: ActivityCompletion[]
  weekTheme: string
  isGenerating: boolean
  /** True when apiKey is present — controls whether "Start Activity" button is shown */
  canStart: boolean
  /** True when apiKey AND goalPlan are present — controls Generate / Regenerate buttons */
  canGenerate: boolean
  onGenerate: () => void
  onCompleted: (completion: ActivityCompletion) => void
  onStartActivity: (activity: WeeklyActivity) => void
}

const TYPE_STYLES = {
  exercise: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200', label: '✏️ Exercise' },
  quiz:     { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', label: '📝 Quiz'     },
  todo:     { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  label: '✅ Task'     },
  reading:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  label: '📖 Reading'  },
}

const DIFF_LABEL = { foundation: '🟢', developing: '🟡', advanced: '🔴' }

export default function WeeklyActivities({
  activities, completions, weekStart, weekTheme,
  isGenerating, canGenerate,
  childAge, childGrade, childName,
  apiKey, model,
  onGenerate, onCompleted,
}: Props) {
  const [activeActivity, setActiveActivity] = useState<WeeklyActivity | null>(null)

  const completedIds = new Set(completions.map(c => c.activityId))
  const completedCount = completions.length
  const total = activities.length
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // ── Empty / generating state ─────────────────────────────────────────────
  if (activities.length === 0) {
    return (
      <div className="space-y-5">
        {/* Generate card */}
        <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            {isGenerating
              ? <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
              : <Sparkles className="w-7 h-7 text-brand-600" />
            }
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">
            {isGenerating ? 'Building your week…' : 'No activities yet this week'}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            {isGenerating
              ? 'Claude is creating personalised exercises based on your goal plan. This takes about 10 seconds.'
              : canGenerate
                ? 'Generate this week\'s personalised activities from your goal plan and milestones.'
                : 'Ask a parent to set up a Goal Plan first — then activities will be tailored to your targets.'}
          </p>
          {!isGenerating && canGenerate && (
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 mx-auto bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-colors shadow-sm text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Generate My Week
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Main list ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Week header */}
      <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-brand-200" />
          <span className="text-xs font-semibold text-brand-200 uppercase tracking-wide">This Week's Focus</span>
        </div>
        <p className="font-bold text-base leading-snug mb-3">{weekTheme}</p>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-brand-100 flex-shrink-0">
            {completedCount}/{total} done
          </span>
        </div>
      </div>

      {/* Activity cards */}
      {activities.map(act => {
        const done = completedIds.has(act.id)
        const comp = completions.find(c => c.activityId === act.id)
        const style = TYPE_STYLES[act.type]

        return (
          <div
            key={act.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              done ? 'border-green-200 opacity-75' : 'border-gray-100 hover:border-brand-200'
            }`}
          >
            <div className="px-5 pt-4 pb-4">
              {/* Subject + type row */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: act.subjectColor }}
                />
                <span className="text-xs font-semibold text-gray-500">{act.subject}</span>
                <span className="text-gray-200">·</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-gray-200">·</span>
                <span className="text-[10px] text-gray-400">{DIFF_LABEL[act.difficulty]} {act.difficulty}</span>
                <span className="ml-auto flex items-center gap-0.5 text-[10px] text-gray-400">
                  <Clock className="w-3 h-3" />
                  {act.durationMin}m
                </span>
              </div>

              {/* Title + description */}
              <h3 className={`text-sm font-bold mb-0.5 ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {act.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{act.description}</p>

              {/* Completion badge */}
              {done && comp && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 ${
                  comp.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${comp.isCorrect ? 'text-green-500' : 'text-amber-500'}`} />
                  <span className={`text-xs font-semibold ${comp.isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                    {comp.score}/100 — {comp.feedback.slice(0, 60)}{comp.feedback.length > 60 ? '…' : ''}
                  </span>
                </div>
              )}

              {/* CTA */}
              <div className="mt-3">
                {done ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </div>
                ) : !canGenerate ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                    <Lock className="w-3.5 h-3.5" />
                    Needs API key
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveActivity(act) }}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    Start Activity →
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Regenerate */}
      {canGenerate && (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 py-3 rounded-2xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isGenerating
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating…</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Generate new activities for this week</>
          }
        </button>
      )}

      {/* Exercise modal */}
      {activeActivity && (
        <ExerciseSheet
          activity={activeActivity}
          childAge={childAge}
          childGrade={childGrade}
          apiKey={apiKey}
          model={model}
          weekStart={weekStart}
          onClose={() => setActiveActivity(null)}
          onSubmitted={(comp) => {
            onCompleted(comp)
            setActiveActivity(null)
          }}
        />
      )}

      <div className="pb-4" />
    </div>
  )
}
