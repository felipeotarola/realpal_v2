"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import { MarkdownRenderer } from "@/components/markdown-renderer"

export function AIChatAssistant({ propertyContext }: { propertyContext?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [userContextString, setUserContextString] = useState<string>("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [messageTimes, setMessageTimes] = useState<Record<string, Date>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileList | undefined>(undefined)

  // Fetch user context when component loads or user changes
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

  // Add timestamps for new messages
  useEffect(() => {
    const hasNewMessages = messages.some((message) => !messageTimes[message.id])

    if (hasNewMessages) {
      setMessageTimes((prevTimes) => {
        const newTimes = { ...prevTimes }
        messages.forEach((message) => {
          if (!newTimes[message.id]) {
            newTimes[message.id] = new Date()
          }
        })
        return newTimes
      })
    }
  }, [messages, messageTimes])

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files)
    }
  }

  const clearFiles = () => {
    setFiles(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Helper function to format timestamps
  function formatMessageTime(date: Date | undefined): string {
    if (!date) return "Just now"

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // If less than a minute ago, show "Just now"
    if (diff < 60000) {
      return "Just now"
    }

    // If less than an hour ago, show minutes
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }

    // If today, show time
    if (now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Otherwise show date
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  if (!user) return null

  return (
    <>
      {/* Floating button - hidden when chat is open */}
      {!isOpen && (
        <Button
          onClick={toggleDrawer}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-40 p-0 flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </Button>
      )}

      {/* Chat drawer - full width on all screen sizes */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full h-[60vh] bg-white shadow-lg rounded-t-lg transition-transform duration-300 ease-in-out z-50 ${
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
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} items-start`}
                >
                  {message.role === "assistant" && (
                    <div className="flex flex-col items-center mr-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-medium text-blue-600 mt-1">AI</span>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="leading-relaxed tracking-wide">{message.content}</p>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>
                    <div
                      className={`text-xs text-gray-500 mt-1 ${message.role === "user" ? "text-right" : "text-left"}`}
                    >
                      {formatMessageTime(messageTimes[message.id])}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="flex flex-col items-center ml-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-blue-600 mt-1">Du</span>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-start">
                  <div className="flex flex-col items-center mr-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 mt-1">AI</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800">
                      <div className="flex space-x-2">
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: "600ms" }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Just now</div>
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
          <div className="p-4 border-t">
            <form onSubmit={handleFormSubmit} className="flex gap-2 mx-auto w-full max-w-4xl">
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
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
