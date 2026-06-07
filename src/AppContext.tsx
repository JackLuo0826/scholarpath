import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, ChatMessage } from './types'
import { MOCK_MESSAGES } from './mockData'
import type { GoalPlan } from './pages/GoalWizard'
import type { UniversityPath } from './pages/UniversityPathPlanner'

interface AppState {
  user: User | null
  messages: ChatMessage[]
  apiKey: string
  model: string
  goalPlan: GoalPlan | null
  universityPath: UniversityPath | null
  setUser: (u: User | null) => void
  addMessage: (m: ChatMessage) => void
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setGoalPlan: (plan: GoalPlan | null) => void
  setUniversityPath: (path: UniversityPath | null) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem('sp_api_key') || '')
  const [model, setModelState] = useState<string>(() => localStorage.getItem('sp_model') || 'claude-opus-4-6')
  const [goalPlan, setGoalPlanState] = useState<GoalPlan | null>(() => {
    const stored = localStorage.getItem('sp_goal_plan')
    return stored ? JSON.parse(stored) : null
  })
  const [universityPath, setUniversityPathState] = useState<UniversityPath | null>(() => {
    const stored = localStorage.getItem('sp_university_path')
    return stored ? JSON.parse(stored) : null
  })

  const addMessage = (m: ChatMessage) => setMessages(prev => [...prev, m])

  const setApiKey = (key: string) => {
    localStorage.setItem('sp_api_key', key)
    setApiKeyState(key)
  }

  const setModel = (m: string) => {
    localStorage.setItem('sp_model', m)
    setModelState(m)
  }

  const setGoalPlan = (plan: GoalPlan | null) => {
    if (plan) localStorage.setItem('sp_goal_plan', JSON.stringify(plan))
    else localStorage.removeItem('sp_goal_plan')
    setGoalPlanState(plan)
  }

  const setUniversityPath = (path: UniversityPath | null) => {
    if (path) localStorage.setItem('sp_university_path', JSON.stringify(path))
    else localStorage.removeItem('sp_university_path')
    setUniversityPathState(path)
  }

  return (
    <AppContext.Provider value={{ user, messages, apiKey, model, goalPlan, universityPath, setUser, addMessage, setApiKey, setModel, setGoalPlan, setUniversityPath }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
