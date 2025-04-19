"use client"

import { useState, useEffect } from "react"
import { MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatInterface from "./chat-interface"

export function SimpleChatDrawer() {
  const [isOpen, setIsOpen] = useState(false)

  // Add logging for state changes
  useEffect(() => {
    console.log("SimpleChatDrawer state changed:", isOpen)
  }, [isOpen])

  const handleOpenClick = () => {
    console.log("Simple drawer open button clicked")
    setIsOpen(true)
  }

  const handleCloseClick = () => {
    console.log("Simple drawer close button clicked")
    setIsOpen(false)
  }

  // Log on component mount
  useEffect(() => {
    console.log("SimpleChatDrawer component mounted")
    return () => {
      console.log("SimpleChatDrawer component unmounted")
    }
  }, [])

  return (
    <div>
      <Button onClick={handleOpenClick} variant="outline" className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Open Simple Drawer
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40" onClick={handleCloseClick} />

          {/* Drawer content */}
          <div className="bg-background flex flex-col rounded-t-[10px] h-[75%] fixed bottom-0 left-0 right-0 animate-in slide-in-from-bottom duration-300">
            <div className="p-4 bg-background rounded-t-[10px] flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
                    <MessageSquare className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold">Simple Chat Drawer</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseClick}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex-1 overflow-hidden">
                <ChatInterface />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
