export type Role = 'parent' | 'student'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Subject {
  id: string
  name: string
  icon: string
  currentLevel: number   // 1-10
  targetLevel: number
  progressPercent: number
  color: string
}

export interface ChatMessage {
  id: string
  sender: 'student' | 'ai'
  content: string
  timestamp: string
  subject?: string
}

export interface DailyTask {
  id: string
  subject: string
  subjectColor: string
  title: string
  durationMin: number
  completed: boolean
  type: 'lesson' | 'exercise' | 'test' | 'review'
}

export interface Milestone {
  id: string
  year: number
  month: number
  title: string
  description: string
  status: 'completed' | 'in_progress' | 'upcoming'
  category: 'academic' | 'test' | 'extracurricular' | 'application'
}

export interface WeeklyStats {
  day: string
  minutes: number
}

// ── Child profile loaded from Supabase children table ────────────────────────
export interface ChildInfo {
  id: string
  name: string
  age: number | null
  grade: string | null
  goal: string | null
  targetYear: number | null
  avatarColor: string
  streak: number
}

// ── Weekly generated activities ───────────────────────────────────────────────
export interface WeeklyActivity {
  id: string
  type: 'exercise' | 'quiz' | 'todo' | 'reading'
  subject: string
  subjectColor: string
  title: string
  description: string
  question: string        // the actual problem or task to complete
  hint: string            // gentle nudge without giving away the answer
  durationMin: number
  difficulty: 'foundation' | 'developing' | 'advanced'
  milestoneRef: string    // which goal milestone / habit this serves
  spineRef?: string       // curriculum spine node ID e.g. "NZC-MATH-L4-NA-7" or "AS91261"
  hplAcps?: string[]      // HPL Advanced Cognitive Performance characteristics targeted
}

// ── Activity completion record ────────────────────────────────────────────────
export interface ActivityCompletion {
  activityId: string
  weekStart: string           // ISO date string "YYYY-MM-DD"
  answerText?: string
  answerImageBase64?: string  // base64 PNG from drawing canvas
  isCorrect: boolean
  score: number               // 0-100
  feedback: string            // specific feedback on their answer
  explanation: string         // explanation if wrong/partial
  encouragement: string       // warm closing line
  completedAt: string
}

export interface Child {
  id: string
  name: string
  age: number
  grade: string
  goal: string
  targetYear: number
  avatarColor: string
  subjects: Subject[]
  weeklyStats: WeeklyStats[]
  recentMessages: ChatMessage[]
  milestones: Milestone[]
  streak: number
  totalMinutesThisWeek: number
}

// ── Level Assessment ──────────────────────────────────────────────────────────
export interface AssessmentQuestion {
  id: string
  question: string
  hint?: string
  type: 'short-answer' | 'long-answer' | 'multiple-choice' | 'drawing'
  options?: string[]      // only for multiple-choice, e.g. ["A. Paris", "B. London", ...]
  difficulty: 'foundation' | 'developing' | 'advanced'
  topic: string           // e.g. "Fractions", "Photosynthesis"
}

export interface AssessmentAnswer {
  questionId: string
  answerText?: string
  answerImageBase64?: string
  selectedOption?: string  // for multiple-choice
}

export interface QuestionScore {
  questionId: string
  score: number
  isCorrect: boolean
  feedback: string
}

export interface LevelAssessment {
  id: string
  subject: string
  questions: AssessmentQuestion[]
  answers: AssessmentAnswer[]
  questionScores: QuestionScore[]
  overallScore: number
  level: 'foundation' | 'developing' | 'advanced' | 'expert'
  levelLabel: string   // e.g. "Year 5 - Developing" or "NZC Level 3"
  feedback: string
  subjectReport: string
  createdAt: string
}

export interface SubjectLevel {
  subject: string
  level: 'foundation' | 'developing' | 'advanced' | 'expert'
  levelLabel: string
  score: number
  assessedAt: string
}
