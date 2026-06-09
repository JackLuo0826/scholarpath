import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, Shield, Loader2 } from 'lucide-react'
import { useApp } from '../AppContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function LoginPage() {
  const { setUser } = useApp()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [showStudentPass, setShowStudentPass] = useState(false)
  const [tab, setTab] = useState<'parent' | 'student'>('parent')
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPassword, setParentPassword] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const loginParent = async () => {
    if (!parentEmail.trim() || !parentPassword.trim()) { setError('Please enter email and password.'); return }
    setError('')
    setLoading(true)

    if (isSupabaseConfigured) {
      if (mode === 'signup') {
        if (!parentName.trim()) { setError('Please enter your name.'); setLoading(false); return }
        const { error: signUpError } = await supabase.auth.signUp({
          email: parentEmail,
          password: parentPassword,
          options: { data: { name: parentName.trim(), role: 'parent' } },
        })
        if (signUpError) { setError(signUpError.message); setLoading(false); return }
        setError('')
        // After signup, Supabase sends a confirmation email by default.
        // For dev: disable email confirmation in Supabase Auth settings.
        navigate('/parent')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parentEmail,
          password: parentPassword,
        })
        if (signInError) { setError(signInError.message); setLoading(false); return }
        navigate('/parent')
      }
    } else {
      // Fallback: mock login when Supabase is not configured
      setUser({ id: 'parent1', name: 'Sarah Chen', email: parentEmail, role: 'parent' })
      navigate('/parent')
    }
    setLoading(false)
  }

  const loginStudent = async () => {
    if (!studentEmail.trim() || !studentPassword.trim()) { setError('Please enter email and password.'); return }
    setError('')
    setLoading(true)

    if (isSupabaseConfigured) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: studentPassword,
      })
      if (signInError) { setError(signInError.message); setLoading(false); return }
      navigate('/student')
    } else {
      setUser({ id: 'child1', name: 'Emma', email: studentEmail, role: 'student' })
      navigate('/student')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-lg shadow-brand-200">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ScholarPath</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
          {!isSupabaseConfigured && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 mt-2">
              Demo mode — Supabase not connected
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['parent', 'student'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors capitalize ${
                  tab === t
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'parent' ? '👨‍👩‍👧 Parent' : '🎒 Student'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>
            )}

            {tab === 'parent' ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setParentEmail('parent@test.com'); setParentPassword('Test1234!'); setMode('signin') }}
                  className="w-full text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-xl py-2 hover:bg-brand-100 transition-colors"
                >
                  Use test account (parent@test.com)
                </button>
                {isSupabaseConfigured && (
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-2">
                    <button onClick={() => setMode('signin')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mode === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Sign in</button>
                    <button onClick={() => setMode('signup')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Create account</button>
                  </div>
                )}
                {mode === 'signup' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Your name</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loginParent()}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="Jane Smith"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={e => setParentEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loginParent()}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={parentPassword}
                      onChange={e => setParentPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loginParent()}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={loginParent}
                  disabled={loading}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'signup' ? 'Create Parent Account' : 'Sign in as Parent'}
                </button>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  Keep your password safe — all child chat logs are linked to your account.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStudentEmail('student@test.com'); setStudentPassword('Test1234!') }}
                  className="w-full text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-xl py-2 hover:bg-brand-100 transition-colors"
                >
                  Use test account (student@test.com)
                </button>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loginStudent()}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showStudentPass ? 'text' : 'password'}
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loginStudent()}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowStudentPass(!showStudentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showStudentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" className="rounded" defaultChecked />
                    Remember me
                  </label>
                  <a href="#" className="text-brand-600 hover:underline">Forgot password?</a>
                </div>
                <button
                  onClick={loginStudent}
                  disabled={loading}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Start Learning! 🚀
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          New here?{' '}
          <button onClick={() => { setTab('parent'); setMode('signup') }} className="text-brand-600 hover:underline font-medium">Create a parent account</button>
        </p>
      </div>
    </div>
  )
}
