import { useState, useEffect } from 'react'
import {
  ChevronRight, ChevronLeft, BookOpen, Lock, Loader2,
  CheckCircle2, Clock, Star, ChevronDown, ChevronUp,
} from 'lucide-react'
import ExerciseSheet from './ExerciseSheet'
import type { WeeklyActivity } from '../types'

// ── Types from API ─────────────────────────────────────────────────────────────
interface CurriculumLesson {
  id: string
  curriculum: string
  subject: string
  subjectColor: string
  unitNumber: number
  unitTitle: string
  lessonNumber: number
  title: string
  description: string
  content: string
  question: string
  hint: string
  difficulty: 'foundation' | 'developing' | 'advanced'
  durationMin: number
}

interface CurriculumUnit {
  unitNumber: number
  title: string
  lessons: CurriculumLesson[]
}

interface Curriculum {
  id: string
  label: string
  subject: string
  subjectColor: string
  icon: string
  description: string
  units: CurriculumUnit[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const DIFFICULTY_STYLE = {
  foundation: { label: 'Foundation', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400'  },
  developing:  { label: 'Developing',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  advanced:    { label: 'Advanced',    bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
}

function lessonToActivity(lesson: CurriculumLesson): WeeklyActivity {
  return {
    id: lesson.id,
    type: 'exercise',
    subject: lesson.subject,
    subjectColor: lesson.subjectColor,
    title: lesson.title,
    description: lesson.description,
    question: `${lesson.content}\n\n---\n\n${lesson.question}`,
    hint: lesson.hint,
    durationMin: lesson.durationMin,
    difficulty: lesson.difficulty,
    milestoneRef: lesson.unitTitle,
    spineRef: undefined,
    hplAcps: undefined,
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function DifficultyBadge({ level }: { level: 'foundation' | 'developing' | 'advanced' }) {
  const s = DIFFICULTY_STYLE[level]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function LessonCard({
  lesson,
  onStart,
}: {
  lesson: CurriculumLesson
  onStart: (lesson: CurriculumLesson) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4 hover:border-gray-200 transition-colors">
      {/* Lesson number circle */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: lesson.subjectColor }}
      >
        {lesson.lessonNumber}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold text-gray-900 leading-snug">{lesson.title}</h4>
          <DifficultyBadge level={lesson.difficulty} />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-2">{lesson.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lesson.durationMin} min
          </span>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(lesson)}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: lesson.subjectColor }}
      >
        Start
      </button>
    </div>
  )
}

function UnitAccordion({
  unit,
  subjectColor,
  onStartLesson,
}: {
  unit: CurriculumUnit
  subjectColor: string
  onStartLesson: (lesson: CurriculumLesson) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Unit header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: subjectColor }}
          >
            {unit.unitNumber}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{unit.title}</p>
            <p className="text-xs text-gray-400">{unit.lessons.length} lessons</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Lessons */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
          {unit.lessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} onStart={onStartLesson} />
          ))}
        </div>
      )}
    </div>
  )
}

function CurriculumCard({
  curriculum,
  onSelect,
}: {
  curriculum: Curriculum
  onSelect: () => void
}) {
  const totalLessons = curriculum.units.reduce((s, u) => s + u.lessons.length, 0)

  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-gray-200 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
            style={{ backgroundColor: curriculum.subjectColor + '20' }}
          >
            {curriculum.icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-tight">{curriculum.label}</h3>
            <p className="text-xs font-medium" style={{ color: curriculum.subjectColor }}>
              {curriculum.subject}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors mt-1 flex-shrink-0" />
      </div>

      <p className="text-sm text-gray-500 leading-relaxed mb-3">{curriculum.description}</p>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {curriculum.units.length} units
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" />
          {totalLessons} lessons
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          NZ Year 4
        </span>
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  childAge: number | null
  childGrade: string | null
  apiKey: string
  model: string
}

export default function CurriculumLibrary({ childAge, childGrade, apiKey, model }: Props) {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null)
  const [activeLesson, setActiveLesson] = useState<WeeklyActivity | null>(null)

  useEffect(() => {
    fetch('/api/get-curriculum?grade=Year%204&country=NZ')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setCurricula(data.curricula ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (!apiKey) {
    return (
      <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-brand-600" />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">API key required</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          A parent needs to add a Claude API key in Settings to enable the curriculum library.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading curriculum…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold text-red-700 mb-1">Could not load curriculum</p>
        <p className="text-xs text-red-500">{error}</p>
        <p className="text-xs text-gray-400 mt-2">
          Run the migration and seed script first — see README for instructions.
        </p>
      </div>
    )
  }

  // ── Curriculum list view ───────────────────────────────────────────────────
  if (!selectedCurriculum) {
    return (
      <div className="space-y-4">
        <div className="mb-2">
          <h2 className="text-lg font-bold text-gray-900">Curriculum Library</h2>
          <p className="text-sm text-gray-400">Bite-sized lessons for NZ Year 4</p>
        </div>

        {curricula.length === 0 ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-amber-800 mb-1">No lessons found</p>
            <p className="text-xs text-amber-600">
              Run <code className="bg-amber-100 px-1 rounded">node seed-curriculum.mjs</code> to populate the library.
            </p>
          </div>
        ) : (
          curricula.map(c => (
            <CurriculumCard key={c.id} curriculum={c} onSelect={() => setSelectedCurriculum(c)} />
          ))
        )}
      </div>
    )
  }

  // ── Single curriculum view (unit list) ────────────────────────────────────
  return (
    <>
      <div className="space-y-4">
        {/* Back + header */}
        <div>
          <button
            onClick={() => setSelectedCurriculum(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 -ml-1"
          >
            <ChevronLeft className="w-4 h-4" />
            All curricula
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: selectedCurriculum.subjectColor + '20' }}
            >
              {selectedCurriculum.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedCurriculum.label}</h2>
              <p className="text-xs font-medium" style={{ color: selectedCurriculum.subjectColor }}>
                {selectedCurriculum.subject} · NZ Year 4
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{selectedCurriculum.description}</p>
        </div>

        {/* Units */}
        {selectedCurriculum.units.map(unit => (
          <UnitAccordion
            key={unit.unitNumber}
            unit={unit}
            subjectColor={selectedCurriculum.subjectColor}
            onStartLesson={lesson => setActiveLesson(lessonToActivity(lesson))}
          />
        ))}
      </div>

      {/* Exercise modal */}
      {activeLesson && (
        <ExerciseSheet
          activity={activeLesson}
          childAge={childAge}
          childGrade={childGrade}
          apiKey={apiKey}
          model={model}
          weekStart={new Date().toISOString().slice(0, 10)}
          onClose={() => setActiveLesson(null)}
          onSubmitted={() => setActiveLesson(null)}
        />
      )}
    </>
  )
}
