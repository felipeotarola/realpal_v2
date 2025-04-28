"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ProtectedRoute } from "@/components/protected-route"
import ChatInterface from "@/components/chat-interface"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import "../chat.css"

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

  // Effect to handle mobile viewport height
  useEffect(() => {
    // Set initial viewport height
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set it initially
    setVh();

    // Update on resize and orientation change
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen max-h-screen overflow-hidden">
        {/* Header with animation */}
        <motion.div 
          className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3.5 border-b border-blue-200 shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1 
            className="text-xl font-semibold text-center bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            RealPal Assistent
          </motion.h1>
          <motion.p 
            className="text-sm text-center text-blue-600/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Ställ frågor om fastigheter och få hjälp med ditt bostadsköp
          </motion.p>
        </motion.div>
        
        {/* Chat container with flex-grow to fill remaining space */}
        <div className="flex-1 overflow-hidden relative h-[calc(100%-80px)]">
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