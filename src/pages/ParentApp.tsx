import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, BarChart2, MessageSquare, Map, Settings,
  LogOut, Flame, Clock, TrendingUp, CheckCircle, AlertCircle,
  ChevronDown, Shield, Bell, Lock, Eye, Brain, Key, Target
} from 'lucide-react'
import { useApp } from '../AppContext'
import GoalWizard from './GoalWizard'
import GoalPlan from './GoalPlan'
import UniversityPathPlanner from './UniversityPathPlanner'

function Toggle({ on }: { on: boolean }) {
  const [active, setActive] = useState(on)
  return (
    <button
      onClick={() => setActive(v => !v)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${active ? 'bg-brand-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  )
}
import { MOCK_CHILD } from '../mockData'

type Tab = 'overview' | 'roadmap' | 'chat' | 'settings'

export default function ParentApp() {
  const { messages, logout: logoutFn, apiKey, setApiKey, model, setModel, goalPlan, setGoalPlan, universityPath, setUniversityPath } = useApp()
  const [showGoalWizard, setShowGoalWizard] = useState(false)
  const [roadmapView, setRoadmapView] = useState<'university' | 'goal'>('university')
  const [keyInput, setKeyInput] = useState(apiKey)
  const [keyVisible, setKeyVisible] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  const saveApiKey = () => {
    setApiKey(keyInput.trim())
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const logout = async () => { await logoutFn(); navigate('/') }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen hidden md:flex">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-none">ScholarPath</p>
              <p className="text-xs text-gray-400">Parent Dashboard</p>
            </div>
          </div>
        </div>

        {/* Child selector */}
        <div className="p-3 border-b border-gray-100">
          <button className="w-full flex items-center gap-2.5 bg-brand-50 rounded-xl px-3 py-2.5 hover:bg-brand-100 transition-colors">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: MOCK_CHILD.avatarColor }}
            >
              {MOCK_CHILD.name[0]}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">{MOCK_CHILD.name}</p>
              <p className="text-xs text-gray-500">{MOCK_CHILD.grade}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {([
            { key: 'overview',  label: 'Overview',     icon: BarChart2 },
            { key: 'roadmap',   label: 'Roadmap',      icon: Map },
            { key: 'chat',      label: 'Chat History', icon: MessageSquare },
            { key: 'settings',  label: 'Controls',     icon: Settings },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">ScholarPath</span>
          </div>
          <button onClick={logout}><LogOut className="w-4 h-4 text-gray-400" /></button>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden bg-white border-b border-gray-100 flex overflow-x-auto scrollbar-hide sticky top-[53px] z-10">
          {([
            { key: 'overview',  label: 'Overview',  icon: BarChart2 },
            { key: 'roadmap',   label: 'Roadmap',   icon: Map },
            { key: 'chat',      label: 'History',   icon: MessageSquare },
            { key: 'settings',  label: 'Controls',  icon: Settings },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Good morning, Sarah 👋</h2>
                <p className="text-sm text-gray-500 mt-0.5">Emma has been on a {MOCK_CHILD.streak}-day study streak. Keep it going!</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Study Streak', value: `${MOCK_CHILD.streak}d`, icon: Flame, color: 'text-orange-500 bg-orange-50' },
                  { label: 'This Week', value: `${MOCK_CHILD.totalMinutesThisWeek}m`, icon: Clock, color: 'text-blue-500 bg-blue-50' },
                  { label: 'Goal Progress', value: '72%', icon: TrendingUp, color: 'text-green-500 bg-green-50' },
                  { label: 'Milestones Hit', value: '1/10', icon: CheckCircle, color: 'text-purple-500 bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Weekly chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Study Time This Week</h3>
                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">+18%</span>
                </div>
                <div className="flex items-end gap-2 h-28">
                  {MOCK_CHILD.weeklyStats.map(d => {
                    const maxMin = Math.max(...MOCK_CHILD.weeklyStats.map(x => x.minutes), 1)
                    const h = d.minutes > 0 ? Math.max((d.minutes / maxMin) * 96, 8) : 4
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400 font-medium">{d.minutes > 0 ? d.minutes + 'm' : ''}</span>
                        <div
                          className={`w-full rounded-lg ${d.minutes > 0 ? 'bg-brand-400' : 'bg-gray-100'}`}
                          style={{ height: `${h}px` }}
                        />
                        <span className="text-[10px] text-gray-500">{d.day}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Subject progress */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Subject Progress</h3>
                <div className="space-y-3.5">
                  {MOCK_CHILD.subjects.map(s => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 flex items-center gap-1.5">
                          {s.icon} {s.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Lv {s.currentLevel}/10</span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: s.color }}
                          >{s.progressPercent}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${s.progressPercent}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">SAT Prep needs attention</p>
                  <p className="text-xs text-amber-700 mt-0.5">Emma is at Level 4 in SAT Prep — 6 months behind the recommended pace for a 1550+ target. Consider adding 2 extra sessions per week.</p>
                </div>
              </div>
            </div>
          )}

          {/* ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              {/* Tab switcher */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setRoadmapView('university')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${roadmapView === 'university' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🎓 University Path
                </button>
                <button
                  onClick={() => setRoadmapView('goal')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${roadmapView === 'goal' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🎯 Goal Plan
                </button>
              </div>

              {/* University Path Planner */}
              {roadmapView === 'university' && (
                <UniversityPathPlanner
                  apiKey={apiKey}
                  model={model}
                  path={universityPath}
                  onPathGenerated={setUniversityPath}
                  onPathCleared={() => setUniversityPath(null)}
                />
              )}

              {/* Goal Plan (WOOP wizard) */}
              {roadmapView === 'goal' && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Personal Goal Plan</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Science-based goal setting using WOOP, SDT & implementation intentions</p>
                    </div>
                    <button
                      onClick={() => setShowGoalWizard(true)}
                      className="flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand-700 transition-colors flex-shrink-0 shadow"
                    >
                      <Target className="w-3.5 h-3.5" />
                      {goalPlan ? 'Update' : 'Start Session'}
                    </button>
                  </div>
                  {goalPlan
                    ? <GoalPlan plan={goalPlan} onReset={() => setGoalPlan(null)} />
                    : (
                      <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <Target className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Set a personal goal with AI coaching</p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">A 7-question session that builds a WOOP-based roadmap with obstacle strategies and weekly habits tailored to your child's motivation and challenges.</p>
                        </div>
                      </div>
                    )
                  }
                </div>
              )}

            </div>
          )}

          {/* CHAT HISTORY */}
          {activeTab === 'chat' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chat History</h2>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  All AI–student conversations are permanently logged. Emma cannot delete these.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Today · Mathematics</span>
                    <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">Active session</span>
                  </div>
                  <span className="text-xs text-gray-400">{messages.length} messages</span>
                </div>
                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'student' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        msg.sender === 'ai' ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {msg.sender === 'ai' ? 'AI' : 'E'}
                      </div>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.sender === 'ai' ? 'bg-gray-50 text-gray-700' : 'bg-brand-50 text-brand-900'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS / CONTROLS */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Parental Controls</h2>
                <p className="text-sm text-gray-500 mt-0.5">Manage Emma's learning environment and safety settings.</p>
              </div>

              {/* Claude API Key */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 text-sm">Claude API Key</h3>
                  {apiKey && (
                    <span className="ml-auto text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">✓ Connected</span>
                  )}
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    ScholarPath uses your own Claude API key to power the AI tutor. Your key is stored locally and never shared.{' '}
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Get a key →</a>
                  </p>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Model</label>
                    <select
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="claude-opus-4-6">Claude Opus 4 — Most capable (default)</option>
                      <option value="claude-sonnet-4-6">Claude Sonnet 4 — Balanced</option>
                      <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — Fastest</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={keyVisible ? 'text' : 'password'}
                        value={keyInput}
                        onChange={e => setKeyInput(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setKeyVisible(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {keyVisible ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={saveApiKey}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        keySaved
                          ? 'bg-green-100 text-green-700'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      }`}
                    >
                      {keySaved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>

              {[
                {
                  section: 'Study Time',
                  icon: Clock,
                  items: [
                    { label: 'Daily study limit', desc: 'Max study session time', control: <select className="text-xs border border-gray-200 rounded-lg px-2 py-1"><option>45 min</option><option>60 min</option><option>90 min</option></select> },
                    { label: 'No learning after', desc: 'Hard cutoff at this time', control: <input type="time" defaultValue="21:00" className="text-xs border border-gray-200 rounded-lg px-2 py-1" /> },
                  ]
                },
                {
                  section: 'AI Tutor',
                  icon: Brain,
                  items: [
                    { label: 'Socratic mode', desc: 'AI guides rather than answers directly', control: <Toggle on /> },
                    { label: 'Off-topic detection', desc: 'Block non-study conversations', control: <Toggle on /> },
                    { label: 'Language level', desc: 'Age-appropriate vocabulary only', control: <select className="text-xs border border-gray-200 rounded-lg px-2 py-1"><option>Age 13</option><option>Age 12</option><option>Age 14</option></select> },
                  ]
                },
                {
                  section: 'Notifications',
                  icon: Bell,
                  items: [
                    { label: 'Weekly digest email', desc: 'Summary of Emma\'s progress', control: <Toggle on /> },
                    { label: 'Milestone alerts', desc: 'When Emma hits a milestone', control: <Toggle on /> },
                    { label: 'Off-track warnings', desc: 'If Emma falls behind plan', control: <Toggle on /> },
                  ]
                },
                {
                  section: 'Privacy & Safety',
                  icon: Shield,
                  items: [
                    { label: 'Chat logging', desc: 'All conversations permanently stored', control: <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Always on</span> },
                    { label: 'Child can delete history', desc: 'Allow Emma to delete messages', control: <Toggle on={false} /> },
                    { label: 'Data export', desc: 'Download all of Emma\'s data', control: <button className="text-xs text-brand-600 font-semibold hover:underline">Export</button> },
                  ]
                },
              ].map(group => (
                <div key={group.section} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <group.icon className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 text-sm">{group.section}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {group.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0">{item.control}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

