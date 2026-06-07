import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, ChatMessage } from './types'
import { MOCK_MESSAGES } from './mockData'
import type { GoalPlan } from './pages/GoalWizard'

interface AppState {
  user: User | null
  messages: ChatMessage[]
  apiKey: string
  model: string
  goalPlan: GoalPlan | null
  setUser: (u: User | null) => void
  addMessage: (m: ChatMessage) => void
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setGoalPlan: (plan: GoalPlan | null) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem('sp_api_key') || '')
  const [model, setModelState] = useState<string>(() => localStorage.getItem('sp_model') || 'claude-opus-4-6')

  const addMessage = (m: ChatMessage) => setMessages(prev => [...prev, m])

  const setApiKey = (key: string) => {
    localStorage.setItem('sp_api_key', key)
    setApiKeyState(key)
  }

  const setModel = (m: string) => {
    localStorage.setItem('sp_model', m)
    setModelState(m)
  }

  return (
    <AppContext.Provider value={{ user, messages, apiKey, model, setUser, addMessage, setApiKey, setModel }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
