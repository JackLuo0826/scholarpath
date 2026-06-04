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
