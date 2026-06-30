// Curriculum spine types — shared across NZC, NCEA, ACARA, and IB DP frameworks.
// These are pure data types; no runtime logic here.

export type Framework = 'NZC' | 'NCEA' | 'ACARA' | 'IB_DP'
export type Country = 'NZ' | 'AU'
export type NceaLevel = 1 | 2 | 3
export type IbLevel = 'SL' | 'HL'

// ── NZC / ACARA achievement objective ────────────────────────────────────────
export interface CurriculumObjective {
  id: string           // e.g. "NZC-MATH-L3-NA-2"
  framework: 'NZC' | 'ACARA'
  country: Country
  subject: string      // e.g. "Mathematics"
  strand: string       // e.g. "Number and Algebra"
  level: number        // NZC curriculum level 1–8; ACARA year level
  yearBand: string     // e.g. "Y3-4" (NZC) or "Y7" (ACARA)
  text: string         // the achievement objective text
  hplAcps?: string[]   // relevant HPL Advanced Cognitive Performance characteristics
}

// ── NZQA NCEA achievement standard ───────────────────────────────────────────
export interface NceaStandard {
  id: string                          // AS code e.g. "AS91027"
  framework: 'NCEA'
  country: 'NZ'
  subject: string
  level: NceaLevel
  title: string
  credits: number
  assessmentType: 'Internal' | 'External'
  verified: boolean                   // false = code needs checking against NZQA
  hplAcps?: string[]
}

// ── IB Diploma Programme topic ────────────────────────────────────────────────
export interface IbTopic {
  id: string                          // e.g. "IB-MATH-AA-T1-2"
  framework: 'IB_DP'
  subject: string                     // e.g. "Mathematics AA"
  group: number                       // IB subject group 1–6
  topicNumber: number
  topicTitle: string
  subtopicTitle: string
  levels: IbLevel[]                   // which levels this subtopic applies to
  description: string
  hplAcps?: string[]
}

// ── Union type for any spine node ─────────────────────────────────────────────
export type SpineNode = CurriculumObjective | NceaStandard | IbTopic

// ── File-level wrapper used in each JSON file ─────────────────────────────────
export interface NzcFile {
  framework: 'NZC'
  version: string
  country: 'NZ'
  subject: string
  note: string
  objectives: CurriculumObjective[]
}

export interface NceaFile {
  framework: 'NCEA'
  country: 'NZ'
  note: string
  standards: NceaStandard[]
}

export interface IbDpFile {
  framework: 'IB_DP'
  group: number
  note: string
  topics: IbTopic[]
}

export interface AcaraFile {
  framework: 'ACARA'
  version: string
  country: 'AU'
  subject: string
  note: string
  objectives: CurriculumObjective[]
}
