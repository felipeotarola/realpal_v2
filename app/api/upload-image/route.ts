import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  console.log("Image upload API called")

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.error("No file provided in the request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Log file information for debugging
    console.log("Received file:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    })

    // Check file size (limit to 4MB)
    if (file.size > 4 * 1024 * 1024) {
      console.error("File too large:", file.size)
      return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 })
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type:", file.type)
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const mimeType = file.type
    const dataUrl = `data:${mimeType};base64,${base64}`

    console.log("Successfully converted file to data URL")
    console.log("Data URL length:", dataUrl.length)

    return NextResponse.json({ url: dataUrl })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
