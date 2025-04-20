"use client"

import { useState, useEffect } from "react"
import { Drawer } from "vaul"
import { MessageSquare, X } from "lucide-react"
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

  // Log property context when it changes
  useEffect(() => {
    if (propertyContext) {
      console.log("Property context available:", propertyContext.substring(0, 100) + "...")
    }
  }, [propertyContext])

  const handleButtonClick = () => {
    console.log("Floating button clicked")
    setIsOpen(true)
  }

  const handleCloseClick = () => {
    console.log("Close button clicked")
    setIsOpen(false)
  }

  return (
    <>
      {user && (
        <>
          {/* Standalone button outside of Drawer.Root */}
          <Button
            className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
            size="icon"
            variant="default"
            onClick={handleButtonClick}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>

          <Drawer.Root
            open={isOpen}
            onOpenChange={(open) => {
              console.log("Drawer onOpenChange called with:", open)
              setIsOpen(open)
            }}
          >
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/40" />
              <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[75%] mt-24 fixed bottom-0 left-0 right-0 z-50">
                <div className="p-4 bg-background rounded-t-[10px] flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
                        <MessageSquare className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold">RealPal Assistent</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleCloseClick}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 flex-1 overflow-hidden">
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
