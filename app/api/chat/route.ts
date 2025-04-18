import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30 // 30 seconds max duration

export async function POST(req: Request) {
  try {
    const { messages, systemMessage } = await req.json()

    // Create a system message if provided
    const finalMessages = systemMessage ? [{ role: "system", content: systemMessage }, ...messages] : messages

    // Use the AI SDK to stream the response
    const result = streamText({
      model: openai.responses("gpt-4o"),
      messages: finalMessages,
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: "high",
        }),
      },
    })

    // Return the streamed response
    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}
