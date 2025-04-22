"use client"

import type React from "react"

import { useChat as useVercelChat } from "ai/react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Bot, User, X, FileIcon, ImageIcon } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { useRouter } from "next/navigation"
import { useChat } from "@/contexts/chat-context"

interface ChatInterfaceProps {
  initialSystemMessage?: string
  initialWelcomeMessage?: string
  propertyContext?: string
  userContext?: string
}

export default function ChatInterface({
  initialSystemMessage = "Du är en hjälpsam assistent.",
  initialWelcomeMessage = "Hej! Hur kan jag hjälpa dig idag?",
  propertyContext,
  userContext,
}: ChatInterfaceProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [localUserContext, setLocalUserContext] = useState<string>(userContext || "")
  const [messageTimes, setMessageTimes] = useState<Record<string, Date>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileList | undefined>(undefined)

  // Use global chat context
  const { messages: globalMessages, setMessages: setGlobalMessages, threadId, setThreadId } = useChat()

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

  // Fetch user context if not provided
  useEffect(() => {
    async function loadUserContext() {
      if (!user || userContext) return

      setIsLoadingContext(true)
      try {
        const { savedProperties, comparisons, preferences, propertyAnalyses } = await fetchUserContext(user.id)
        const contextString = formatUserContextForPrompt(savedProperties, comparisons, preferences, propertyAnalyses)
        setLocalUserContext(contextString)
        console.log("Loaded user context with", savedProperties.length, "saved properties")
      } catch (error) {
        console.error("Failed to load user context:", error)
      } finally {
        setIsLoadingContext(false)
      }
    }

    loadUserContext()
  }, [user, userContext])

  useEffect(() => {
    if (user) {
      setEnabled(true)
    } else {
      setEnabled(false)
    }
  }, [user])

  // Create the system message with both property context and user context
  const systemMessage = getAssistantSystemPrompt(propertyContext, localUserContext)

  // Initialize with welcome message if no messages exist
  useEffect(() => {
    if (globalMessages.length === 0) {
      setGlobalMessages([
        {
          id: "welcome",
          role: "assistant",
          content: initialWelcomeMessage,
        },
      ])
    }
  }, [globalMessages.length, setGlobalMessages, initialWelcomeMessage])

  // Log the system message for debugging
  useEffect(() => {
    console.log("System message created with property context and user context")
    console.log("Property context length:", propertyContext?.length || 0)
    console.log("User context length:", localUserContext?.length || 0)
    console.log("Total system message length:", systemMessage.length)
  }, [propertyContext, localUserContext, systemMessage])

  const { input, handleInputChange, handleSubmit, isLoading, error, data } = useVercelChat({
    api: "/api/chat",
    initialMessages: globalMessages,
    body: {
      systemMessage: systemMessage,
      threadId,
    },
    onResponse(response) {
      if (response.threadId) {
        setThreadId(response.threadId)
      }
    },
    onFinish(message) {
      // Update global messages
      setGlobalMessages((current) => [...current, message])
    },
    disabled: !enabled || isLoadingContext,
  })

  // Add timestamps for new messages
  useEffect(() => {
    const hasNewMessages = globalMessages.some((message) => !messageTimes[message.id])

    if (hasNewMessages) {
      setMessageTimes((prevTimes) => {
        const newTimes = { ...prevTimes }
        globalMessages.forEach((message) => {
          if (!newTimes[message.id]) {
            newTimes[message.id] = new Date()
          }
        })
        return newTimes
      })
    }
  }, [globalMessages, messageTimes])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [globalMessages])

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

    // Add user message to global messages immediately for better UX
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input,
    }
    setGlobalMessages((current) => [...current, userMessage])

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

    // Add user message to global messages immediately
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: query,
    }
    setGlobalMessages((current) => [...current, userMessage])

    // Submit the form with the query
    const event = new Event("submit", {
      bubbles: true,
      cancelable: true,
    }) as unknown as React.FormEvent<HTMLFormElement>

    // Submit with the system message
    handleSubmit(event, {
      options: {
        body: {
          threadId,
          systemMessage: systemMessage,
        },
      },
    })
  }

  // Add this new useEffect to handle mobile viewport adjustments
  useEffect(() => {
    // Function to handle viewport height for mobile keyboards
    const handleResize = () => {
      // Set a custom property for the visible viewport height
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`)
    }

    // Initial call
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
    }
  }, [])

  // Add a style tag for the property cards
  const chatStyles = `
  .property-chat-container .chat-message a {
    text-decoration: none;
  }
  
  .property-chat-container .chat-message a:hover {
    text-decoration: none;
  }
  
  .property-chat-container .chat-message a > div {
    transition: all 0.2s ease;
  }
  
  .property-chat-container .chat-message a:hover > div {
    background-color: rgba(59, 130, 246, 0.05);
  }
  
  /* Mobile viewport fix */
  .chat-container {
    height: 100vh;
    height: calc(var(--vh, 1vh) * 100);
  }
`

  // Add the style tag to the component
  useEffect(() => {
    // Add the style tag to the document head
    const styleElement = document.createElement("style")
    styleElement.innerHTML = chatStyles
    document.head.appendChild(styleElement)

    // Clean up on unmount
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3 property-chat-container"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {globalMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} items-start`}
          >
            {message.role === "assistant" && (
              <div className="flex flex-col items-center mr-1.5 sm:mr-2">
                <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100">
                  <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-blue-600 mt-0.5">AI</span>
              </div>
            )}

            <div className="flex flex-col">
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-2.5 text-sm ${
                  message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {message.role === "user" ? (
                  <div>
                    <p className="leading-relaxed tracking-wide text-sm">{message.content}</p>

                    {/* Display attachments for user messages */}
                    {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {message.experimental_attachments.map((attachment, idx) => (
                          <div key={idx}>
                            {attachment.contentType?.startsWith("image/") ? (
                              <div className="rounded-md overflow-hidden border mt-1.5 bg-white/20">
                                {attachment.url && (
                                  <img
                                    src={attachment.url || "/placeholder.svg"}
                                    alt={attachment.name || `Image ${idx + 1}`}
                                    className="max-w-full h-auto"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 p-1.5 border rounded-md bg-white/20">
                                <FileIcon className="h-3.5 w-3.5 text-white" />
                                <span className="text-xs">{attachment.name || `File ${idx + 1}`}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm chat-message">
                    <MarkdownRenderer content={message.content} />
                  </div>
                )}
              </div>
              <div
                className={`text-[10px] sm:text-xs text-gray-500 mt-0.5 ${message.role === "user" ? "text-right" : "text-left"}`}
              >
                {formatMessageTime(messageTimes[message.id])}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex flex-col items-center ml-1.5 sm:ml-2">
                <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-500">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-blue-600 mt-0.5">Du</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-start">
            <div className="flex flex-col items-center mr-1.5 sm:mr-2">
              <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100">
                <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-blue-600 mt-0.5">AI</span>
            </div>
            <div className="flex flex-col">
              <div className="max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-2.5 bg-gray-100 text-gray-800">
                <div className="flex space-x-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "600ms" }}
                  ></div>
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Just nu</div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-2.5 bg-red-100 text-red-800 text-sm">
              Ett fel uppstod. Försök igen senare.
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="p-2 sm:p-3 border-t sticky bottom-0 bg-white z-10">
        {/* File preview */}
        {files && files.length > 0 && (
          <div className="mb-1.5 sm:mb-2">
            <div className="relative inline-block">
              <div className="rounded-md overflow-hidden border">
                {files[0].type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(files[0]) || "/placeholder.svg"}
                    alt={`File preview`}
                    className="max-h-24 sm:max-h-32 object-contain"
                  />
                ) : (
                  <div className="flex items-center space-x-1.5 p-1.5 border rounded-md">
                    <FileIcon className="h-4 w-4" />
                    <span className="text-xs truncate max-w-[80px] sm:max-w-[100px]">{files[0].name}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearFiles}
                className="absolute -top-1.5 -right-1.5 bg-white text-gray-800 rounded-full p-0.5 shadow-sm hover:bg-gray-100 border"
                aria-label="Ta bort fil"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 sm:p-2 rounded-md border bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Ladda upp bild"
            disabled={isLoading || isLoadingContext}
          >
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
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
            autoFocus={true}
            value={input}
            onChange={handleInputChange}
            placeholder={files && files.length > 0 ? "Fråga om denna bild..." : "Skriv ett meddelande..."}
            disabled={isLoading || isLoadingContext}
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="submit"
            disabled={isLoading || isLoadingContext || (!input.trim() && !files?.length)}
            className="h-9 px-2.5"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
          </Button>
        </div>

        {/* Add quick action buttons for property-related queries */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => handlePropertyQuery("Visa mina sparade fastigheter")}
            className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading || isLoadingContext}
          >
            Visa sparade fastigheter
          </button>
          <button
            type="button"
            onClick={() => handlePropertyQuery("Vilka är mina preferenser?")}
            className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading || isLoadingContext}
          >
            Visa preferenser
          </button>
          <button
            type="button"
            onClick={() => handlePropertyQuery("Vilken fastighet passar mig bäst?")}
            className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
            disabled={isLoading || isLoadingContext}
          >
            Rekommendation
          </button>
        </div>

        <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-1.5">
          Tips: Ladda upp bilder för att analysera dem (max 4MB)
        </p>
      </form>

      {isLoadingContext && (
        <div className="text-[10px] sm:text-xs text-center text-gray-500 pb-1.5">Laddar din information...</div>
      )}
    </div>
  )
}
