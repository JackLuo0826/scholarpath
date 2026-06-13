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
  setApiKey: (key: string) => Promise<void> | void
  setModel: (model: string) => void
  setGoalPlan: (plan: GoalPlan | null) => void
  setUniversityPath: (path: UniversityPath | null) => void
  generateWeeklyActivities: () => Promise<void>
  submitActivityAnswer: (completion: ActivityCompletion) => Promise<void>
  updateChildProfile: (update: { age?: number; grade?: string; name?: string }) => Promise<void>
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => ls('sp_messages', isSupabaseConfigured ? [] : MOCK_MESSAGES))
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem('sp_api_key') || '')
  const [model, setModelState] = useState<string>(() => localStorage.getItem('sp_model') || 'claude-sonnet-4-6')
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

        // Load model + api key settings (parent-only)
        const { data: settings } = await supabase
          .from('settings')
          .select('claude_model, claude_api_key')
          .eq('parent_id', authId)
          .maybeSingle()
        if (settings?.claude_model) {
          setModelState(settings.claude_model)
          localStorage.setItem('sp_model', settings.claude_model)
        }
        if (settings?.claude_api_key) {
          setApiKeyState(settings.claude_api_key)
          localStorage.setItem('sp_api_key', settings.claude_api_key)
        }
      }
    } else if (profile.role === 'student') {
      // Resolve child row by auth_id (include parent_id to load their settings)
      const { data: childRow } = await supabase
        .from('children')
        .select('id, parent_id, name, age, grade, goal, target_year, avatar_color, streak')
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

        // Load parent's api_key + model so student can generate/submit activities
        if (childRow.parent_id) {
          const { data: parentSettings } = await supabase
            .from('settings')
            .select('claude_model, claude_api_key')
            .eq('parent_id', childRow.parent_id)
            .maybeSingle()
          if (parentSettings?.claude_api_key) {
            setApiKeyState(parentSettings.claude_api_key)
            localStorage.setItem('sp_api_key', parentSettings.claude_api_key)
          }
          if (parentSettings?.claude_model) {
            setModelState(parentSettings.claude_model)
            localStorage.setItem('sp_model', parentSettings.claude_model)
          }
        }
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

    const mapped = (msgs ?? []).map(m => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      subject: m.subject ?? undefined,
      timestamp: m.created_at,
    }))
    setMessages(mapped)
    lsSet('sp_messages', mapped)

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
    setChildInfo(null)
    lsSet('sp_user', null)
    lsSet('sp_messages', null)
    lsSet('sp_child_info', null)
    localStorage.removeItem('sp_child_id')
    setMessages(isSupabaseConfigured ? [] : MOCK_MESSAGES)
    setGoalPlanState(null)
    lsSet('sp_goal_plan', null)
    setUniversityPathState(null)
    lsSet('sp_university_path', null)
    setWeeklyActivities([])
    setWeeklyTheme('')
    setActivityCompletions([])
    lsSet('sp_weekly_acts', null)
    lsSet('sp_act_completions', null)
    localStorage.removeItem('sp_weekly_theme')
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
  const setApiKey = async (key: string) => {
    localStorage.setItem('sp_api_key', key)
    setApiKeyState(key)
    // Persist to Supabase so students on any device can load it
    if (isSupabaseConfigured && user) {
      await supabase.from('settings').upsert({
        parent_id: user.id,
        claude_api_key: key,
        updated_at: new Date().toISOString(),
      })
    }
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

  // ── Weekly activities ──────────────────────────────────────────────────────
  const generateWeeklyActivities = async () => {
    if (!apiKey || !goalPlan) return
    setIsGeneratingActivities(true)
    try {
      const resp = await fetch('/api/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childAge: childInfo?.age ?? null,
          childGrade: childInfo?.grade ?? null,
          childName: childInfo?.name ?? '',
          goalPlan,
          apiKey,
          model,
        }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      const acts: WeeklyActivity[] = data.activities ?? []
      const theme: string = data.weekTheme ?? ''

      setWeeklyActivities(acts)
      setWeeklyTheme(theme)
      // Reset completions for the new set
      setActivityCompletions([])
      lsSet('sp_weekly_acts', acts)
      lsSet('sp_act_completions', [])
      localStorage.setItem('sp_weekly_theme', theme)

      // Persist to Supabase (upsert so regenerating replaces the existing row)
      if (isSupabaseConfigured && childId) {
        await supabase.from('weekly_activities').upsert({
          child_id: childId,
          week_start: weekStart,
          week_theme: theme,
          activities: acts,
          generated_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('generateWeeklyActivities error:', e)
    } finally {
      setIsGeneratingActivities(false)
    }
  }

  const updateChildProfile = async (update: { age?: number; grade?: string; name?: string }) => {
    if (!childId) return
    const updated: ChildInfo = {
      ...(childInfo ?? { id: childId, name: '', age: null, grade: null, goal: null, targetYear: null, avatarColor: '#6366f1', streak: 0 }),
      ...update,
    }
    setChildInfo(updated)
    lsSet('sp_child_info', updated)
    if (isSupabaseConfigured) {
      const patch: Record<string, unknown> = {}
      if (update.age !== undefined) patch.age = update.age
      if (update.grade !== undefined) patch.grade = update.grade
      if (update.name !== undefined) patch.name = update.name
      await supabase.from('children').update(patch).eq('id', childId)
    }
  }

  const submitActivityAnswer = async (completion: ActivityCompletion) => {
    // Optimistic update
    setActivityCompletions(prev => {
      const filtered = prev.filter(c => c.activityId !== completion.activityId)
      const next = [...filtered, completion]
      lsSet('sp_act_completions', next)
      return next
    })

    if (isSupabaseConfigured && childId) {
      await supabase.from('activity_completions').upsert({
        child_id: childId,
        activity_id: completion.activityId,
        week_start: completion.weekStart,
        answer_text: completion.answerText ?? null,
        answer_image: completion.answerImageBase64 ?? null,
        is_correct: completion.isCorrect,
        score: completion.score,
        feedback: completion.feedback,
        explanation: completion.explanation,
        encouragement: completion.encouragement,
        completed_at: completion.completedAt,
      })
    }
  }

  return (
    <AppContext.Provider value={{
      user, messages, apiKey, model, goalPlan, universityPath,
      childId, childInfo, weeklyActivities, weeklyTheme, activityCompletions, weekStart,
      isGeneratingActivities, isLoadingSession,
      setUser, logout, addMessage, setApiKey, setModel, setGoalPlan, setUniversityPath,
      generateWeeklyActivities, submitActivityAnswer, updateChildProfile,
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
