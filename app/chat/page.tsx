"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ProtectedRoute } from "@/components/protected-route"
import ChatInterface from "@/components/chat-interface"
import ChatInputForm from "@/components/chat-input-form"
import { getAssistantSystemPrompt } from "@/lib/ai-assistant-prompt"
import { useAuth } from "@/contexts/auth-context"
import { useChat } from "@/contexts/chat-context"
import { useChat as useVercelChat } from "ai/react"
import { fetchUserContext, formatUserContextForPrompt } from "@/lib/user-context-fetcher"
import { supabase } from "@/lib/supabaseClient"
import "../chat.css"

export default function ChatPage() {
  const { user } = useAuth()
  const [userContextString, setUserContextString] = useState<string>("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [files, setFiles] = useState<FileList | undefined>(undefined)
  const [processingUrl, setProcessingUrl] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Use global chat context
  const { messages: globalMessages, setMessages: setGlobalMessages, threadId, setThreadId } = useChat()

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
    // Set initial viewport height for mobile devices
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set it initially
    setVh();

    // Update on resize, orientation change, and keyboard appearance
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // Create the system message with user context
  const systemMessage = getAssistantSystemPrompt(undefined, userContextString)

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
        console.log("Crawler response:", data);

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

  const { input, handleInputChange, handleSubmit, isLoading, error } = useVercelChat({
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
  })
  
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

  // Handle form submission specifically for this page
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
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col">
        {/* Header with animation */}
        <motion.div 
          className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3.5 border-b border-blue-200 shadow-sm flex-shrink-0"
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
        
        {/* Chat interface component for displaying messages */}
        <div className="flex-1 relative">
          <ChatInterface
            initialSystemMessage={systemMessage}
            initialWelcomeMessage="Hej! Jag är RealPal, din fastighetsassistent. Hur kan jag hjälpa dig idag?"
            userContext={userContextString}
          />
        </div>
        
        {/* Input form as a separate component */}
        <ChatInputForm
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleFormSubmit}
          handlePropertyQuery={handlePropertyQuery}
          isLoading={isLoading}
          isLoadingContext={isLoadingContext}
          processingUrl={processingUrl}
          processingError={processingError}
          setProcessingError={setProcessingError}
          systemMessage={systemMessage}
          threadId={threadId}
          files={files}
          setFiles={setFiles}
        />
      </div>
    </ProtectedRoute>
  )
}