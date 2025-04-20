import { openai } from "@ai-sdk/openai"
import { streamText, type Message } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, systemMessage }: { messages: Message[]; systemMessage?: string } = await req.json()

    // If a system message is provided, add it to the beginning of the messages array
    let finalMessages = [...messages]

    if (systemMessage) {
      console.log(`System message provided (${systemMessage.length} chars)`)
      // Add the system message to the beginning of the array
      finalMessages = [{ role: "system", content: systemMessage }, ...messages]
    } else {
      console.log("No system message provided")
    }

    // Check if we have any image attachments
    const hasImageAttachments = messages.some((message) =>
      message.experimental_attachments?.some((attachment) => attachment?.contentType?.startsWith("image/")),
    )

    console.log("Processing chat request with images:", hasImageAttachments)
    console.log(`Total messages: ${finalMessages.length}`)

    // Use the OpenAI Responses API for all requests
    const result = streamText({
      model: openai.responses("gpt-4o"),
      messages: finalMessages,
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: "high",
        }),
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(
      JSON.stringify({
        error: "There was an error processing your request",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
