// Curriculum spine lookup utility.
// Used by API routes to inject relevant curriculum objectives into AI prompts,
// grounding exercise generation in real NZC / NCEA / IB / ACARA standards.

import type { CurriculumObjective, NceaStandard, IbTopic } from './types'

// ── Static imports (bundled at build time — no runtime DB queries) ────────────

import nzcMaths from './spine/nzc/mathematics.json'
import nzcEnglish from './spine/nzc/english.json'
import nzcScience from './spine/nzc/science.json'
import nzcSocialSciences from './spine/nzc/social_sciences.json'
import nzcTechnology from './spine/nzc/technology.json'
import nzcHealthPE from './spine/nzc/health_pe.json'
import nzcArts from './spine/nzc/the_arts.json'

import nceaMaths from './spine/ncea/mathematics.json'
import nceaEnglish from './spine/ncea/english.json'
import nceaSciences from './spine/ncea/sciences.json'

import ibMaths from './spine/ib_dp/group5_mathematics.json'
import ibEnglish from './spine/ib_dp/group1_english.json'
import ibSciences from './spine/ib_dp/group4_sciences.json'
import ibHumanities from './spine/ib_dp/group3_humanities.json'
import ibLanguages from './spine/ib_dp/group2_languages.json'
import ibArts from './spine/ib_dp/group6_arts.json'

import acaraMaths from './spine/acara/mathematics.json'
import acaraEnglish from './spine/acara/english.json'

// ── All objectives flat arrays ─────────────────────────────────────────────────

const NZC_OBJECTIVES: CurriculumObjective[] = [
  ...nzcMaths.objectives,
  ...nzcEnglish.objectives,
  ...nzcScience.objectives,
  ...nzcSocialSciences.objectives,
  ...nzcTechnology.objectives,
  ...nzcHealthPE.objectives,
  ...nzcArts.objectives,
] as CurriculumObjective[]

const NCEA_STANDARDS: NceaStandard[] = [
  ...nceaMaths.standards,
  ...nceaEnglish.standards,
  ...nceaSciences.standards,
] as NceaStandard[]

const IB_TOPICS: IbTopic[] = [
  ...ibMaths.topics,
  ...ibEnglish.topics,
  ...ibSciences.topics,
  ...ibHumanities.topics,
  ...ibLanguages.topics,
  ...ibArts.topics,
] as IbTopic[]

const ACARA_OBJECTIVES: CurriculumObjective[] = [
  ...acaraMaths.objectives,
  ...acaraEnglish.objectives,
] as CurriculumObjective[]

// ── Year → NZC level mapping ───────────────────────────────────────────────────

export function yearToNzcLevel(year: number): number {
  if (year <= 2) return 1
  if (year <= 4) return 2
  if (year <= 6) return 3
  if (year <= 8) return 4
  return 5  // Y9-10
}

// ── Parse grade string ("Year 7", "Y8", "Grade 9") → year number ──────────────

export function gradeToYear(grade: string): number {
  if (!grade) return 7
  const match = grade.match(/\d+/)
  return match ? parseInt(match[0]) : 7
}

// ── Subject name normaliser (loose match) ─────────────────────────────────────

function normaliseSubject(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('math')) return 'Mathematics'
  if (s.includes('english') || s.includes('literacy') || s.includes('reading') || s.includes('writing')) return 'English'
  if (s.includes('science') || s.includes('biology') || s.includes('chemistry') || s.includes('physics')) return 'Science'
  if (s.includes('history') || s.includes('social') || s.includes('geography') || s.includes('economics')) return 'Social Sciences'
  if (s.includes('tech') || s.includes('digital') || s.includes('coding') || s.includes('computing')) return 'Technology'
  if (s.includes('health') || s.includes('pe') || s.includes('physical')) return 'Health and PE'
  if (s.includes('art') || s.includes('music') || s.includes('drama') || s.includes('dance')) return 'The Arts'
  return raw
}

// ── NCEA subject normaliser ────────────────────────────────────────────────────

function normaliseNceaSubject(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('calculus') || (s.includes('math') && !s.includes('stat'))) return 'Mathematics'
  if (s.includes('stat')) return 'Statistics'
  if (s.includes('english')) return 'English'
  if (s.includes('biology') || s.includes('bio')) return 'Biology'
  if (s.includes('chemistry') || s.includes('chem')) return 'Chemistry'
  if (s.includes('physics') || s.includes('phys')) return 'Physics'
  if (s.includes('science')) return 'Science'
  return raw
}

// ── NZC: get objectives for a given year and subject ──────────────────────────

export function getNzcObjectives(year: number, subjectRaw: string): CurriculumObjective[] {
  const level = yearToNzcLevel(year)
  const subject = normaliseSubject(subjectRaw)
  return NZC_OBJECTIVES.filter(o =>
    o.level === level &&
    (o.subject === subject || o.subject.includes(subject) || subject.includes(o.subject))
  )
}

