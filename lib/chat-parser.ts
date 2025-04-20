import React from "react"
export function parseMessage(message: string): React.ReactNode {
  // Basic Markdown parsing for now:
  // - Bold text: **bold text**
  // - Italic text: *italic text*
  // - Links: [link text](url)
  // - Line breaks: \n

  const parsedMessage = message
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]$$(.*?)$$/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
    .replace(/\n/g, "<br />")

  return React.createElement("div", { dangerouslySetInnerHTML: { __html: parsedMessage } })
}
