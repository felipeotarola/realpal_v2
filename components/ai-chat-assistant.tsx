"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import { parseMessage } from "@/lib/chat-parser"

export function AIChatAssistant({ propertyContext }: { propertyContext?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [userContextString, setUserContextString] = useState<string>("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)

  // Hämta användarkontext när komponenten laddas eller användaren ändras
  useEffect(() => {
    async function loadUserContext() {
      if (!user) return

      setIsLoadingContext(true)
      try {
        const { savedProperties, comparisons, preferences } = await fetchUserContext(user.id)
        const contextString = formatUserContextForPrompt(savedProperties, comparisons, preferences)
        setUserContextString(contextString)
      } catch (error) {
        console.error("Failed to load user context:", error)
      } finally {
        setIsLoadingContext(false)
      }
    }

    loadUserContext()
  }, [user])

  useEffect(() => {
    if (user) {
      setEnabled(true)
    } else {
      setEnabled(false)
    }
  }, [user])

  const initialSystemMessage = getAssistantSystemPrompt(propertyContext, userContextString)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hej! Jag är RealPal, din fastighetsassistent. Hur kan jag hjälpa dig idag?",
      },
    ],
    body: {
      systemMessage: initialSystemMessage,
    },
    disabled: !enabled || isLoadingContext,
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const toggleDrawer = () => {
    setIsOpen(!isOpen)
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim()) {
      handleSubmit(e)
    }
  }

  if (!user) return null

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={toggleDrawer}
        className="fixed bottom-16 right-6 rounded-full w-14 h-14 shadow-lg z-50 p-0 flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </Button>

      {/* Chat drawer - full width on all screen sizes */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full h-[60vh] bg-white shadow-lg rounded-t-lg transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-slate-100 rounded-t-lg">
            <div>
              <h2 className="font-semibold text-lg">RealPal Assistent</h2>
              {isLoadingContext && (
                <p className="text-xs text-gray-500 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Laddar din information...
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={toggleDrawer}>
              <X size={20} />
            </Button>
          </div>

          {/* Messages - centered with max width for better readability on wide screens */}
          <div className="flex-1 overflow-y-auto p-4 mx-auto w-full max-w-4xl">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.role === "assistant" ? parseMessage(message.content) : message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="max-w-[80%] rounded-lg p-3 bg-red-100 text-red-800">
                    Ett fel uppstod. Försök igen senare.
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input - centered with max width for better usability on wide screens */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t">
            <div className="flex gap-2 mx-auto w-full max-w-4xl">
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                placeholder="Skriv ett meddelande..."
                disabled={isLoading || isLoadingContext}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || isLoadingContext || !input.trim()}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
