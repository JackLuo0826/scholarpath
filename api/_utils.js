// Shared utilities for ScholarPath API handlers
// Files prefixed with _ are not exposed as Vercel API routes.

export function getCurrentDate() {
  return new Date().toISOString().slice(0, 10)
}

export function getCurrentYear() {
  return new Date().getFullYear()
}

/**
 * Returns a school-term context string for the given education system and calendar year,
 * or null if Claude can infer terms on its own (UK, US, IB, etc.).
 */
export function getSchoolTermContext(system, year) {
  const sysLower = (system || '').toLowerCase()

  const nzTerms = {
    2026: 'Term 1: 2 Feb–9 Apr | Term 2: 27 Apr–3 Jul | Term 3: 20 Jul–25 Sep | Term 4: 12 Oct–18 Dec',
    2027: 'Term 1: 1 Feb–8 Apr | Term 2: 26 Apr–2 Jul | Term 3: 19 Jul–24 Sep | Term 4: 11 Oct–17 Dec',
    2028: 'Term 1: 31 Jan–7 Apr | Term 2: 25 Apr–1 Jul | Term 3: 18 Jul–23 Sep | Term 4: 10 Oct–16 Dec',
  }

  // Australian terms vary by state; these are approximate national averages
  const auTerms = {
    2026: 'Term 1: 28 Jan–3 Apr | Term 2: 22 Apr–27 Jun | Term 3: 14 Jul–19 Sep | Term 4: 7 Oct–18 Dec (state-specific dates apply)',
    2027: 'Term 1: 27 Jan–1 Apr | Term 2: 21 Apr–26 Jun | Term 3: 13 Jul–18 Sep | Term 4: 6 Oct–17 Dec (state-specific dates apply)',
    2028: 'Term 1: 26 Jan–31 Mar | Term 2: 18 Apr–24 Jun | Term 3: 11 Jul–16 Sep | Term 4: 4 Oct–15 Dec (state-specific dates apply)',
  }

  if (sysLower.includes('zealand') || sysLower.includes('nz')) {
    const terms = nzTerms[year] || nzTerms[2026]
    return `New Zealand school terms ${year}: ${terms}`
  }
  if (sysLower.includes('australia')) {
    const terms = auTerms[year] || auTerms[2026]
    return `Australian school terms ${year}: ${terms}`
  }
  return null
}

/**
 * Derives number of years until university from a grade string like "Year 4" or "Grade 9".
 * NZ/Australia use Year 1–13; US/other use Grade 1–12.
 */
export function getYearsToUniversity(gradeLabel) {
  if (!gradeLabel) return 4
  const match = gradeLabel.match(/\d+/)
  if (!match) return 4
  const n = parseInt(match[1])
  const lower = gradeLabel.toLowerCase()
  if (lower.includes('year')) return Math.max(0, 13 - n)  // NZ/Aus: Year 1–13
  return Math.max(0, 12 - n)                               // US/other: Grade 1–12
}
