// MarkdownRenderer.tsx

import React, { useState, useEffect, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeExternalLinks from "rehype-external-links"
import { CodeBlock } from "./code-block"
import { supabase } from "@/lib/supabase"
import useSWR from "swr"
import { ExternalLink } from "lucide-react"

interface MarkdownRendererProps { content: string }

// A) Move this outside your component so its identity never changes:
const PropertyLinkRenderer = React.memo(
  ({ href, children }: { href: string; children: React.ReactNode }) => {
    // 2) we'll switch to SWR below, so no need for loading flags every re‑mount:
    const propertyId = href.split("/property/")[1]?.split("/")[0]
    const { data: property } = useSWR(
      // only fetch if it’s a property link
      href.includes("/property/") && propertyId ? `property-${propertyId}` : null,
      async () => {
        const { data, error } = await supabase
          .from("saved_properties")
          .select("*")
          .eq("id", propertyId)
          .single()
        if (error) throw error
        return data
      }
    )

    // if it wasn't a property link, or it failed—fall back to a normal anchor
    if (!href.includes("/property/") || !property) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {children}
        </a>
      )
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block my-2 no-underline">
        <div className="flex items-start gap-3 p-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
          {property.images?.[0] ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="object-cover w-20 h-20 rounded-md"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-200 flex items-center justify-center rounded-md">
              <span className="text-xs text-gray-500">No image</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-blue-600 line-clamp-1">{property.title}</div>
            <div className="text-sm text-gray-600 line-clamp-1">{property.location}</div>
            <div className="text-sm font-medium">{property.price}</div>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </div>
      </a>
    )
  }
)

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // B) Memoize the components map so its reference never changes:
  const components = useMemo(
    () => ({
      a: ({ href, children }: { href?: string; children: React.ReactNode }) =>
        href ? <PropertyLinkRenderer href={href}>{children}</PropertyLinkRenderer> : <>{children}</>,
      p: (props: any) => <p {...props} className="mb-2 last:mb-0" />,
      ul: (props: any) => <ul {...props} className="list-disc pl-4 mb-2" />,
      ol: (props: any) => <ol {...props} className="list-decimal pl-4 mb-2" />,
      li: (props: any) => <li {...props} className="mb-1" />,
      img: (props: any) => <img {...props} className="rounded-md max-w-full my-2" />,
      code: ({ inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || "")
        return !inline && match ? (
          <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} {...props} />
        ) : (
          <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
            {children}
          </code>
        )
      },
    }),
    []
  )

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
})