// ── ACARA: get objectives for a given year and subject (AU) ───────────────────

export function getAcaraObjectives(year: number, subjectRaw: string): CurriculumObjective[] {
  const subject = normaliseSubject(subjectRaw)
  return ACARA_OBJECTIVES.filter(o =>
    o.level === year &&
    (o.subject === subject || o.subject.includes(subject) || subject.includes(o.subject))
  )
}

// ── NCEA: get standards for a given level and subject ─────────────────────────

export function getNceaStandards(level: 1 | 2 | 3, subjectRaw: string): NceaStandard[] {
  const subject = normaliseNceaSubject(subjectRaw)
  return NCEA_STANDARDS.filter(s =>
    s.level === level &&
    (s.subject === subject || s.subject.includes(subject) || subject.includes(s.subject))
  )
}

// ── IB DP: get topics for a subject (matches on subject name) ─────────────────

export function getIbTopics(subjectRaw: string, level?: 'SL' | 'HL'): IbTopic[] {
  const s = subjectRaw.toLowerCase()
  const filtered = IB_TOPICS.filter(t => {
    const matches = t.subject.toLowerCase().includes(s) || s.includes(t.subject.toLowerCase().split(' ')[0])
    if (!matches) return false
    if (level) return t.levels.includes(level)
    return true
  })
  return filtered
}

// ── Lookup a single node by ID ────────────────────────────────────────────────

export function getSpineNode(id: string): CurriculumObjective | NceaStandard | IbTopic | null {
  return (
    NZC_OBJECTIVES.find(o => o.id === id) ||
    ACARA_OBJECTIVES.find(o => o.id === id) ||
    NCEA_STANDARDS.find(s => s.id === id) ||
    IB_TOPICS.find(t => t.id === id) ||
    null
  )
}

// ── Main: build a prompt-ready spine context string ───────────────────────────
//
// Called by generate-weekly.js to get a block of text describing the curriculum
// objectives relevant to this child. Injected into the Claude prompt so exercises
// are grounded in real standards rather than invented at random.
//
// grade:    e.g. "Year 8" or "Year 12"
// subjects: e.g. ["Mathematics", "English", "Science"]
// country:  "NZ" (default) or "AU"
// pathway:  "NCEA" | "IB" | undefined (auto-detected from grade)

export function buildSpineContext(
  grade: string,
  subjects: string[],
  country: 'NZ' | 'AU' = 'NZ',
  pathway?: 'NCEA' | 'IB'
): string {
  const year = gradeToYear(grade)
  const lines: string[] = []

  // Year 12–13 with IB pathway
  if ((year >= 12 || pathway === 'IB') && pathway !== 'NCEA') {
    lines.push('CURRICULUM FRAMEWORK: IB Diploma Programme')
    for (const subj of subjects) {
      const topics = getIbTopics(subj).slice(0, 4)
      if (topics.length > 0) {
        lines.push(`\n${subj} (IB DP):`)
        topics.forEach(t => lines.push(`  [${t.id}] ${t.topicTitle} — ${t.subtopicTitle}: ${t.description}`))
      }
    }
    return lines.join('\n')
  }

  // Year 11–13 NCEA
  if (year >= 11 && country === 'NZ') {
    const nceaLevel = (year === 11 ? 1 : year === 12 ? 2 : 3) as 1 | 2 | 3
    lines.push(`CURRICULUM FRAMEWORK: NCEA Level ${nceaLevel}`)
    for (const subj of subjects) {
      const standards = getNceaStandards(nceaLevel, subj).slice(0, 5)
      if (standards.length > 0) {
        lines.push(`\n${subj} — NCEA Level ${nceaLevel} standards:`)
        standards.forEach(s =>
          lines.push(`  [${s.id}] ${s.title} (${s.credits} credits, ${s.assessmentType})`)
        )
      }
    }
    return lines.join('\n')
  }

  // Year 1–10: NZC or ACARA
  if (country === 'AU') {
    lines.push(`CURRICULUM FRAMEWORK: Australian Curriculum V9 — Year ${year}`)
    for (const subj of subjects) {
      const objectives = getAcaraObjectives(year, subj).slice(0, 3)
      if (objectives.length > 0) {
        lines.push(`\n${subj} (ACARA Year ${year}):`)
        objectives.forEach(o => lines.push(`  [${o.id}] ${o.strand}: ${o.text}`))
      }
    }
  } else {
    const level = yearToNzcLevel(year)
    lines.push(`CURRICULUM FRAMEWORK: New Zealand Curriculum Level ${level} (${grade})`)
    for (const subj of subjects) {
      const objectives = getNzcObjectives(year, subj).slice(0, 4)
      if (objectives.length > 0) {
        lines.push(`\n${subj} (NZC Level ${level}):`)
        objectives.forEach(o => lines.push(`  [${o.id}] ${o.strand}: ${o.text}`))
      }
    }
  }

  return lines.join('\n')
}
