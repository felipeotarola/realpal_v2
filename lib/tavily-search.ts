// Utility function to search for broker information using Tavily API
export async function searchBrokerInfo(brokerName: string, location?: string): Promise<any> {
  try {
    console.log(`🔍 Starting Tavily search for broker: "${brokerName}" in location: "${location || "unknown"}"`)

    // Construct a more effective search query
    const searchQuery = location
      ? `${brokerName} mäklare ${location} fastighetsmäklare omdöme recensioner`
      : `${brokerName} mäklare fastighetsmäklare omdöme recensioner`

    console.log(`🔍 Using search query: "${searchQuery}"`)

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: "advanced",
        include_domains: [
          "hemnet.se",
          "booli.se",
          "maklarstatistik.se",
          "hitta.se",
          "reco.se",
          "trustpilot.com",
          "linkedin.com",
          "facebook.com",
          "instagram.com",
          "allabolag.se",
          "ratsit.se",
        ],
        max_results: 10,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Tavily API error (${response.status}): ${errorText}`)
      return null
    }

    const data = await response.json()
    console.log(`✅ Tavily search completed with ${data.results?.length || 0} results`)

    // Log the first few results for debugging
    if (data.results && data.results.length > 0) {
      console.log("📊 First 3 results:")
      data.results.slice(0, 3).forEach((result: any, index: number) => {
        console.log(`  ${index + 1}. ${result.title} - ${result.url}`)
      })
    } else {
      console.log("❌ No results found")
    }

    return {
      results: data.results || [],
      searchQuery: searchQuery,
    }
  } catch (error) {
    console.error("❌ Error in searchBrokerInfo:", error)
    return null
  }
}
