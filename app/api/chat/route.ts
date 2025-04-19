import { openai } from "@ai-sdk/openai"
import { streamText, type Message } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json()

  // Check if we have any image attachments
  const hasImageAttachments = messages.some((message) =>
    message.experimental_attachments?.some((attachment) => attachment?.contentType?.startsWith("image/")),
  )

  console.log("Processing chat request with images:", hasImageAttachments)

  // Use the OpenAI Responses API for all requests
  const result = streamText({
    model: openai.responses("gpt-4o"),
    messages,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({
        searchContextSize: "high",
      }),
    },
  })

  return result.toDataStreamResponse()
}
