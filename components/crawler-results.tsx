"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, AlertTriangle, ImageIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ImageGallery } from "./image-gallery"

interface CrawlerResultsProps {
  results: {
    url: string
    title: string
    content: string
    html: string
    images?: string[]
    screenshot?: string
    imageAnalysis?: string
    contentSummary?: string
    metadata: {
      crawledAt: string
      method?: string
      note?: string
    }
  }
}

export function CrawlerResults({ results }: CrawlerResultsProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const isAIAnalysisOnly = results.metadata.method === "ai-analysis-only"
  const hasImages = results.images && results.images.length > 0
  const images = results.images || []

  return (
    <div className="space-y-6">
      {isAIAnalysisOnly && (
        <Alert variant="warning" className="border-0 shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            {results.metadata.note || "This website blocked our crawler. The analysis is based on AI prediction only."}
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle>Crawl Results</CardTitle>
          <CardDescription>
            Crawled at {new Date(results.metadata.crawledAt).toLocaleString()}
            {results.metadata.method && ` • Method: ${results.metadata.method}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Page Title</h3>
              <p className="text-gray-700">{results.title}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium">URL</h3>
              <p className="text-blue-600 hover:underline">
                <a href={results.url} target="_blank" rel="noopener noreferrer">
                  {results.url}
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.screenshot && (
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <img
                src={results.screenshot || "/placeholder.svg"}
                alt={`Screenshot of ${results.url}`}
                className="w-full h-auto"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary" className="mt-8">
        <TabsList className="grid grid-cols-4 w-full max-w-full overflow-x-auto">
          <TabsTrigger value="summary" className="min-w-[80px] text-xs sm:text-sm">
            AI Summary
          </TabsTrigger>
          <TabsTrigger value="content" className="min-w-[80px] text-xs sm:text-sm">
            Content
          </TabsTrigger>
          <TabsTrigger
            value="images"
            disabled={!hasImages}
            className={`min-w-[80px] text-xs sm:text-sm ${hasImages && images.length > 10 ? "font-semibold" : ""}`}
          >
            Images {hasImages && `(${results.images?.length})`}
          </TabsTrigger>
          <TabsTrigger value="analysis" className="min-w-[80px] text-xs sm:text-sm">
            Visual Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <Card className="shadow-md border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Content Summary</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(results.contentSummary || "", "summary")}
              >
                {copied === "summary" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied === "summary" ? "Copied" : "Copy"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {results.contentSummary ? (
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(results.contentSummary) }} />
                ) : (
                  <p>No summary available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <Card className="shadow-md border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Raw Content</CardTitle>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(results.content, "content")}>
                {copied === "content" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied === "content" ? "Copied" : "Copy"}
              </Button>
            </CardHeader>
            <CardContent>
              {isAIAnalysisOnly ? (
                <div className="bg-amber-50 p-4 rounded-md text-amber-800">
                  <p>Unable to fetch content due to website restrictions.</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                  <pre className="whitespace-pre-wrap text-sm">{results.content}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle>Images from Page</CardTitle>
              <CardDescription>
                {hasImages ? `Found ${results.images?.length} images on this page` : "No images found on this page"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasImages ? (
                <div>
                  <ImageGallery images={results.images || []} websiteUrl={results.url} />
                  {results.images && results.images.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Showing all {results.images.length} images from this property
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-md">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No images were found on this page.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <Card className="shadow-md border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Visual Analysis</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(results.imageAnalysis || "", "analysis")}
              >
                {copied === "analysis" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied === "analysis" ? "Copied" : "Copy"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {results.imageAnalysis ? (
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(results.imageAnalysis) }} />
                ) : (
                  <p>No visual analysis available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/!\[(.*?)\]$(.*?)$/gim, '<img alt="$1" src="$2" />')
    .replace(/\[(.*?)\]$(.*?)$/gim, '<a href="$2">$1</a>')
    .replace(/\n$/gim, "<br />")
    .replace(/^\s*\n/gm, "<br />")
    .replace(/^\s*(-|\*)\s(.*)/gim, "<ul><li>$2</li></ul>")
    .replace(/^\s*(\d+\.)\s(.*)/gim, "<ol><li>$2</li></ol>")
    .replace(/<\/ul>\s*<ul>/gim, "")
    .replace(/<\/ol>\s*<ol>/gim, "")
    .replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>")
}
