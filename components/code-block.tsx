"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

interface CodeBlockProps {
  language: string
  value: string
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {language && (
        <div className="absolute">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
        </div>
      )}
      <pre className={`language-${language} mt-6 p-4 rounded-md bg-muted text-foreground overflow-x-auto border`}>
        <code>{value}</code>
      </pre>
    </div>
  )
}
