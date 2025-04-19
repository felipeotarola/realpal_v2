"use client"

import { useState, useEffect } from "react"
import { Drawer } from "vaul"
import { MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatInterface from "./chat-interface"

export function ChatDrawer() {
  const [isOpen, setIsOpen] = useState(false)

  // Add logging for state changes
  useEffect(() => {
    console.log("ChatDrawer state changed:", isOpen)
  }, [isOpen])

  const handleButtonClick = () => {
    console.log("Floating button clicked")
    setIsOpen(true)
  }

  const handleCloseClick = () => {
    console.log("Close button clicked")
    setIsOpen(false)
  }

  // Log on component mount
  useEffect(() => {
    console.log("ChatDrawer component mounted")

    // Check if Vaul is available
    console.log("Drawer component available:", typeof Drawer !== "undefined")
    console.log("Drawer.Root available:", typeof Drawer.Root !== "undefined")

    return () => {
      console.log("ChatDrawer component unmounted")
    }
  }, [])

  return (
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
          <Drawer.Title className="sr-only">AI Chatbot</Drawer.Title>
          <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[75%] mt-24 fixed bottom-0 left-0 right-0 z-50">
            <div className="p-4 bg-background rounded-t-[10px] flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
                    <MessageSquare className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold">AI Chatbot</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseClick}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex-1 overflow-hidden">
                <ChatInterface />
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
