import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/get-curriculum?grade=Year4&country=NZ
 * Returns all curriculum lessons grouped by curriculum → unit.
 * Uses service role to bypass RLS (authenticated users may also read directly,
 * but this avoids client-side key exposure).
 *
 * Response:
 * {
 *   curricula: [
 *     {
 *       id: 'beast-academy',
 *       label: 'Beast Academy',
 *       subject: 'Mathematics',
 *       subjectColor: '#6366f1',
 *       icon: '🧮',
 *       description: '...',
 *       units: [
 *         {
 *           unitNumber: 1,
 *           title: 'Shape Detectives',
 *           lessons: [ { ...lesson fields } ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const grade   = req.query.grade   || 'Year 4'
  const country = req.query.country || 'NZ'

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured on server' })
  }

  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('curriculum_lessons')
    .select('*')
    .eq('grade', grade)
    .eq('country', country)
    .order('curriculum')
    .order('unit_number')
    .order('lesson_number')

  if (error) {
    console.error('get-curriculum error:', error)
    return res.status(500).json({ error: error.message })
  }

  // Group into curriculum → units → lessons
  const META = {
    'beast-academy': {
      label: 'Beast Academy',
      subject: 'Mathematics',
      subjectColor: '#6366f1',
      icon: '🧮',
      description: 'Puzzle-style maths challenges for young problem-solvers. Covers NZC Level 2-3 geometry, multiplication, and fractions.',
    },
    'iew': {
      label: 'IEW Writing',
      subject: 'Writing',
      subjectColor: '#10b981',
      icon: '✍️',
      description: 'Structural writing methods: keyword outlines, dress-ups, and story architecture for clear, vivid writing.',
    },
  }

  const curriculaMap = {}

  for (const row of data) {
    const cid = row.curriculum
    if (!curriculaMap[cid]) {
      curriculaMap[cid] = {
        id: cid,
        ...(META[cid] || { label: cid, subject: row.subject, subjectColor: row.subject_color, icon: '📚', description: '' }),
        units: [],
      }
    }

    const curriculum = curriculaMap[cid]
    let unit = curriculum.units.find(u => u.unitNumber === row.unit_number)
    if (!unit) {
      unit = { unitNumber: row.unit_number, title: row.unit_title, lessons: [] }
      curriculum.units.push(unit)
    }

    unit.lessons.push({
      id: row.id,
      curriculum: row.curriculum,
      subject: row.subject,
      subjectColor: row.subject_color,
      unitNumber: row.unit_number,
      unitTitle: row.unit_title,
      lessonNumber: row.lesson_number,
      title: row.title,
      description: row.description,
      content: row.content,
      question: row.question,
      hint: row.hint,
      difficulty: row.difficulty,
      durationMin: row.duration_min,
    })
  }

  res.json({ curricula: Object.values(curriculaMap) })
}
