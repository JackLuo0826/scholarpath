import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, Shield } from 'lucide-react'
import { useApp } from '../AppContext'

export default function LoginPage() {
  const { setUser } = useApp()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [showStudentPass, setShowStudentPass] = useState(false)
  const [tab, setTab] = useState<'parent' | 'student'>('parent')
  const [parentEmail, setParentEmail] = useState('sarah@example.com')
  const [parentPassword, setParentPassword] = useState('password')
  const [studentEmail, setStudentEmail] = useState('emma@example.com')
  const [studentPassword, setStudentPassword] = useState('student123')
  const [error, setError] = useState('')

  const loginAs = (role: 'parent' | 'student') => {
    setError('')
    if (role === 'parent') {
      if (!parentEmail.trim() || !parentPassword.trim()) { setError('Please enter email and password.'); return }
      setUser({ id: 'parent1', name: 'Sarah Chen', email: parentEmail, role: 'parent' })
      navigate('/parent')
    } else {
      if (!studentEmail.trim() || !studentPassword.trim()) { setError('Please enter email and password.'); return }
      setUser({ id: 'child1', name: 'Emma', email: studentEmail, role: 'student' })
      navigate('/student')
    }
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
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['parent', 'student'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
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
            {tab === 'parent' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input
                    type="email"
                    defaultValue="sarah@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      defaultValue="password"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  onClick={() => loginAs('parent')}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
                >
                  Sign in as Parent
                </button>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  Parent accounts require 2FA on first login. Keep your children's data safe.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
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
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPass(!showStudentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
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
                  onClick={() => loginAs('student')}
                  className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
                >
                  Start Learning! 🚀
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          New here?{' '}
          <a href="#" className="text-brand-600 hover:underline font-medium">Create a parent account</a>
        </p>
      </div>
    </div>
  )
}
