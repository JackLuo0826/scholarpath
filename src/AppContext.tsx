import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, ChatMessage } from './types'
import { MOCK_MESSAGES } from './mockData'

interface AppState {
  user: User | null
  messages: ChatMessage[]
  apiKey: string
  setUser: (u: User | null) => void
  addMessage: (m: ChatMessage) => void
  setApiKey: (key: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem('sp_api_key') || '')

  const addMessage = (m: ChatMessage) => setMessages(prev => [...prev, m])

  const setApiKey = (key: string) => {
    localStorage.setItem('sp_api_key', key)
    setApiKeyState(key)
  }

  return (
    <AppContext.Provider value={{ user, messages, apiKey, setUser, addMessage, setApiKey }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
