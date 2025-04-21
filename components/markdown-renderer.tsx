"use client"

import type React from "react"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeExternalLinks from "rehype-external-links"
import { CodeBlock } from "./code-block"

// Add a custom renderer for property links that includes thumbnails
// This will detect property links in the assistant's messages and render them with thumbnails

//1. Import the necessary hooks and components at the top of the file:
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ExternalLink } from "lucide-react"

interface MarkdownRendererProps {
  content: string
}

//2. Add a new component for property link rendering:
// Property Link component with thumbnail
const PropertyLinkRenderer = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProperty = async () => {
      // Check if this is a property link (contains /property/ in the URL)
      if (!href.includes("/property/")) {
        setLoading(false)
        return
      }

      // Extract property ID from URL
      const propertyId = href.split("/property/")[1].split("/")[0]
      if (!propertyId) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.from("saved_properties").select("*").eq("id", propertyId).single()

        if (error) throw error
        setProperty(data)
      } catch (error) {
        console.error("Error fetching property:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [href])

  // If not a property link or still loading, render as normal link
  if (!href.includes("/property/") || loading) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {children}
      </a>
    )
  }

  // If property not found, render as normal link
  if (!property) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {children}
      </a>
    )
  }

  // Render property card with thumbnail
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block my-2 no-underline">
      <div className="flex items-start gap-3 p-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 relative rounded-md overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0] || "/placeholder.svg"}
              alt={property.title || "Property image"}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">No image</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-blue-600 hover:underline line-clamp-1">{property.title || "Property"}</div>
          <div className="text-sm text-gray-600 line-clamp-1">{property.location || "Unknown location"}</div>
          <div className="text-sm font-medium">{property.price || "Price not available"}</div>
        </div>
        <ExternalLink className="flex-shrink-0 h-4 w-4 text-gray-400" />
      </div>
    </a>
  )
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  //3. Update the components object in the MarkdownRenderer to use the custom renderer for links:
  const components = {
    // Keep existing components
    a: ({ node, ...props }) => (
      <a
        {...props}
        className="text-blue-600 hover:underline break-words"
        target={props.href?.startsWith("/") ? "_self" : "_blank"}
        rel="noopener noreferrer"
      />
    ),
    // Update the a (anchor) component to use our custom renderer
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => {
      if (!href) return <span>{children}</span>

      // Use our custom renderer for property links
      return <PropertyLinkRenderer href={href}>{children}</PropertyLinkRenderer>
    },
    p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
    ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
    ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
    li: ({ node, ...props }) => <li {...props} className="mb-1" />,
    img: ({ node, ...props }) => <img {...props} className="rounded-md max-w-full my-2" alt={props.alt || "Image"} />,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "")
      return !inline && match ? (
        <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} {...props} />
      ) : (
        <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
          {children}
        </code>
      )
    },
  }
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
