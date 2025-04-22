"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Message } from "ai"

interface ChatContextType {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  threadId: string | null
  setThreadId: React.Dispatch<React.SetStateAction<string | null>>
  clearChat: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  // Load initial state from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatMessages")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse saved chat messages:", e)
        }
      }
    }
    return []
  })

  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chatThreadId")
    }
    return null
  })

  // Save messages to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages))
    }
  }, [messages])

  // Save threadId to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && threadId) {
      localStorage.setItem("chatThreadId", threadId)
    }
  }, [threadId])

  const clearChat = () => {
    setMessages([])
    setInput("")
    setThreadId(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("chatMessages")
      localStorage.removeItem("chatThreadId")
    }
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        input,
        setInput,
        isOpen,
        setIsOpen,
        threadId,
        setThreadId,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
