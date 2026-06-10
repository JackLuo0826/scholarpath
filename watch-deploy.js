import chokidar from 'chokidar'
import { execSync } from 'child_process'
import { existsSync, statSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCK_FILE = path.join(__dirname, '.git', 'index.lock')
const STALE_LOCK_AGE_MS = 10_000  // treat lock as stale if older than 10 seconds

let timer = null
let deploying = false  // true while a deploy is actively running

/**
 * Remove the git index.lock file if it exists and is older than STALE_LOCK_AGE_MS.
 * A fresh lock (< 10s) means another git process is legitimately running — leave it alone.
 */
function clearStaleLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const ageMs = Date.now() - statSync(LOCK_FILE).mtimeMs
      if (ageMs > STALE_LOCK_AGE_MS) {
        unlinkSync(LOCK_FILE)
        console.log(`[watch-deploy] ⚠️  Removed stale index.lock (${Math.round(ageMs / 1000)}s old)`)
      } else {
        console.log(`[watch-deploy] ⏳ index.lock is fresh (${Math.round(ageMs / 1000)}s) — another git process is running, waiting...`)
      }
    }
  } catch (err) {
    // Non-fatal: if we can't remove it, git will surface the error below
    console.warn('[watch-deploy] Could not clear index.lock:', err.message)
  }
}

function deploy() {
  // Prevent concurrent deploys — the debounce collapses rapid saves into one deploy,
  // but this guard catches the case where a deploy is still running when the timer fires.
  if (deploying) {
    console.log('[watch-deploy] Deploy already in progress, skipping.')
    return
  }
  deploying = true
  try {
    clearStaleLock()
    const status = execSync('git status --porcelain', { cwd: __dirname }).toString().trim()
    if (!status) {
      console.log('[watch-deploy] No changes to deploy.')
      return
    }
    console.log('[watch-deploy] Changes detected, deploying...')
    execSync('git add .', { cwd: __dirname, stdio: 'inherit' })
    execSync('git commit -m "auto-deploy: update"', { cwd: __dirname, stdio: 'inherit' })
    execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' })
    console.log('[watch-deploy] ✅ Pushed! Vercel is deploying to https://scholarpath-blue.vercel.app\n')
  } catch (err) {
    console.error('[watch-deploy] ❌ Deploy failed:', err.message)
  } finally {
    // Always reset the flag, even if an error was thrown mid-deploy
    deploying = false
  }
}

function scheduleDeploy() {
  if (timer) clearTimeout(timer)
  // Wait 3 seconds after the last change before deploying
  timer = setTimeout(deploy, 3000)
}

// On startup: clear any stale lock left over from a previous crash
clearStaleLock()

const watcher = chokidar.watch(['src', 'public', 'index.html'], {
  cwd: __dirname,
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  ignoreInitial: true,
  persistent: true,
})

watcher
  .on('change', f => { console.log(`[watch-deploy] Changed: ${f}`); scheduleDeploy() })
  .on('add',    f => { console.log(`[watch-deploy] Added:   ${f}`); scheduleDeploy() })
  .on('unlink', f => { console.log(`[watch-deploy] Deleted: ${f}`); scheduleDeploy() })

console.log('[watch-deploy] 👀 Watching src/, public/, index.html for changes...')
console.log('[watch-deploy] Every save will auto-commit and push to Vercel.\n')
