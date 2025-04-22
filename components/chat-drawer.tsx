"use client"

import { useState, useEffect, useRef } from "react"
import { Drawer } from "vaul"
import { MessageSquare, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import ChatInterface from "./chat-interface"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { useAuth } from "@/contexts/auth-context"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"

interface ChatDrawerProps {
  propertyContext?: string
}

export function ChatDrawer({ propertyContext }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userContextString, setUserContextString] = useState<string>("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

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
        console.log("User context string:", contextString.substring(0, 200) + "...")
      } catch (error) {
        console.error("Failed to load user context:", error)
      } finally {
        setIsLoadingContext(false)
      }
    }

    loadUserContext()
  }, [user])

  const handleButtonClick = () => {
    console.log("Floating button clicked")
    setIsOpen(true)
  }

  const handleCloseClick = () => {
    console.log("Close button clicked")
    setIsOpen(false)
  }
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // small timeout so the drawer animation can finish
      setTimeout(() => inputRef.current!.focus(), 200)
    }
  }, [isOpen])

  return (
    <>
      {user && (
        <>
          {/* Floating chat button */}
          <Button
            className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg flex items-center justify-center z-40"
            size="icon"
            variant="default"
            onClick={handleButtonClick}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Drawer.Root
            open={isOpen}
            onOpenChange={(open) => {
              console.log("Drawer onOpenChange called with:", open)
              setIsOpen(open)
            }}
          >
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
              <Drawer.Content
  className="
    bg-background flex flex-col rounded-t-[10px] fixed bottom-0 left-0 right-0 z-50
    h-[100dvh]        /* modern browsers */
    h-screen          /* fallback to 100vh */
    h-[calc(var(--vh,1vh)*100)] /* JS‑driven fallback */
    max-h-[100dvh]
  "
>                <div className="p-2 sm:p-4 bg-background rounded-t-[10px] flex flex-col h-full pb-safe bottom-safe">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary">
                        <MessageSquare className="h-3.5 w-3.5 text-secondary-foreground" />
                      </div>
                      <Drawer.Title className="text-sm font-medium text-muted-foreground">
                   RealPal Assistent
                      </Drawer.Title>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCloseClick} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatInterface
                      initialSystemMessage={getAssistantSystemPrompt(propertyContext, userContextString)}
                      initialWelcomeMessage="Hej! Jag är RealPal, din fastighetsassistent. Hur kan jag hjälpa dig idag?"
                      propertyContext={propertyContext}
                      userContext={userContextString}
                    />
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </>
      )}
    </>
  )
}
