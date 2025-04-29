"use client"

import React, { useRef, useState, FormEvent, ChangeEvent } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, X, FileIcon, ImageIcon } from "lucide-react"

interface ChatInputFormProps {
  input: string
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>, options?: any) => void
  handlePropertyQuery: (query: string) => void
  isLoading: boolean
  isLoadingContext: boolean
  processingUrl: boolean
  processingError: string | null
  setProcessingError: (error: string | null) => void
  systemMessage: string
  threadId: string | null
  files?: FileList
  setFiles: (files: FileList | undefined) => void
}

export default function ChatInputForm({
  input,
  handleInputChange,
  handleSubmit,
  handlePropertyQuery,
  isLoading,
  isLoadingContext,
  processingUrl,
  processingError,
  setProcessingError,
  systemMessage,
  threadId,
  files,
  setFiles,
}: ChatInputFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

    // Submit the chat with files if available
    handleSubmit(e, {
      experimental_attachments: files,
      options: {
        body: {
          threadId,
          systemMessage: systemMessage,
        },
      },
    })

    // Clear the files after sending
    clearFiles()
  }

  return (
    <>
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
            <span className="text-sm font-medium">Analyserar fastighet.</span>
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

      <form onSubmit={handleFormSubmit} 
        className="chat-footer fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-top"
      >
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
            placeholder={processingUrl ? "Analyserar fastighetslänk..." : (files && files.length > 0 ? "Fråga om denna bild..." : "Skriv ett meddelande eller klistra in en Hemnet, Booli eller Bonava-länk...")}
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
      </form>

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
    </>
  )
}