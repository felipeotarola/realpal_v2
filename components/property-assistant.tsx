"use client"

import { useEffect, useState } from "react"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { useAuth } from "@/contexts/auth-context"
// Import the BrokerInfoCard component
import { BrokerInfoCard } from "@/components/broker-info-card"

interface PropertyData {
  id: string
  title: string
  price: string
  size: string
  rooms: string
  location: string
  description: string
  features: string[]
  year_built?: string
  monthly_fee?: string
  energy_rating?: string
  is_analyzed: boolean
  analysis?: any // TODO: Define the type for analysis
}

export function PropertyAssistant({
  property,
  propertyId,
}: {
  property?: PropertyData
  propertyId?: string
}) {
  const { user } = useAuth()
  const [propertyContext, setPropertyContext] = useState<string>("")

  useEffect(() => {
    // Skapa fastighetskontext om property finns
    if (property) {
      const context = `
Fastighet: ${property.title}
ID: ${property.id}
Pris: ${property.price}
Storlek: ${property.size}
Rum: ${property.rooms}
Plats: ${property.location}
Byggår: ${property.year_built || "Okänt"}
Månadsavgift: ${property.monthly_fee || "Ingen avgift"}
Energiklass: ${property.energy_rating || "Okänd"}
Egenskaper: ${property.features.join(", ")}
Beskrivning: ${property.description.substring(0, 300)}...
      `.trim()

      setPropertyContext(context)
    }
    // Om bara propertyId finns, skapa en enklare kontext
    else if (propertyId) {
      setPropertyContext(`Du tittar på fastigheten med ID: ${propertyId}`)
    }
  }, [property, propertyId])

  const analysis = property?.analysis

  return (
    <>
      <AIChatAssistant propertyContext={propertyContext} />
      {/* Broker Information */}
      {analysis?.brokerInfo &&
        analysis?.brokerInfo?.searchResults &&
        analysis?.brokerInfo?.searchResults?.length > 0 && (
          <BrokerInfoCard brokerName={analysis.brokerInfo.name} searchResults={analysis.brokerInfo.searchResults} />
        )}
    </>
  )
}
