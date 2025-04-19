import { NextResponse } from "next/server"
import { searchBrokerInfo } from "@/lib/tavily-search"

export async function POST(request: Request) {
  try {
    const { brokerName, location } = await request.json()

    if (!brokerName) {
      return NextResponse.json({ error: "Broker name is required" }, { status: 400 })
    }

    console.log(`🔍 API: Searching for broker: "${brokerName}" in location: "${location || "not specified"}"`)

    const results = await searchBrokerInfo(brokerName, location)

    return NextResponse.json({
      success: true,
      brokerName,
      location,
      results,
    })
  } catch (error) {
    console.error("Error in broker-info API:", error)
    return NextResponse.json({ error: "Failed to search for broker information" }, { status: 500 })
  }
}
