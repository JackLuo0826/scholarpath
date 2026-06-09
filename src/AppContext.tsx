import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, ChatMessage, ChildInfo, WeeklyActivity, ActivityCompletion } from './types'
import { MOCK_MESSAGES } from './mockData'
import type { GoalPlan } from './pages/GoalWizard'
import type { UniversityPath } from './pages/UniversityPathPlanner'
import { supabase, isSupabaseConfigured } from './lib/supabase'

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the current week */
function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

interface AppState {
  user: User | null
  messages: ChatMessage[]
  apiKey: string
  model: string
  goalPlan: GoalPlan | null
  universityPath: UniversityPath | null
  childId: string | null
  childInfo: ChildInfo | null
  weeklyActivities: WeeklyActivity[]
  weeklyTheme: string
  activityCompletions: ActivityCompletion[]
  weekStart: string
  isGeneratingActivities: boolean
  isLoadingSession: boolean
  setUser: (u: User | null) => void
  logout: () => Promise<void>
  addMessage: (m: ChatMessage) => void
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setGoalPlan: (plan: GoalPlan | null) => void
  setUniversityPath: (path: UniversityPath | null) => void
  generateWeeklyActivities: () => Promise<void>
  submitActivityAnswer: (completion: ActivityCompletion) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

function ls<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback } catch { return fallback }
}
function lsSet(key: string, value: unknown) {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => ls('sp_user', null))
  const [messages, setMessages] = useState<ChatMessage[]>(() => ls('sp_messages', MOCK_MESSAGES))
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem('sp_api_key') || '')
  const [model, setModelState] = useState<string>(() => localStorage.getItem('sp_model') || 'claude-opus-4-6')
  const [goalPlan, setGoalPlanState] = useState<GoalPlan | null>(() => ls('sp_goal_plan', null))
  const [universityPath, setUniversityPathState] = useState<UniversityPath | null>(() => ls('sp_university_path', null))
  const [childId, setChildId] = useState<string | null>(() => localStorage.getItem('sp_child_id'))
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(() => ls('sp_child_info', null))
  const [weeklyActivities, setWeeklyActivities] = useState<WeeklyActivity[]>(() => ls('sp_weekly_acts', []))
  const [weeklyTheme, setWeeklyTheme] = useState<string>(() => localStorage.getItem('sp_weekly_theme') || '')
  const [activityCompletions, setActivityCompletions] = useState<ActivityCompletion[]>(() => ls('sp_act_completions', []))
  const [weekStart] = useState<string>(getWeekStart)
  const [isGeneratingActivities, setIsGeneratingActivities] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(isSupabaseConfigured)

  // ── Supabase session restore ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return

    // onAuthStateChange fires INITIAL_SESSION on mount — no need for a separate getSession() call
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserFromSession(session.user.id, session.user.email ?? '')
      } else {
        setUserState(null)
        lsSet('sp_user', null)
      }
      if (event === 'INITIAL_SESSION') {
        setIsLoadingSession(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadUserFromSession = async (authId: string, email: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authId)
      .maybeSingle()

    if (!profile) return

    const u: User = { id: authId, name: profile.name, email, role: profile.role }
    setUserState(u)
    lsSet('sp_user', u)

    if (profile.role === 'parent') {
      // Load first child
      const { data: childrenRows } = await supabase
        .from('children')
        .select('id, name, age, grade, goal, target_year, avatar_color, streak')
        .eq('parent_id', authId)
        .limit(1)

      const childRow = childrenRows?.[0] ?? null
      const cid = childRow?.id ?? null
      setChildId(cid)
      if (cid) localStorage.setItem('sp_child_id', cid)

      if (childRow) {
        const ci: ChildInfo = {
          id: childRow.id, name: childRow.name, age: childRow.age,
          grade: childRow.grade, goal: childRow.goal, targetYear: childRow.target_year,
          avatarColor: childRow.avatar_color ?? '#6366f1', streak: childRow.streak ?? 0,
        }
        setChildInfo(ci); lsSet('sp_child_info', ci)
      }

      if (cid) {
        await loadChildData(cid)

        // Load model setting (parent-only)
        const { data: settings } = await supabase
          .from('settings')
          .select('claude_model')
          .eq('parent_id', authId)
          .maybeSingle()
        if (settings?.claude_model) {
          setModelState(settings.claude_model)
          localStorage.setItem('sp_model', settings.claude_model)
        }
      }
    } else if (profile.role === 'student') {
      // Resolve child row by auth_id
      const { data: childRow } = await supabase
        .from('children')
        .select('id, name, age, grade, goal, target_year, avatar_color, streak')
        .eq('auth_id', authId)
        .maybeSingle()

      const cid = childRow?.id ?? null
      setChildId(cid)
      if (cid) localStorage.setItem('sp_child_id', cid)

      if (childRow) {
        const ci: ChildInfo = {
          id: childRow.id, name: childRow.name, age: childRow.age,
          grade: childRow.grade, goal: childRow.goal, targetYear: childRow.target_year,
          avatarColor: childRow.avatar_color ?? '#6366f1', streak: childRow.streak ?? 0,
        }
        setChildInfo(ci); lsSet('sp_child_info', ci)
      }

      if (cid) {
        await loadChildData(cid)
      }
    }
  }

  const loadChildData = async (cid: string) => {
    // Load chat messages
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('child_id', cid)
      .order('created_at', { ascending: true })
      .limit(200)

    if (msgs && msgs.length > 0) {
      setMessages(msgs.map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        subject: m.subject ?? undefined,
        timestamp: m.created_at,
      })))
    }

    // Load goal plan
    const { data: gp } = await supabase
      .from('goal_plans')
      .select('plan_json')
      .eq('child_id', cid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (gp) { setGoalPlanState(gp.plan_json); lsSet('sp_goal_plan', gp.plan_json) }

    // Load university path
    const { data: up } = await supabase
      .from('university_paths')
      .select('path_json')
      .eq('child_id', cid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (up) { setUniversityPathState(up.path_json); lsSet('sp_university_path', up.path_json) }

    // Load this week's activities
    const currentWeekStart = getWeekStart()
    const { data: wa } = await supabase
      .from('weekly_activities')
      .select('activities, week_theme')
      .eq('child_id', cid)
      .eq('week_start', currentWeekStart)
      .maybeSingle()
    if (wa) {
      setWeeklyActivities(wa.activities ?? [])
      setWeeklyTheme(wa.week_theme ?? '')
      lsSet('sp_weekly_acts', wa.activities ?? [])
      localStorage.setItem('sp_weekly_theme', wa.week_theme ?? '')
    }

    // Load this week's completions
    const { data: ac } = await supabase
      .from('activity_completions')
      .select('*')
      .eq('child_id', cid)
      .eq('week_start', currentWeekStart)
    if (ac && ac.length > 0) {
      const completions: ActivityCompletion[] = ac.map(r => ({
        activityId: r.activity_id,
        weekStart: r.week_start,
        answerText: r.answer_text ?? undefined,
        answerImageBase64: r.answer_image ?? undefined,
        isCorrect: r.is_correct,
        score: r.score,
        feedback: r.feedback,
        explanation: r.explanation,
        encouragement: r.encouragement,
        completedAt: r.completed_at,
      }))
      setActivityCompletions(completions)
      lsSet('sp_act_completions', completions)
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const setUser = (u: User | null) => {
    setUserState(u)
    lsSet('sp_user', u)
  }

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    setUserState(null)
    setChildId(null)
    lsSet('sp_user', null)
    lsSet('sp_messages', null)
    localStorage.removeItem('sp_child_id')
    setMessages(MOCK_MESSAGES)
    setGoalPlanState(null)
    lsSet('sp_goal_plan', null)
    setUniversityPathState(null)
    lsSet('sp_university_path', null)
  }

  // ── Messages ─────────────────────────────────────────────────────────────
  const addMessage = async (m: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, m]
      lsSet('sp_messages', next)
      return next
    })

    if (isSupabaseConfigured && childId) {
      await supabase.from('chat_messages').insert({
        id: m.id,
        child_id: childId,
        sender: m.sender,
        content: m.content,
        subject: m.subject ?? null,
        created_at: m.timestamp,
      })
    }
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  const setApiKey = (key: string) => {
    localStorage.setItem('sp_api_key', key)
    setApiKeyState(key)
  }

  const setModel = async (m: string) => {
    localStorage.setItem('sp_model', m)
    setModelState(m)
    if (isSupabaseConfigured && user) {
      await supabase.from('settings').upsert({ parent_id: user.id, claude_model: m, updated_at: new Date().toISOString() })
    }
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  const setGoalPlan = async (plan: GoalPlan | null) => {
    lsSet('sp_goal_plan', plan)
    setGoalPlanState(plan)
    if (isSupabaseConfigured && childId && plan) {
      await supabase.from('goal_plans').insert({ child_id: childId, plan_json: plan })
    }
  }

  const setUniversityPath = async (path: UniversityPath | null) => {
    lsSet('sp_university_path', path)
    setUniversityPathState(path)
    if (isSupabaseConfigured && childId && path) {
      await supabase.from('university_paths').insert({ child_id: childId, path_json: path })
    }
  }

  return (
    <AppContext.Provider value={{
      user, messages, apiKey, model, goalPlan, universityPath, childId, isLoadingSession,
      setUser, logout, addMessage, setApiKey, setModel, setGoalPlan, setUniversityPath,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
