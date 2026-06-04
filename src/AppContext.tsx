import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, ChatMessage } from './types'
import { MOCK_MESSAGES } from './mockData'

interface AppState {
  user: User | null
  messages: ChatMessage[]
  setUser: (u: User | null) => void
  addMessage: (m: ChatMessage) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)

  const addMessage = (m: ChatMessage) => setMessages(prev => [...prev, m])

  return (
    <AppContext.Provider value={{ user, messages, setUser, addMessage }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
