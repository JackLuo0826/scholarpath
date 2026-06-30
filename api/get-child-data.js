/**
 * GET /api/get-child-data
 * Called by the student app on login. Uses service role to bypass the missing
 * "Student reads own row" RLS policy on the children table and fetches all
 * data the student needs in one round-trip.
 *
 * Authorization: Bearer <supabase_session_access_token>
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY    = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getWeekStart() {
  const now = new Date()
  const day = now.getUTCDay()           // 0=Sun … 6=Sat
  const diff = (day === 0) ? -6 : 1 - day  // shift so week starts on Monday
  const mon = new Date(now)
  mon.setUTCDate(now.getUTCDate() + diff)
  return mon.toISOString().slice(0, 10)  // "YYYY-MM-DD"
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Extract and verify the student's session token
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return res.status(401).json({ error: 'Missing authorization token' })

  // Verify token via anon client
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: { user }, error: userErr } = await anonClient.auth.getUser(token)
  if (userErr || !user) return res.status(401).json({ error: 'Invalid token' })

  // All remaining queries use the service role to bypass RLS on children table
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 1. Child row
  const { data: child, error: childErr } = await admin
    .from('children')
    .select('id, parent_id, name, age, grade, goal, target_year, avatar_color, streak')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (childErr) return res.status(500).json({ error: childErr.message })
  if (!child) return res.status(404).json({ error: 'No child row linked to this account' })

  const cid = child.id

  // Run remaining queries in parallel
  const weekStart = getWeekStart()
  // Note: weekly_activities and activity_completions tables have a PostgREST schema cache
  // miss (PGRST205). Weekly activities are embedded in goal_plans.plan_json.weeklyPlan
  // instead. Activity completions are tracked client-side only for now.
  const [
    settingsRes,
    goalPlanRes,
    uniPathRes,
    messagesRes,
    subjectLevelsRes,
  ] = await Promise.all([
    // Parent API key + model
    child.parent_id
      ? admin.from('settings').select('claude_api_key, claude_model').eq('parent_id', child.parent_id).maybeSingle()
      : Promise.resolve({ data: null }),

    // Latest goal plan (also contains embedded weeklyPlan)
    admin.from('goal_plans').select('plan_json').eq('child_id', cid)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),

    // Latest university path
    admin.from('university_paths').select('path_json').eq('child_id', cid)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),

    // Recent chat messages (last 200)
    admin.from('chat_messages').select('id, sender, content, subject, created_at')
      .eq('child_id', cid).order('created_at', { ascending: true }).limit(200),

    // Subject levels (persisted assessment results)
    admin.from('student_levels').select('subject, level, level_label, score, assessed_at')
      .eq('child_id', cid),
  ])

  const settings    = settingsRes.data
  const rawPlanJson = goalPlanRes.data?.plan_json ?? null
  const uniPath     = uniPathRes.data?.path_json ?? null
  const messages    = (messagesRes.data ?? []).map(m => ({
    id: m.id, sender: m.sender, content: m.content,
    subject: m.subject ?? undefined, timestamp: m.created_at,
  }))
  const subjectLevels = (subjectLevelsRes.data ?? []).map(r => ({
    subject: r.subject,
    level: r.level,
    levelLabel: r.level_label,
    score: r.score,
    assessedAt: r.assessed_at,
  }))

  // Extract weekly plan embedded in goal_plans (fallback from weekly_activities table which has a
  // PostgREST schema cache issue). Only return activities if they are for the current week.
  const embeddedWeeklyPlan = rawPlanJson?.weeklyPlan
  const weeklyActs  = (embeddedWeeklyPlan?.weekStart === weekStart) ? (embeddedWeeklyPlan?.activities ?? []) : []
  const weeklyTheme = (embeddedWeeklyPlan?.weekStart === weekStart) ? (embeddedWeeklyPlan?.weekTheme  ?? '') : ''

  // Strip weeklyPlan from the goalPlan returned so it doesn't pollute the goal display
  const goalPlan = rawPlanJson ? (({ weeklyPlan: _, ...rest }) => rest)(rawPlanJson) : null

  return res.status(200).json({
    child,
    apiKey:       settings?.claude_api_key ?? null,
    model:        settings?.claude_model ?? null,
    goalPlan,
    universityPath: uniPath,
    messages,
    weeklyActivities: weeklyActs,
    weeklyTheme,
    activityCompletions: [],  // tracked client-side; activity_completions table has schema cache miss
    subjectLevels,
    weekStart,
  })
}
