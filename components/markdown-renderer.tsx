"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeExternalLinks from "rehype-external-links"
import { CodeBlock } from "./code-block"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }]]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:underline break-words"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
          li: ({ node, ...props }) => <li {...props} className="mb-1" />,
          img: ({ node, ...props }) => (
            <img {...props} className="rounded-md max-w-full my-2" alt={props.alt || "Image"} />
          ),
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
