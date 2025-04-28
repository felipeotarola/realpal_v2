"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import ChatInterface from "@/components/chat-interface"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import "./chat.css"

export default function ChatPage() {
  const { user } = useAuth()
  const [userContextString, setUserContextString] = useState<string>("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)

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

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <div className="bg-muted-foreground/5 px-4 py-3 border-b">
          <h1 className="text-lg font-semibold text-center">RealPal Assistent</h1>
          <p className="text-sm text-center text-muted-foreground">
            Ställ frågor om fastigheter och få hjälp med ditt bostadsköp
          </p>
        </div>
        
        {/* Chat container with fixed height */}
        <div className="flex-1 overflow-hidden chat-container">
          <ChatInterface
            initialSystemMessage={getAssistantSystemPrompt(undefined, userContextString)}
            initialWelcomeMessage="Hej! Jag är RealPal, din fastighetsassistent. Hur kan jag hjälpa dig idag?"
            userContext={userContextString}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}