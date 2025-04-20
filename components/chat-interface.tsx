"use client"

import type React from "react"

import { useChat } from "ai/react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Bot, User, X, FileIcon, ImageIcon } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"

interface ChatInterfaceProps {
  initialSystemMessage?: string
  initialWelcomeMessage?: string
  propertyContext?: string
}

export default function ChatInterface({
  initialSystemMessage = "Du är en hjälpsam assistent.",
  initialWelcomeMessage = "Hej! Hur kan jag hjälpa dig idag?",
  propertyContext,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [userContextString, setUserContextString] = useState<string>("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [messageTimes, setMessageTimes] = useState<Record<string, Date>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileList | undefined>(undefined)
  const [threadId, setThreadId] = useState<string | null>(null)

  // Add a function to extract property IDs from messages for comparison
  const extractPropertyIds = (text: string): string[] => {
    // Look for patterns like "jämför fastighet 1 och 2" or "jämför fastigheter med ID 1, 2, 3"
    const idPattern = /fastighet(?:er)?\s+(?:med\s+ID\s+)?(\d+)(?:\s*(?:,|och|&)\s*(\d+))+/i
    const match = text.match(idPattern)

    if (match) {
      // Extract all numbers from the match
      const allNumbers = text.match(/\d+/g)
      return allNumbers || []
    }

    return []
  }

  // Helper function to format message time
  const formatMessageTime = (date?: Date): string => {
    if (!date) return "Just nu"

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // If less than a minute ago, show "Just now"
    if (diff < 60000) {
      return "Just nu"
    }

    // If less than an hour ago, show minutes
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m sedan`
    }

    // If today, show time
    if (now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Otherwise show date
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // Fetch user context when component loads or user changes
  useEffect(() => {
    async function loadUserContext() {
      if (!user) return

      setIsLoadingContext(true)
      try {
        const { savedProperties, comparisons, preferences, propertyAnalyses } = await fetchUserContext(user.id)
        const contextString = formatUserContextForPrompt(savedProperties, comparisons, preferences, propertyAnalyses)
        setUserContextString(contextString)
        console.log("Loaded user context with", savedProperties.length, "saved properties")
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

  // Create the system message with both property context and user context
  const systemMessage = getAssistantSystemPrompt(propertyContext, userContextString)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, data } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: initialWelcomeMessage,
      },
    ],
    body: {
      systemMessage: systemMessage,
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

  // Store the threadId when we get it from the response
  useEffect(() => {
    if (data?.threadId && !threadId) {
      setThreadId(data.threadId)
    }
  }, [data, threadId])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Don't proceed if no input and no files
    if (!input.trim() && (!files || files.length === 0)) return

    // Add this to the handleFormSubmit function, right before the handleSubmit call
    // This will help with property comparisons
    const propertyIds = extractPropertyIds(input)
    if (propertyIds.length > 1) {
      console.log("Detected property comparison request for IDs:", propertyIds)
      // You could add additional logic here to enhance property comparisons
    }

    // Submit the chat with files if available
    handleSubmit(e, {
      experimental_attachments: files,
      options: {
        body: {
          threadId,
          systemMessage: systemMessage, // Make sure to include the system message with each submission
        },
      },
    })

    // Clear the files after sending
    clearFiles()
  }

  const handlePropertyQuery = (query: string) => {
    // Set input to the query
    handleInputChange({ target: { value: query } } as React.ChangeEvent<HTMLInputElement>)

    // Submit the form with the query
    const event = new Event("submit", {
      bubbles: true,
      cancelable: true,
    }) as unknown as React.FormEvent<HTMLFormElement>
    handleSubmit(event)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <div>
                    <p className="leading-relaxed tracking-wide">{message.content}</p>

                    {/* Display attachments for user messages */}
                    {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.experimental_attachments.map((attachment, idx) => (
                          <div key={idx}>
                            {attachment.contentType?.startsWith("image/") ? (
                              <div className="rounded-md overflow-hidden border mt-2 bg-white/20">
                                {attachment.url && (
                                  <img
                                    src={attachment.url || "/placeholder.svg"}
                                    alt={attachment.name || `Image ${idx + 1}`}
                                    className="max-w-full h-auto"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 p-2 border rounded-md bg-white/20">
                                <FileIcon className="h-4 w-4 text-white" />
                                <span className="text-sm">{attachment.name || `File ${idx + 1}`}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <MarkdownRenderer content={message.content} />
                )}
              </div>
              <div className={`text-xs text-gray-500 mt-1 ${message.role === "user" ? "text-right" : "text-left"}`}>
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
              <div className="text-xs text-gray-500 mt-1">Just nu</div>
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

      <form onSubmit={handleFormSubmit} className="p-4 border-t">
        {/* File preview */}
        {files && files.length > 0 && (
          <div className="mb-2">
            <div className="relative inline-block">
              <div className="rounded-md overflow-hidden border">
                {files[0].type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(files[0]) || "/placeholder.svg"}
                    alt={`File preview`}
                    className="max-h-32 object-contain"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <FileIcon className="h-5 w-5" />
                    <span className="text-sm truncate max-w-[100px]">{files[0].name}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearFiles}
                className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full p-1 shadow-sm hover:bg-gray-100 border"
                aria-label="Ta bort fil"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-md border bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Ladda upp bild"
            disabled={isLoading || isLoadingContext}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={isLoading || isLoadingContext}
          />
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={files && files.length > 0 ? "Fråga om denna bild..." : "Skriv ett meddelande..."}
            disabled={isLoading || isLoadingContext}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || isLoadingContext || (!input.trim() && !files?.length)}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
          </Button>
        </div>

        {/* Add quick action buttons for property-related queries */}
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={() => handlePropertyQuery("Visa mina sparade fastigheter")}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading || isLoadingContext}
          >
            Visa sparade fastigheter
          </button>
          <button
            type="button"
            onClick={() => handlePropertyQuery("Vilka är mina preferenser?")}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading || isLoadingContext}
          >
            Visa preferenser
          </button>
          <button
            type="button"
            onClick={() => handlePropertyQuery("Vilken fastighet passar mig bäst?")}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading || isLoadingContext}
          >
            Rekommendation
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">Tips: Ladda upp bilder för att analysera dem (max 4MB)</p>
      </form>

      {isLoadingContext && <div className="text-xs text-center text-gray-500 pb-2">Laddar din information...</div>}
    </div>
  )
}
