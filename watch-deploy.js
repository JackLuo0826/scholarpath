import chokidar from 'chokidar'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let timer = null
let pending = false

function deploy() {
  try {
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
  }
  pending = false
}

function scheduleDeploy() {
  if (timer) clearTimeout(timer)
  pending = true
  // Wait 3 seconds after last change before deploying
  timer = setTimeout(deploy, 3000)
}

const watcher = chokidar.watch(['src', 'public', 'index.html'], {
  cwd: __dirname,
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  ignoreInitial: true,
  persistent: true
})

watcher
  .on('change', f => { console.log(`[watch-deploy] Changed: ${f}`); scheduleDeploy() })
  .on('add',    f => { console.log(`[watch-deploy] Added:   ${f}`); scheduleDeploy() })
  .on('unlink', f => { console.log(`[watch-deploy] Deleted: ${f}`); scheduleDeploy() })

console.log('[watch-deploy] 👀 Watching src/, public/, index.html for changes...')
console.log('[watch-deploy] Every save will auto-commit and push to Vercel.\n')
