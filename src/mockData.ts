import type { Child, ChatMessage, DailyTask } from './types'

export const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm1', sender: 'student', content: 'I don\'t understand how to solve quadratic equations.', timestamp: '2026-05-19T09:02:00Z', subject: 'Math' },
  { id: 'm2', sender: 'ai', content: 'Great question! Let\'s break it down together. A quadratic equation looks like ax² + bx + c = 0. Before I show you the formula, can you tell me — what do you think the "solution" to an equation means?', timestamp: '2026-05-19T09:02:15Z', subject: 'Math' },
  { id: 'm3', sender: 'student', content: 'I think it means finding the value of x?', timestamp: '2026-05-19T09:03:00Z', subject: 'Math' },
  { id: 'm4', sender: 'ai', content: 'Exactly right! We\'re looking for the value(s) of x that make the equation true — equal to zero. There are three methods: factoring, completing the square, and the quadratic formula. Which sounds most familiar to you?', timestamp: '2026-05-19T09:03:20Z', subject: 'Math' },
  { id: 'm5', sender: 'student', content: 'I\'ve heard of the quadratic formula but never used it.', timestamp: '2026-05-19T09:04:00Z', subject: 'Math' },
  { id: 'm6', sender: 'ai', content: 'Perfect starting point! The quadratic formula is:\n\nx = (-b ± √(b²-4ac)) / 2a\n\nLet\'s practice with a simple one: x² + 5x + 6 = 0. What are the values of a, b, and c in this equation?', timestamp: '2026-05-19T09:04:30Z', subject: 'Math' },
  { id: 'm7', sender: 'student', content: 'a = 1, b = 5, c = 6?', timestamp: '2026-05-19T09:05:00Z', subject: 'Math' },
  { id: 'm8', sender: 'ai', content: 'Perfect! Now plug those into the formula. What do you get for b² - 4ac first?', timestamp: '2026-05-19T09:05:15Z', subject: 'Math' },
]

export const MOCK_DAILY_TASKS: DailyTask[] = [
  { id: 't1', subject: 'Mathematics', subjectColor: '#6366f1', title: 'Quadratic Equations — Practice Set 3', durationMin: 25, completed: true, type: 'exercise' },
  { id: 't2', subject: 'English', subjectColor: '#10b981', title: 'Persuasive Essay: Introduction Structure', durationMin: 20, completed: true, type: 'lesson' },
  { id: 't3', subject: 'Science', subjectColor: '#f59e0b', title: 'Newton\'s Laws — Review Quiz', durationMin: 15, completed: false, type: 'test' },
  { id: 't4', subject: 'History', subjectColor: '#ef4444', title: 'World War II Timeline — Reading', durationMin: 20, completed: false, type: 'lesson' },
  { id: 't5', subject: 'Mathematics', subjectColor: '#6366f1', title: 'Spaced Review: Geometry (Week 3)', durationMin: 10, completed: false, type: 'review' },
]

export const MOCK_CHILD: Child = {
  id: 'child1',
  name: 'Emma',
  age: 13,
  grade: 'Grade 8',
  goal: 'Harvard University',
  targetYear: 2031,
  avatarColor: '#6366f1',
  streak: 14,
  totalMinutesThisWeek: 312,
  subjects: [
    { id: 's1', name: 'Mathematics',  icon: '📐', currentLevel: 7, targetLevel: 10, progressPercent: 68, color: '#6366f1' },
    { id: 's2', name: 'English',       icon: '📖', currentLevel: 8, targetLevel: 10, progressPercent: 79, color: '#10b981' },
    { id: 's3', name: 'Science',       icon: '🔬', currentLevel: 6, targetLevel: 10, progressPercent: 55, color: '#f59e0b' },
    { id: 's4', name: 'History',       icon: '🌍', currentLevel: 7, targetLevel: 10, progressPercent: 62, color: '#ef4444' },
    { id: 's5', name: 'SAT Prep',      icon: '📝', currentLevel: 4, targetLevel: 10, progressPercent: 33, color: '#8b5cf6' },
  ],
  weeklyStats: [
    { day: 'Mon', minutes: 55 },
    { day: 'Tue', minutes: 70 },
    { day: 'Wed', minutes: 45 },
    { day: 'Thu', minutes: 80 },
    { day: 'Fri', minutes: 62 },
    { day: 'Sat', minutes: 0 },
    { day: 'Sun', minutes: 0 },
  ],
  recentMessages: MOCK_MESSAGES,
  milestones: [
    { id: 'ms1', year: 2026, month: 6,  title: 'Complete Pre-Algebra Mastery', description: 'Achieve level 8+ in Math fundamentals', status: 'in_progress', category: 'academic' },
    { id: 'ms2', year: 2026, month: 9,  title: 'PSAT Registration', description: 'Register and begin structured PSAT prep', status: 'upcoming', category: 'test' },
    { id: 'ms3', year: 2027, month: 3,  title: 'PSAT Exam', description: 'Target score: 1300+', status: 'upcoming', category: 'test' },
    { id: 'ms4', year: 2027, month: 9,  title: 'Start AP Classes (1-2)', description: 'AP Human Geography + AP Computer Science Principles', status: 'upcoming', category: 'academic' },
    { id: 'ms5', year: 2028, month: 6,  title: 'AP Exam Season', description: 'Target 4-5 on all AP exams', status: 'upcoming', category: 'test' },
    { id: 'ms6', year: 2028, month: 9,  title: 'SAT First Attempt', description: 'Target score: 1450+', status: 'upcoming', category: 'test' },
    { id: 'ms7', year: 2029, month: 6,  title: 'SAT Retake / Finalize Score', description: 'Target score: 1550+', status: 'upcoming', category: 'test' },
    { id: 'ms8', year: 2029, month: 9,  title: 'Begin College Essay Drafts', description: 'Common App + Harvard supplemental essays', status: 'upcoming', category: 'application' },
    { id: 'ms9', year: 2030, month: 10, title: 'Early Action Applications', description: 'Submit Harvard EA + 3 safety schools', status: 'upcoming', category: 'application' },
    { id: 'ms10', year: 2031, month: 3, title: '🎓 University Decision Day', description: 'Harvard Class of 2035', status: 'upcoming', category: 'application' },
  ],
}
