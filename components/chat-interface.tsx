"use client"

import type React from "react"
import { useChat } from "@ai-sdk/react"
import { useRef, useState, useEffect } from "react"
import { Send, Bot, User, Loader2, ExternalLink, ImageIcon, X, FileIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeExternalLinks from "rehype-external-links"
import { CodeBlock } from "@/components/code-block"
import Image from "next/image"

// Helper function to format timestamps
function formatMessageTime(date: Date | undefined): string {
  if (!date) return "Just now"

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // If less than a minute ago, show "Just now"
  if (diff < 60000) {
    return "Just now"
  }

  // If less than an hour ago, show minutes
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }

  // If today, show time
  if (now.toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // If this year, show month and day
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // Otherwise show date
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
}

export default function ChatInterface() {
  const [files, setFiles] = useState<FileList | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [messageTimes, setMessageTimes] = useState<Record<string, Date>>({})

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, data } = useChat({
    id: "drawer-chat", // Use a unique ID for this chat instance
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [threadId, setThreadId] = useState<string | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Add timestamps for new messages - separate effect to avoid infinite loop
  useEffect(() => {
    // Only update if there are messages without timestamps
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
  }, [messages]) // Only depend on messages, not messageTimes

  // Store the threadId when we get it from the response
  useEffect(() => {
    if (data?.threadId && !threadId) {
      setThreadId(data.threadId)
    }
  }, [data, threadId])

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

    // Don't proceed if already loading
    if (isLoading) return

    // Don't proceed if no input and no files
    if (!input.trim() && (!files || files.length === 0)) return

    // Submit the chat with files if available
    handleSubmit(e, {
      experimental_attachments: files,
      options: {
        body: {
          threadId,
        },
      },
    })

    // Clear the files after sending
    clearFiles()
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary p-4">
                <Bot className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to the AI Chatbot</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Ask me anything! I can search the web and analyze images to provide you with information.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center text-sm">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground">
                <ImageIcon className="h-4 w-4" />
                <p>Upload an image to analyze it</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground">
                <ExternalLink className="h-4 w-4" />
                <p>Ask about anything on the web</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} items-start`}
              style={{
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
                animation: "fadeIn 0.3s ease-out forwards",
              }}
            >
              {message.role === "assistant" && (
                <div className="flex flex-col items-center mr-2">
                  <div className="assistant-avatar">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-primary mt-1">AI</span>
                </div>
              )}

              <div className="flex flex-col">
                <div
                  className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}
                >
                  <div className={message.role === "user" ? "space-y-2" : ""}>
                    {message.role === "user" ? (
                      <p className="leading-relaxed tracking-wide">{message.content}</p>
                    ) : (
                      <div className="prose dark:prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[[rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }]]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a
                                {...props}
                                className="text-primary hover:underline break-words"
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ),
                            p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                            li: ({ node, ...props }) => <li {...props} className="mb-1" />,
                            code: ({ node, inline, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || "")
                              return !inline && match ? (
                                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} {...props} />
                              ) : (
                                <code {...props} className="bg-muted px-1 py-0.5 rounded text-sm">
                                  {children}
                                </code>
                              )
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Attachments */}
                    {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.experimental_attachments.map((attachment, idx) => (
                          <div key={idx}>
                            {attachment.contentType?.startsWith("image/") ? (
                              <div className="rounded-md overflow-hidden border mt-2 bg-white/20">
                                <Image
                                  src={attachment.url || "/placeholder.svg"}
                                  width={300}
                                  height={200}
                                  alt={attachment.name || `Image ${idx + 1}`}
                                  className="object-contain"
                                />
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

                  {/* Sources */}
                  {message.role === "assistant" && data?.sources && data.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
                      <div className="grid gap-2">
                        {data.sources.map((source, index) => (
                          <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-2 mt-0.5 flex-shrink-0 text-primary" />
                            <div>
                              <p className="font-medium hover:underline break-words">
                                {source.title || new URL(source.url).hostname}
                              </p>
                              {source.title && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {new URL(source.url).hostname}
                                </p>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`message-timestamp ${message.role === "user" ? "text-right" : "text-left"}`}>
                  {formatMessageTime(messageTimes[message.id])}
                </div>
              </div>

              {message.role === "user" && (
                <div className="flex flex-col items-center ml-2">
                  <div className="user-avatar">
                    <User className="h-3.5 w-3.5 text-black" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 mt-1">You</span>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start items-start">
            <div className="flex flex-col items-center mr-2">
              <div className="assistant-avatar">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary mt-1">AI</span>
            </div>
            <div className="flex flex-col">
              <div className="chat-bubble chat-bubble-assistant">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
              <div className="message-timestamp text-left">Just now</div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 p-4 rounded-md text-destructive max-w-md">
              <p className="font-medium">Error: {error.message || "Something went wrong"}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-background">
        <form onSubmit={handleFormSubmit} className="space-y-3 max-w-4xl mx-auto">
          {/* File preview */}
          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(files).map((file, index) => (
                <div key={index} className="relative inline-block">
                  <div className="rounded-md overflow-hidden border">
                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file) || "/placeholder.svg"}
                        alt={`File ${index + 1}`}
                        className="max-h-32 object-contain"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-2 border rounded-md">
                        <FileIcon className="h-5 w-5" />
                        <span className="text-sm truncate max-w-[100px]">{file.name}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFiles}
                    className="absolute -top-2 -right-2 bg-background text-foreground rounded-full p-1 shadow-sm hover:bg-muted border"
                    aria-label="Remove files"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder={files && files.length > 0 ? "Ask about this file..." : "Ask me anything..."}
              className="flex-1 p-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-md border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              aria-label="Upload file"
              disabled={isLoading}
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && (!files || files.length === 0))}
              className="p-3 rounded-md bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">Tip: Upload images to analyze them (max 4MB)</p>
        </form>
      </div>
    </div>
  )
}
