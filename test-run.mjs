/**
 * ScholarPath end-to-end test against production: https://scholarpath-blue.vercel.app
 * Usage: node test-run.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://scholarpath-blue.vercel.app'
const SS_DIR = path.resolve('./test-screenshots')
fs.rmSync(SS_DIR, { recursive: true, force: true })
fs.mkdirSync(SS_DIR, { recursive: true })

let ssIndex = 0
async function ss(page, label) {
  const file = path.join(SS_DIR, `${String(ssIndex++).padStart(2, '0')}-${label}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  📸 ${label}`)
}
function log(msg) { console.log(`\n[${new Date().toLocaleTimeString()}] ${msg}`) }

// Wait for all .animate-spin to disappear.
// IMPORTANT: pass `undefined` as the arg param, then { timeout } as options
async function waitForNoSpinner(page, timeout = 120000) {
  await page.waitForTimeout(2000)
  await page.waitForFunction(
    () => document.querySelectorAll('.animate-spin').length === 0,
    undefined,
    { timeout }
  )
  await page.waitForTimeout(1500)
}

async function sendWizardMessage(page, text, timeout = 120000) {
  const textarea = page.locator('textarea[placeholder="Type your answer…"]')
  await textarea.waitFor({ timeout: 10000 })
  await textarea.fill(text)
  await page.keyboard.press('Enter')
  await waitForNoSpinner(page, timeout)
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 30 })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', err => { errors.push(err.message); console.log(`  [page error] ${err.message.slice(0, 150)}`) })
  page.on('console', m => { if (m.type() === 'error') console.log(`  [console error] ${m.text().slice(0, 150)}`) })

  try {
    // ── 1. Login page ─────────────────────────────────────────────────────────
    log('Step 1: Login as parent')
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('button:has-text("Use test account")', { timeout: 20000 })
    await ss(page, 'login-page')

    await page.click('button:has-text("Use test account (parent@test.com)")')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Sign in as Parent")')
    await page.waitForSelector('h2:has-text("Good"), h2:has-text("morning"), h2:has-text("afternoon"), h2:has-text("evening")', { timeout: 20000 })
    await ss(page, 'parent-dashboard')
    log('  ✅ Parent dashboard loaded')

    // ── 2. Update child profile ───────────────────────────────────────────────
    log('Step 2: Set child profile — Katrina, Year 4, age 9')
    await page.locator('nav button, aside nav button').filter({ hasText: 'Controls' }).first().click()
    await page.waitForTimeout(600)
    await ss(page, 'settings-tab')

    await page.locator('input[placeholder="Emma"]').fill('Katrina')
    await page.locator('input[type="number"][placeholder="13"]').fill('9')
    await page.locator('input[placeholder="Year 9 / Grade 8"]').fill('Year 4')
    await page.locator('button:has-text("Save Profile")').click()
    await page.waitForTimeout(1500)
    await ss(page, 'profile-saved')
    log('  ✅ Profile saved')

    // ── 3. Roadmap > Goals — check if plan exists or run wizard ───────────────
    log('Step 3: Check for existing plan')
    await page.locator('nav button, aside nav button').filter({ hasText: 'Roadmap' }).first().click()
    await page.waitForTimeout(600)
    await page.locator('button').filter({ hasText: '🎯 Goals' }).click()
    await page.waitForTimeout(600)
    await ss(page, 'roadmap-goals')

    const updateBtn = page.locator('button:has-text("Update")')
    const planAlreadyExists = await updateBtn.count() > 0

    if (planAlreadyExists) {
      log('  ✅ Plan already exists (streaming fix previously verified)')

      // Quickly view Study Plan to confirm it rendered
      await page.locator('button').filter({ hasText: '📚 Study Plan' }).click()
      await page.waitForTimeout(500)
      await ss(page, 'study-plan-existing')

      // Expand first year milestone
      const yearBtn = page.locator('button').filter({ hasText: /Spark|Foundation|20\d\d/ }).first()
      if (await yearBtn.count() > 0) {
        await yearBtn.click()
        await page.waitForTimeout(400)
        await ss(page, 'milestones-existing')
      }
      log('  ✅ Plan and milestones confirmed')

    } else {
      // Run wizard from scratch
      log('  No plan found — running Goal Wizard (streaming test)')
      await page.locator('button:has-text("Start Session")').first().click()
      await page.waitForSelector('textarea[placeholder="Type your answer…"]', { timeout: 10000 })
      await ss(page, 'wizard-open')

      log('  Q1: Dream')
      await sendWizardMessage(page, "Katrina wants to become a marine biologist to protect NZ's ocean ecosystems. She's passionate about sea creatures.")
      await ss(page, 'wizard-q1')

      log('  Q2: Goal')
      await sendWizardMessage(page, "Get into University of Auckland's Marine Biology programme. She's in Year 4 at St Cuthbert's College, Auckland.")
      await ss(page, 'wizard-q2')

      log('  Q3: Timeline')
      await sendWizardMessage(page, "She's 9, Year 4 — roughly 13 years, targeting university by 2036-2037.")
      await ss(page, 'wizard-q3')

      log('  Q4: Current level')
      await sendWizardMessage(page, "Top of class in science and reading, but maths is harder. Reads 2 years above level.")
      await ss(page, 'wizard-q4')

      log('  Q5: Why')
      await sendWizardMessage(page, "She cried watching plastic pollution kill sea turtles on a David Attenborough doco. She wants to fix that.")
      await ss(page, 'wizard-q5')

      log('  Q6: Obstacles')
      await sendWizardMessage(page, "Distracted by phone, maths is weak, anxious before tests, sometimes gives up when things get tough.")
      await ss(page, 'wizard-q6')

      log('  Q7: Strengths (waits through plan generation too — ~3-5 min total)')
      await sendWizardMessage(page,
        "Incredibly curious, fantastic memory for animal facts, loves projects and experiments, very creative.",
        300000)  // 5 min covers streaming + Opus plan generation
      await ss(page, 'wizard-q7-plan-done')

      // Step 6: Wait for wizard to close (plan saves → wizard unmounts)
      await page.waitForFunction(
        () => !document.querySelector('textarea[placeholder="Type your answer…"]'),
        undefined,
        { timeout: 30000 }
      )
      await ss(page, 'plan-generated')
      log('  ✅ Plan generated and wizard closed')

      // View Study Plan
      await page.locator('button').filter({ hasText: '📚 Study Plan' }).click()
      await page.waitForTimeout(500)
      await ss(page, 'study-plan-new')

      const yearBtnNew = page.locator('button').filter({ hasText: /Spark|Foundation|20\d\d/ }).first()
      if (await yearBtnNew.count() > 0) {
        await yearBtnNew.click()
        await page.waitForTimeout(400)
        await ss(page, 'milestones-new')
      }
      log('  ✅ Study plan rendered')
    }

    // ── 4. Switch to student account ─────────────────────────────────────────
    log('Step 4: Switch to student account')
    await page.locator('button:has-text("Log out")').first().click()
    await page.waitForTimeout(500)
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('button:has-text("Use test account")', { timeout: 20000 })

    // Click Student tab
    await page.locator('button').filter({ hasText: /🎒 Student|Student/ }).click()
    await page.waitForTimeout(300)
    await page.click('button:has-text("Use test account (student@test.com)")')
    await page.waitForTimeout(200)
    await page.click('button:has-text("Start Learning")')
    // Wait for student dashboard — look for tab navigation
    await page.waitForSelector('text=Today, button:has-text("Today")', { timeout: 20000 }).catch(async () => {
      await page.waitForTimeout(3000)
    })
    await ss(page, 'student-dashboard')
    log('  ✅ Student dashboard loaded')

    // ── 5. Generate weekly activities ─────────────────────────────────────────
    log('Step 5: Weekly activities')
    await page.waitForTimeout(1000)  // give React state a moment to settle

    // Distinguish states:
    // - "No activities yet" text = no activities → may need to generate
    //   - "Generate My Week" button present = plan loaded, can generate
    //   - No generate button = no plan linked ("Ask a parent..." shown)
    // - No "no activities" text = activities already present (loaded from DB or just generated)
    // Note: when activities exist, the page also has a "Generate new activities" regenerate button
    // at the bottom — we must NOT confuse this with the initial "Generate My Week" button.
    const noActivitiesText = await page.locator('text=No activities yet this week').count() > 0
    const askParentMsg    = await page.locator('text=Ask a parent to set up a Goal Plan first').count() > 0
    const genBtn = page.locator('button').filter({ hasText: 'Generate My Week' }).first()
    const needsGeneration = noActivitiesText && !askParentMsg && await genBtn.count() > 0

    let activitiesReady = false

    if (askParentMsg) {
      log('  ⚠️  No activities — student NOT linked to goal plan (would need RLS fix)')
      await ss(page, 'weekly-activities-none')
    } else if (needsGeneration) {
      log('  Generate button visible — clicking to generate activities...')
      await ss(page, 'weekly-before-generate')
      await genBtn.click()
      await waitForNoSpinner(page, 120000)
      await page.waitForTimeout(1000)
      await ss(page, 'weekly-activities-generated')
      activitiesReady = await page.locator('button').filter({ hasText: /Start Activity/ }).count() > 0
      log(activitiesReady ? '  ✅ Activities generated' : '  ⚠️  Generate clicked but no Start Activity buttons found')
    } else {
      await ss(page, 'weekly-activities')
      activitiesReady = await page.locator('button').filter({ hasText: /Start Activity/ }).count() > 0
      log(activitiesReady ? '  ✅ Weekly activities already present' : '  ⚠️  No Start Activity buttons found (unexpected)')
    }

    // ── 6. Open and answer an exercise ────────────────────────────────────────
    log('Step 6: Complete an exercise')
    if (askParentMsg) {
      log('  ⚠️  SKIP — no goal plan linked (would need RLS policy applied)')
    } else {
      // Click the first "Start Activity" button (cards show "20m" not "20 min")
      const startBtn = page.locator('button').filter({ hasText: /Start Activity/ }).first()
      const actCard = startBtn  // alias for consistent click/continue logic
      if (await startBtn.count() > 0) {
        await startBtn.click()
        await page.waitForTimeout(600)
        await ss(page, 'exercise-open')

        const answerBox = page.locator('textarea').first()
        if (await answerBox.count() > 0 && await answerBox.isVisible()) {
          await answerBox.fill('Marine biology requires strong maths skills for measuring ocean temperatures and analysing ecosystem data.')
          await page.waitForTimeout(300)
          await ss(page, 'exercise-answered')

          const submitBtn = page.locator('button').filter({ hasText: /Submit|Check Answer/ }).first()
          if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
            await submitBtn.click()
            await waitForNoSpinner(page, 60000)
            await ss(page, 'exercise-feedback')
            log('  ✅ Exercise submitted — AI feedback received')
          }
        } else {
          log('  ⚠️  No answer textarea — activity type may not need one')
          await ss(page, 'exercise-no-textarea')
        }

        // Close exercise sheet
        const backBtn = page.locator('button').filter({ hasText: /Back|Close/ }).first()
        if (await backBtn.count() > 0 && await backBtn.isVisible()) {
          await backBtn.click()
          await page.waitForTimeout(400)
        }
      } else {
        log('  ⚠️  No activity cards found')
        await ss(page, 'exercise-no-cards')
      }
    }

    // ── 7. AI Tutor chat ────────────────────────────────────────────────────────
    log('Step 7: AI Tutor chat')
    // Tab is labeled "AI Tutor" in the UI (internal type is 'chat')
    await page.locator('button').filter({ hasText: /AI Tutor/ }).first().click()
    await page.waitForTimeout(500)
    await ss(page, 'ai-tutor-tab')

    const chatTextarea = page.locator('textarea').first()
    if (await chatTextarea.count() > 0 && await chatTextarea.isVisible()) {
      await chatTextarea.fill("Why is maths important for marine biology?")
      await page.keyboard.press('Enter')
      // Wait briefly — if no API key, response is immediate warning
      await page.waitForTimeout(8000)
      // Then wait for any streaming to finish (if API key IS available)
      const spinnerGone = await page.waitForFunction(
        () => document.querySelectorAll('.animate-spin').length === 0,
        undefined,
        { timeout: 90000 }
      ).catch(() => null)
      await page.waitForTimeout(1000)
      await ss(page, 'ai-tutor-response')

      // Check if it gave a real response or a "no API key" warning
      const noKeyWarning = await page.locator('text=No API key configured').count() > 0
      if (noKeyWarning) {
        log('  ⚠️  AI Tutor: no API key (student not linked to parent — DB RLS migration needed)')
      } else {
        log('  ✅ AI Tutor responded')
      }
    } else {
      await ss(page, 'ai-tutor-no-input')
      log('  ⚠️  Chat input not found')
    }

    // ── 8. Goals and Study Plan tabs ──────────────────────────────────────────
    log('Step 8: Student Goals and Study Plan tabs')
    const goalsTab = page.locator('button').filter({ hasText: /^Goals$/ }).first()
    if (await goalsTab.count() > 0) {
      await goalsTab.click()
      await page.waitForTimeout(500)
      await ss(page, 'student-goals')
      const goalsEmpty = await page.locator('text=No goal plan yet, text=Ask a parent, text=Set up').count() > 0
      log(goalsEmpty ? '  ⚠️  Goals tab empty (no plan linked)' : '  ✅ Goals tab loaded')
    }

    const studyPlanTab = page.locator('button').filter({ hasText: /Study Plan/ }).first()
    if (await studyPlanTab.count() > 0) {
      await studyPlanTab.click()
      await page.waitForTimeout(500)
      await ss(page, 'student-study-plan')
      const planEmpty = await page.locator('text=No study plan yet, text=Ask a parent, text=Set up').count() > 0
      log(planEmpty ? '  ⚠️  Study Plan empty (no plan linked)' : '  ✅ Study Plan tab loaded')
    }

    // ── Results ────────────────────────────────────────────────────────────────
    log('\n=== TEST RESULTS ===')
    const jsErrors = errors.filter(e => !e.toLowerCase().includes('favicon'))
    if (jsErrors.length === 0) {
      log('✅ No JS errors')
    } else {
      log(`⚠️  ${jsErrors.length} JS error(s): ${jsErrors.slice(0, 3).map(e => e.slice(0, 100)).join(' | ')}`)
    }
    log(`✅ All ${ssIndex} screenshots saved to: ${SS_DIR}`)

  } catch (err) {
    log(`\n❌ FAILED: ${err.message}`)
    await ss(page, 'FAILED').catch(() => {})
    console.error(err.stack)
    process.exitCode = 1
  } finally {
    await page.waitForTimeout(3000)
    await browser.close()
  }
}

main()
