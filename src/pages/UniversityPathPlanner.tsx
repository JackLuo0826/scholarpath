import { useState } from 'react'
import {
  GraduationCap, ChevronRight, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, CheckCircle2, Star, Briefcase,
  BookOpen, Calendar, Users, RefreshCw, Target,
  TrendingUp, Clock, AlertCircle, Sparkles
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────
export interface UniversityPath {
  summary: {
    studentName: string
    targetField: string
    targetCareer: string
    targetUniversityTier: string
    exampleUniversities: string[]
    educationSystem: string
    currentYear: string
    applicationYear: string
    yearsRemaining: number
    competitivenessBrief: string
    overallATARorEquivalent: string
  }
  prerequisites: {
    essential: { subject: string; why: string; targetGrade: string; urgency: string }[]
    recommended: { subject: string; why: string; targetGrade: string; urgency: string }[]
    standardisedTests: { test: string; targetScore: string; whenToTake: string; notes: string }[]
    extracurriculars: { activity: string; why: string; startBy: string }[]
  }
  yearlyPlan: {
    yearLabel: string
    calendarYear: number
    theme: string
    focus: string
    subjects: { subject: string; priority: string; target: string; rationale: string }[]
    milestones: { quarter: string; action: string; category: string; metric: string }[]
    warningFlags: string[]
    parentActions: string[]
  }[]
  applicationTimeline: { timeframe: string; action: string; category: string }[]
  subjectDeepDives: {
    subject: string
    currentPriority: string
    whyItMatters: string
    topicsThatMatter: string[]
    resourceSuggestions: string[]
  }[]
  careerInsights: {
    dayInTheLife: string
    salaryRange: string
    jobMarketOutlook: string
    alternativePaths: string[]
    universityMatters: string
  }
  parentChecklist: { action: string; timing: string; priority: string }[]
  coachMessage: string
}

// ── Field options ─────────────────────────────────────────────────────────
const FIELDS = [
  { id: 'medicine', label: 'Medicine / Health', emoji: '🏥', careers: ['Doctor (GP)', 'Surgeon', 'Psychiatrist', 'Dentist', 'Pharmacist', 'Physiotherapist'] },
  { id: 'engineering', label: 'Engineering', emoji: '⚙️', careers: ['Software Engineer', 'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Biomedical Engineer'] },
  { id: 'law', label: 'Law', emoji: '⚖️', careers: ['Barrister / Lawyer', 'Corporate Lawyer', 'Human Rights Lawyer', 'Judge', 'Legal Counsel'] },
  { id: 'cs', label: 'Computer Science / AI', emoji: '💻', careers: ['AI/ML Engineer', 'Software Engineer', 'Cybersecurity Analyst', 'Data Scientist', 'Product Manager'] },
  { id: 'business', label: 'Business / Finance', emoji: '💼', careers: ['Investment Banker', 'Management Consultant', 'Entrepreneur', 'Accountant', 'Financial Analyst'] },
  { id: 'science', label: 'Science / Research', emoji: '🔬', careers: ['Research Scientist', 'Biomedical Researcher', 'Environmental Scientist', 'Chemist', 'Physicist'] },
  { id: 'architecture', label: 'Architecture / Design', emoji: '🏛️', careers: ['Architect', 'Urban Designer', 'Interior Designer', 'Landscape Architect'] },
  { id: 'arts', label: 'Arts / Humanities', emoji: '🎨', careers: ['Journalist', 'Writer', 'Curator', 'Academic', 'Diplomat / Policy'] },
  { id: 'education', label: 'Education / Psychology', emoji: '📚', careers: ['Teacher', 'Psychologist', 'Counsellor', 'School Principal', 'Educational Researcher'] },
  { id: 'other', label: 'Other / Not sure yet', emoji: '🌟', careers: [] },
]

const SYSTEMS = [
  { id: 'australia', label: 'Australia', flag: '🇦🇺', detail: 'ATAR / VCE / HSC / QCE' },
  { id: 'uk', label: 'United Kingdom', flag: '🇬🇧', detail: 'A-Levels / GCSEs / UCAS' },
  { id: 'us', label: 'United States', flag: '🇺🇸', detail: 'GPA / SAT / ACT / AP' },
  { id: 'ib', label: 'International (IB)', flag: '🌍', detail: 'IB Diploma Programme' },
  { id: 'other', label: 'Other', flag: '🗺️', detail: 'Specify in notes' },
]

const UNI_TIERS = [
  { id: 'top10', label: 'World Top 10', detail: 'Oxford, Cambridge, MIT, Harvard, Stanford…', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'top50', label: 'World Top 50', detail: 'Go8, Russell Group, Ivy+, top US publics…', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'top100', label: 'Top 100 / Selective', detail: 'Strong national universities with competitive entry', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'good', label: 'Good University', detail: 'Solid accredited programs, strong employability', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'specific', label: 'Specific University', detail: 'I have a particular university in mind', color: 'bg-amber-100 text-amber-800 border-amber-200' },
]

const GRADES = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const URGENCY_STYLES: Record<string, string> = {
  critical:    'bg-red-100 text-red-700 border-red-200',
  important:   'bg-amber-100 text-amber-700 border-amber-200',
  recommended: 'bg-blue-100 text-blue-700 border-blue-200',
}

const CATEGORY_STYLES: Record<string, { bg: string; dot: string }> = {
  academic:       { bg: 'bg-blue-50',    dot: 'bg-blue-400' },
  test:           { bg: 'bg-purple-50',  dot: 'bg-purple-400' },
  extracurricular:{ bg: 'bg-green-50',   dot: 'bg-green-400' },
  application:    { bg: 'bg-orange-50',  dot: 'bg-orange-400' },
  wellbeing:      { bg: 'bg-teal-50',    dot: 'bg-teal-400' },
}

// ── Section toggle helper ─────────────────────────────────────────────────
function Section({ title, icon: Icon, defaultOpen = false, badge, children }: {
  title: string; icon: React.ComponentType<{className?: string}>; defaultOpen?: boolean; badge?: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-3.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left">
        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="font-semibold text-gray-900 text-sm flex-1">{title}</span>
        {badge && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">{badge}</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-50">{children}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
interface Props {
  apiKey: string
  model: string
  path: UniversityPath | null
  onPathGenerated: (path: UniversityPath) => void
  onPathCleared: () => void
}

export default function UniversityPathPlanner({ apiKey, model, path, onPathGenerated, onPathCleared }: Props) {
  // Form state
  const [step, setStep] = useState<'field' | 'system' | 'tier' | 'details' | 'generating'>('field')
  const [selectedField, setSelectedField] = useState<typeof FIELDS[0] | null>(null)
  const [selectedCareer, setSelectedCareer] = useState('')
  const [selectedSystem, setSelectedSystem] = useState<typeof SYSTEMS[0] | null>(null)
  const [selectedTier, setSelectedTier] = useState<typeof UNI_TIERS[0] | null>(null)
  const [specificUniversity, setSpecificUniversity] = useState('')
  const [currentGrade, setCurrentGrade] = useState('Year 9')
  const [studentName, setStudentName] = useState('')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [error, setError] = useState('')

  // Plan view state
  const [expandedYear, setExpandedYear] = useState<number | null>(null)

  const generate = async () => {
    if (!apiKey) { setError('No API key — go to Settings and add your Claude API key.'); return }
    setStep('generating')
    setError('')
    try {
      const profile = {
        system: selectedSystem?.label,
        field: selectedField?.label,
        specificCareer: selectedCareer,
        universityTier: selectedTier?.label,
        specificUniversity,
        currentYear: currentGrade,
        studentName,
        strengths,
        weaknesses,
        additionalContext,
      }
      const res = await fetch('/api/university-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, apiKey, model }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // Auto-expand current year
      if (data.yearlyPlan?.[0]) setExpandedYear(data.yearlyPlan[0].calendarYear)
      onPathGenerated(data)
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error('Unknown error')
      setError(e.message)
      setStep('details')
    }
  }

  // ── If path already set, show the plan ──────────────────────────────────
  if (path) {
    const { summary, prerequisites, yearlyPlan, applicationTimeline, subjectDeepDives, careerInsights, parentChecklist } = path
    return (
      <div className="space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-brand-200" />
                <span className="text-xs font-semibold text-brand-200 uppercase tracking-wide">University Path</span>
              </div>
              <h2 className="text-xl font-bold leading-snug">{summary.targetCareer}</h2>
              <p className="text-brand-100 text-sm mt-1">{summary.targetField} · {summary.targetUniversityTier}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {summary.exampleUniversities.slice(0, 3).map(u => (
                  <span key={u} className="bg-white/15 text-white text-[10px] font-semibold px-2 py-1 rounded-lg">{u}</span>
                ))}
              </div>
            </div>
            <button onClick={onPathCleared} title="Change path" className="text-brand-300 hover:text-white transition-colors flex-shrink-0 mt-1">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-lg font-extrabold">{summary.yearsRemaining}</p>
              <p className="text-brand-200 text-[10px]">years to apply</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold leading-tight">{summary.overallATARorEquivalent}</p>
              <p className="text-brand-200 text-[10px]">target score</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold leading-tight">{summary.applicationYear}</p>
              <p className="text-brand-200 text-[10px]">application year</p>
            </div>
          </div>
          {summary.competitivenessBrief && (
            <div className="mt-3 bg-white/10 rounded-xl p-3">
              <p className="text-xs text-brand-100 leading-relaxed">{summary.competitivenessBrief}</p>
            </div>
          )}
          {path.coachMessage && (
            <p className="mt-3 text-xs text-brand-200 italic leading-relaxed">"{path.coachMessage}"</p>
          )}
        </div>

        {/* Prerequisites */}
        <Section title="Subject Prerequisites" icon={BookOpen} defaultOpen badge={`${prerequisites.essential.length} essential`}>
          <div className="px-5 py-4 space-y-3">
            {prerequisites.essential.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-2">Essential — No exceptions</p>
                <div className="space-y-2">
                  {prerequisites.essential.map(p => (
                    <div key={p.subject} className="flex items-start gap-2.5 bg-red-50 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{p.subject}</span>
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{p.targetGrade}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{p.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {prerequisites.recommended.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-2">Strongly Recommended</p>
                <div className="space-y-2">
                  {prerequisites.recommended.map(p => (
                    <div key={p.subject} className="flex items-start gap-2.5 bg-amber-50 rounded-xl p-3">
                      <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{p.subject}</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.targetGrade}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{p.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {prerequisites.standardisedTests.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide mb-2">Standardised Tests</p>
                <div className="space-y-2">
                  {prerequisites.standardisedTests.map(t => (
                    <div key={t.test} className="bg-purple-50 rounded-xl p-3">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-sm font-semibold text-gray-900">{t.test}</span>
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{t.targetScore}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">📅 {t.whenToTake}</p>
                      {t.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{t.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {prerequisites.extracurriculars.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-2">Extracurriculars That Matter</p>
                <div className="space-y-2">
                  {prerequisites.extracurriculars.map(e => (
                    <div key={e.activity} className="bg-green-50 rounded-xl p-3 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{e.activity}</p>
                        <p className="text-xs text-gray-600">{e.why} <span className="text-green-600 font-medium">· Start by {e.startBy}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Year-by-year plan */}
        <Section title="Year-by-Year Plan" icon={Calendar} defaultOpen badge={`${yearlyPlan.length} years`}>
          <div className="divide-y divide-gray-50">
            {yearlyPlan.map((yr) => {
              const isExpanded = expandedYear === yr.calendarYear
              return (
                <div key={yr.calendarYear}>
                  <button
                    onClick={() => setExpandedYear(isExpanded ? null : yr.calendarYear)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-brand-700 font-extrabold text-sm leading-none">{yr.calendarYear}</span>
                      <span className="text-brand-400 text-[9px] leading-none mt-0.5">{yr.yearLabel.split('/')[0].trim()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{yr.theme}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{yr.focus}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {yr.warningFlags?.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      <span className="text-xs text-gray-400">{yr.milestones?.length} tasks</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 bg-gray-50/50">
                      {/* Subjects */}
                      {yr.subjects?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Subject Focus</p>
                          <div className="flex flex-wrap gap-2">
                            {yr.subjects.map(s => (
                              <div key={s.subject} className={`rounded-xl px-3 py-1.5 border text-xs ${
                                s.priority === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                                s.priority === 'high' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                'bg-gray-100 border-gray-200 text-gray-700'
                              }`}>
                                <span className="font-semibold">{s.subject}</span>
                                <span className="text-[10px] ml-1 opacity-70">→ {s.target}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Milestones */}
                      {yr.milestones?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Milestones</p>
                          <div className="space-y-2">
                            {yr.milestones.map((m, i) => {
                              const cs = CATEGORY_STYLES[m.category] || CATEGORY_STYLES.academic
                              return (
                                <div key={i} className={`rounded-xl p-3 ${cs.bg}`}>
                                  <div className="flex items-start gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cs.dot}`} />
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase">{m.quarter}</span>
                                        <span className="text-[10px] text-gray-400 capitalize">· {m.category}</span>
                                      </div>
                                      <p className="text-sm text-gray-900 font-medium mt-0.5">{m.action}</p>
                                      {m.metric && <p className="text-[10px] text-gray-500 mt-0.5">📏 {m.metric}</p>}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Warning flags */}
                      {yr.warningFlags?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-2">⚠️ Watch out for</p>
                          {yr.warningFlags.map((w, i) => (
                            <p key={i} className="text-xs text-amber-800 leading-relaxed">• {w}</p>
                          ))}
                        </div>
                      )}

                      {/* Parent actions */}
                      {yr.parentActions?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">👨‍👩‍👧 Parent actions this year</p>
                          {yr.parentActions.map((a, i) => (
                            <p key={i} className="text-xs text-blue-800 leading-relaxed">• {a}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* Application timeline */}
        {applicationTimeline?.length > 0 && (
          <Section title="Application Timeline" icon={Clock}>
            <div className="px-5 py-4 space-y-2">
              {applicationTimeline.map((t, i) => {
                const cs = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.application
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${cs.bg}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cs.dot}`} />
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">{t.timeframe}</p>
                      <p className="text-sm text-gray-800 font-medium">{t.action}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Career insights */}
        {careerInsights && (
          <Section title="Career Insights" icon={Briefcase}>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">💰 Salary Range</p>
                  <p className="text-xs text-gray-800 font-medium">{careerInsights.salaryRange}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">📈 Job Outlook</p>
                  <p className="text-xs text-gray-800">{careerInsights.jobMarketOutlook}</p>
                </div>
              </div>
              <div className="bg-brand-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-brand-500 uppercase mb-1">A Day in the Life</p>
                <p className="text-xs text-brand-900 leading-relaxed">{careerInsights.dayInTheLife}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Does the University Name Matter?</p>
                <p className="text-xs text-gray-700 leading-relaxed">{careerInsights.universityMatters}</p>
              </div>
              {careerInsights.alternativePaths?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Alternative Paths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {careerInsights.alternativePaths.map(p => (
                      <span key={p} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Subject deep dives */}
        {subjectDeepDives?.length > 0 && (
          <Section title="Subject Deep Dives" icon={TrendingUp}>
            <div className="divide-y divide-gray-50">
              {subjectDeepDives.map(s => (
                <div key={s.subject} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-900">{s.subject}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${URGENCY_STYLES[s.currentPriority] || URGENCY_STYLES.recommended}`}>
                      {s.currentPriority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mb-2 leading-relaxed">{s.whyItMatters}</p>
                  {s.topicsThatMatter?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-gray-400 mb-1">Key Topics</p>
                      <div className="flex flex-wrap gap-1">
                        {s.topicsThatMatter.map(t => <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{t}</span>)}
                      </div>
                    </div>
                  )}
                  {s.resourceSuggestions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 mb-1">Resources</p>
                      <div className="flex flex-wrap gap-1">
                        {s.resourceSuggestions.map(r => <span key={r} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{r}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Parent checklist */}
        {parentChecklist?.length > 0 && (
          <Section title="Parent Action Checklist" icon={Users}>
            <div className="divide-y divide-gray-50">
              {parentChecklist.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    item.priority === 'high' ? 'bg-red-400' : item.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-400 mt-0.5">📅 {item.timing}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="pb-4" />
      </div>
    )
  }

  // ── Wizard steps ─────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-5">
          <Sparkles className="w-8 h-8 text-brand-600 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Building your university path…</h3>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          Analysing requirements for {selectedField?.label} at {selectedTier?.label} level and mapping your {currentGrade} → {selectedTier?.id === 'specific' ? specificUniversity : 'university'} journey
        </p>
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin mt-6" />
        {error && <p className="mt-4 text-xs text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Field */}
      {step === 'field' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">What field is the goal?</h3>
            <p className="text-sm text-gray-500 mt-1">This determines prerequisite subjects, key tests, and application strategy.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedField(f); if (f.careers.length > 0) setSelectedCareer(f.careers[0]) }}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 text-left transition-all ${
                  selectedField?.id === f.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="text-sm font-semibold text-gray-900 leading-tight">{f.label}</span>
              </button>
            ))}
          </div>
          {selectedField && selectedField.careers.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">Specific career goal (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {selectedField.careers.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCareer(c)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                      selectedCareer === c ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-brand-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            disabled={!selectedField}
            onClick={() => setStep('system')}
            className="w-full bg-brand-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Education system */}
      {step === 'system' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Which education system?</h3>
            <p className="text-sm text-gray-500 mt-1">This determines the grading system, tests, and curriculum requirements.</p>
          </div>
          <div className="space-y-2">
            {SYSTEMS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSystem(s)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedSystem?.id === s.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-200'
                }`}
              >
                <span className="text-2xl">{s.flag}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.detail}</p>
                </div>
                {selectedSystem?.id === s.id && <CheckCircle2 className="w-5 h-5 text-brand-500 ml-auto" />}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('field')} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">Back</button>
            <button disabled={!selectedSystem} onClick={() => setStep('tier')} className="flex-1 bg-brand-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: University tier */}
      {step === 'tier' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">University ambition?</h3>
            <p className="text-sm text-gray-500 mt-1">Be honest — the higher the target, the more demanding the plan. You can always adjust.</p>
          </div>
          <div className="space-y-2">
            {UNI_TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t)}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedTier?.id === t.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-200'
                }`}
              >
                <div className={`mt-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border flex-shrink-0 ${t.color}`}>
                  {t.id === 'top10' ? '★★★' : t.id === 'top50' ? '★★' : t.id === 'top100' ? '★' : '◆'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.detail}</p>
                </div>
                {selectedTier?.id === t.id && <CheckCircle2 className="w-5 h-5 text-brand-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
          {selectedTier?.id === 'specific' && (
            <input
              value={specificUniversity}
              onChange={e => setSpecificUniversity(e.target.value)}
              placeholder="e.g. University of Melbourne, Oxford, MIT…"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep('system')} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">Back</button>
            <button disabled={!selectedTier} onClick={() => setStep('details')} className="flex-1 bg-brand-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Student details */}
      {step === 'details' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">About the student</h3>
            <p className="text-sm text-gray-500 mt-1">The more context you give, the more accurate the plan.</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Student's name</label>
              <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. Emma" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Current year / grade</label>
              <select value={currentGrade} onChange={e => setCurrentGrade(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Academic strengths <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="e.g. Maths, problem-solving, writing" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Areas that need work <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={weaknesses} onChange={e => setWeaknesses(e.target.value)} placeholder="e.g. Essay writing, Chemistry" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Anything else Claude should know <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} rows={2} placeholder="e.g. attends selective school, diagnosed dyslexia, interested in sport medicine specifically…" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs space-y-1 text-gray-600">
            <p><span className="font-semibold text-gray-700">Field:</span> {selectedField?.emoji} {selectedField?.label} {selectedCareer && `→ ${selectedCareer}`}</p>
            <p><span className="font-semibold text-gray-700">System:</span> {selectedSystem?.flag} {selectedSystem?.label}</p>
            <p><span className="font-semibold text-gray-700">Target:</span> {selectedTier?.label} {specificUniversity && `(${specificUniversity})`}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button onClick={() => setStep('tier')} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">Back</button>
            <button
              onClick={generate}
              disabled={!apiKey}
              className="flex-1 bg-brand-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4" /> Generate Path
            </button>
          </div>
          {!apiKey && <p className="text-xs text-center text-red-500">⚠️ Add a Claude API key in Settings first</p>}
        </div>
      )}
    </div>
  )
}
