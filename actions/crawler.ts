"use server"

export interface PropertyData {
  title: string
  price: string
  size: string
  rooms: string
  location: string
  description: string
  features: string[]
  images: string[]
  url: string
  agent?: string
  yearBuilt?: string
  monthlyFee?: string
  energyRating?: string
}

// Denna server action anropar nu vår API-route istället för att innehålla logiken själv
export async function crawlWebsite(url: string) {
  try {
    // Anropa vår nya API-route
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/crawler`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Kunde inte hämta fastighetsdetaljer")
    }

    return await response.json()
  } catch (error) {
    console.error("Error in crawlWebsite server action:", error)
    throw error
  }
}
