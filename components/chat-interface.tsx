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
import { AnimatePresence, motion } from "framer-motion" // Add framer-motion import
import { supabase } from "@/lib/supabaseClient"

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [processingUrl, setProcessingUrl] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Use global chat context
  const { messages: globalMessages, setMessages: setGlobalMessages, threadId, setThreadId } = useChat()

  // Function to detect and process property URLs
  const detectAndProcessPropertyUrl = async (inputText: string): Promise<boolean> => {
    // Check if the input contains a property URL (Hemnet, Booli, or Bonava)
    const propertyUrlRegex = /https?:\/\/(?:www\.)?(?:hemnet\.se|booli\.se|bonava\.se)\/[^\s]+/i;
    const match = inputText.match(propertyUrlRegex);
    
    if (match) {
      const propertyUrl = match[0];
      setProcessingUrl(true);
      setProcessingError(null);
      
      try {
        // Call our crawler API with the detected URL
        const response = await fetch("/api/crawler", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: propertyUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Kunde inte hämta fastighetsdetaljer");
        }

        const data = await response.json();
        console.log("Crawler response from assistant:", data);

        // Add user message with URL
        const userMessage = {
          id: Date.now().toString(),
          role: "user" as const,
          content: inputText,
        };

        // Add assistant message with property information
        const propertyInfo = data.property;
        const assistantResponse = `Jag har analyserat fastigheten åt dig:

**${propertyInfo.title}**
- Pris: ${propertyInfo.price}
- Storlek: ${propertyInfo.size}
- Rum: ${propertyInfo.rooms}
- Plats: ${propertyInfo.location}
${propertyInfo.yearBuilt ? `- Byggår: ${propertyInfo.yearBuilt}\n` : ''}
${propertyInfo.monthlyFee ? `- Månadsavgift: ${propertyInfo.monthlyFee}\n` : ''}

${propertyInfo.description.substring(0, 150)}${propertyInfo.description.length > 150 ? '...' : ''}

Jag har sparat fastigheten. Du kan se den under "Sparade fastigheter". Vill du veta något specifikt om denna fastighet?`;

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: assistantResponse,
        };

        // Update messages
        setGlobalMessages((current) => [...current, userMessage, assistantMessage]);

        // Save property to database
        await savePropertyToDatabase(data);

        return true;
      } catch (err) {
        console.error("Error processing property URL:", err);
        setProcessingError(err instanceof Error ? err.message : "Kunde inte hämta fastighetsdetaljer");
        return false;
      } finally {
        setProcessingUrl(false);
      }
    }
    
    return false;
  };

  // Function to save property data to database
  const savePropertyToDatabase = async (data: any) => {
    if (!user) return;
    
    try {
      const propertyData = data.property;
      console.log("Saving property data to database:", propertyData);
      
      // Add to saved_properties table
      const { data: savedProperty, error } = await supabase
        .from("saved_properties")
        .insert({
          user_id: user.id,
          title: propertyData.title,
          price: propertyData.price,
          location: propertyData.location,
          description: propertyData.description,
          size: propertyData.size,
          rooms: propertyData.rooms,
          url: propertyData.url,
          images: propertyData.images || [],
          features: propertyData.features || [],
          year_built: propertyData.yearBuilt || null,
          monthly_fee: propertyData.monthlyFee || null,
          energy_rating: propertyData.energyRating || null,
          agent: propertyData.agent || null,
          metadata: data.metadata || {},
        })
        .select("id")
        .single();

      if (error) throw error;
      
      console.log("Property saved with ID:", savedProperty.id);
      
    } catch (error) {
      console.error("Error saving property to database:", error);
    }
  };

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
  useEffect(() => {
    // every time messages list changes *and* we're not streaming
    if (!isLoading) {
      // give React/Markdown a tick to finish mounting
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [globalMessages.length, isLoading])

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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Don't proceed if no input and no files
    if (!input.trim() && (!files || files.length === 0)) return

    // First, check if the input contains a property URL that needs processing
    if (input.trim()) {
      const isPropertyUrl = await detectAndProcessPropertyUrl(input);
      
      // If we processed a property URL, don't continue with regular chat submission
      if (isPropertyUrl) {
        // Clear the input field
        handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
        return;
      }
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

  // Bubble animation variants for framer motion
  const bubbleVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: 10
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        type: "spring",
        damping: 25,
        stiffness: 500
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.2 
      } 
    }
  }

  // Typing indicator animation variants
  const typingVariants = {
    initial: {
      opacity: 0.5,
      y: 0
    },
    animate: {
      opacity: 1,
      y: [0, -4, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatType: "loop" as const
      }
    }
  }


  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div 
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 property-chat-container chat-content overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence>
          {globalMessages.map((message) => (
            <motion.div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} items-start`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={bubbleVariants}
              layout
            >
              {message.role === "assistant" && (
                <div className="flex flex-col items-center mr-2 sm:mr-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-blue-600 mt-1">AI</span>
                </div>
              )}

              <div className="flex flex-col max-w-[75%] sm:max-w-[70%]">
                <motion.div
                  className={`rounded-2xl p-3 sm:p-4 text-sm shadow-sm ${
                    message.role === "user" 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                      : "bg-white border border-gray-100 text-gray-800"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ 
                    borderTopRightRadius: message.role === "user" ? "4px" : "16px",
                    borderTopLeftRadius: message.role === "assistant" ? "4px" : "16px",
                  }}
                >
                  {message.role === "user" ? (
                    <div>
                      <p className="leading-relaxed tracking-wide text-sm">{message.content}</p>

                      {/* Display attachments for user messages */}
                      {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.experimental_attachments.map((attachment, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              {attachment.contentType?.startsWith("image/") ? (
                                <div className="rounded-lg overflow-hidden border border-white/30 mt-2 bg-white/20">
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
                                  <span className="text-xs">{attachment.name || `File ${idx + 1}`}</span>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm chat-message">
                      <MarkdownRenderer content={message.content} />
                    </div>
                  )}
                </motion.div>
                <div
                  className={`text-[10px] sm:text-xs text-gray-500 mt-1 px-1 ${message.role === "user" ? "text-right" : "text-left"}`}
                >
                  {formatMessageTime(messageTimes[message.id])}
                </div>
              </div>

              {message.role === "user" && (
                <div className="flex flex-col items-center ml-2 sm:ml-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-blue-600 mt-1">Du</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            className="flex justify-start items-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center mr-2 sm:mr-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-blue-600 mt-1">AI</span>
            </div>
            <div className="flex flex-col max-w-[75%] sm:max-w-[70%]">
              <div 
                className="max-w-full rounded-2xl rounded-tl-sm p-4 sm:p-5 bg-white border border-gray-100 text-gray-800 shadow-sm"
              >
                <div className="flex space-x-2">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-blue-500"
                    variants={typingVariants}
                    initial="initial"
                    animate="animate"
                    style={{ animationDelay: "0ms" }}
                  ></motion.div>
                  <motion.div
                    className="w-2 h-2 rounded-full bg-blue-500"
                    variants={typingVariants}
                    initial="initial"
                    animate="animate"
                    style={{ animationDelay: "300ms" }}
                  ></motion.div>
                  <motion.div
                    className="w-2 h-2 rounded-full bg-blue-500"
                    variants={typingVariants}
                    initial="initial"
                    animate="animate"
                    style={{ animationDelay: "600ms" }}
                  ></motion.div>
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-1 px-1">Just nu</div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 bg-red-100 text-red-800 text-sm border border-red-200 shadow-sm">
              Ett fel uppstod. Försök igen senare.
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Processing URL indicator */}
      {processingUrl && (
        <motion.div 
          className="fixed bottom-[180px] left-0 right-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="flex items-center gap-3 py-3 px-5 bg-blue-50 text-blue-700 rounded-full shadow-md border border-blue-100"
            initial={{ y: 10 }}
            animate={{ y: 0 }}
          >
            <motion.div 
              className="w-3 h-3 bg-blue-500 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-sm font-medium">Analyserar fastigheten.</span>
          </motion.div>
        </motion.div>
      )}

      {/* Error processing URL indicator */}
      {processingError && (
        <motion.div 
          className="fixed bottom-[180px] left-0 right-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="flex items-center gap-3 py-3 px-5 bg-red-50 text-red-700 rounded-full shadow-md border border-red-100"
            initial={{ y: 10 }}
            animate={{ y: 0 }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm font-medium">{processingError}</span>
            <button 
              onClick={() => setProcessingError(null)} 
              className="ml-2 p-1 hover:bg-red-100 rounded-full"
            >
              <X size={14} />
            </button>
          </motion.div>
        </motion.div>
      )}

      <div className="sticky bottom-0 left-0 w-full bg-white bg-opacity-95 backdrop-blur-sm border-t border-gray-200 p-2 sm:p-3 chat-footer">
        {/* File preview */}
        {files && files.length > 0 && (
          <motion.div 
            className="mb-2 sm:mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative inline-block">
              <div className="rounded-lg overflow-hidden border shadow-sm">
                {files[0].type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(files[0]) || "/placeholder.svg"}
                    alt={`File preview`}
                    className="max-h-28 sm:max-h-36 object-contain"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-2 border rounded-md bg-white">
                    <FileIcon className="h-4 w-4" />
                    <span className="text-xs truncate max-w-[100px] sm:max-w-[150px]">{files[0].name}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearFiles}
                className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full p-1 shadow-md hover:bg-gray-100 border transition-colors"
                aria-label="Ta bort fil"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-lg border bg-white text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex-shrink-0"
            aria-label="Ladda upp bild"
            disabled={isLoading || isLoadingContext || processingUrl}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={isLoading || isLoadingContext || processingUrl}
          />
          <Input
            ref={inputRef}
            autoFocus={true}
            value={input}
            onChange={handleInputChange}
            placeholder={processingUrl ? "Analyserar Hemnet-länk..." : (files && files.length > 0 ? "Fråga om denna bild..." : "Skriv ett meddelande eller klistra in en Hemnet-länk...")}
            disabled={isLoading || isLoadingContext || processingUrl}
            className="flex-1 h-11 text-sm rounded-lg bg-white shadow-sm border-gray-200"
          />
          <Button
            type="submit"
            disabled={isLoading || isLoadingContext || processingUrl || (!input.trim() && !files?.length)}
            className="h-11 px-3.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all flex-shrink-0"
          >
            {isLoading || processingUrl ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
          </Button>
        </div>

        {/* Add quick action buttons for property-related queries */}
        <div className="flex flex-wrap gap-2 mt-3">
          <motion.button
            type="button"
            onClick={() => handlePropertyQuery("Visa mina sparade fastigheter")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs sm:text-sm bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-3 py-1 rounded-full hover:from-blue-100 hover:to-blue-200 transition-colors border border-blue-200 shadow-sm"
            disabled={isLoading || isLoadingContext || processingUrl}
          >
            Visa sparade fastigheter
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handlePropertyQuery("Vilka är mina preferenser?")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs sm:text-sm bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-3 py-1 rounded-full hover:from-blue-100 hover:to-blue-200 transition-colors border border-blue-200 shadow-sm"
            disabled={isLoading || isLoadingContext || processingUrl}
          >
            Visa preferenser
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handlePropertyQuery("Vilken fastighet passar mig bäst?")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs sm:text-sm bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-3 py-1 rounded-full hover:from-blue-100 hover:to-blue-200 transition-colors border border-blue-200 shadow-sm"
            disabled={isLoading || isLoadingContext || processingUrl}
          >
            Rekommendation
          </motion.button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2">
          Tips: Ladda upp bilder eller klistra in en Hemnet-länk för att analysera fastigheter
        </p>
      </div>

      {isLoadingContext && (
        <motion.div 
          className="text-xs text-center text-blue-500 py-2 fixed bottom-[180px] left-0 right-0 bg-white/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            Laddar din information...
          </div>
        </motion.div>
      )}
    </div>
  )
}
