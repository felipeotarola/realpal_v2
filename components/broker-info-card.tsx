import { ExternalLink } from "lucide-react"
import Link from "next/link"

interface BrokerInfoCardProps {
  brokerName: string
  searchResults: any[]
  isFallback?: boolean
}

export function BrokerInfoCard({ brokerName, searchResults, isFallback }: BrokerInfoCardProps) {
  // Filter out results that don't seem relevant to real estate
  const relevantResults = searchResults.filter((result) => {
    const lowerTitle = result.title.toLowerCase()
    const lowerContent = result.content.toLowerCase()

    // Check if the broker name appears in the title or content
    const nameInResult = brokerName
      .split(" ")
      .some((namePart) => lowerTitle.includes(namePart.toLowerCase()) || lowerContent.includes(namePart.toLowerCase()))

    // Check if it's related to real estate
    const realEstateTerms = ["mäklare", "fastighet", "bostad", "hus", "lägenhet", "real estate", "broker", "agent"]
    const isRealEstateRelated = realEstateTerms.some((term) => lowerTitle.includes(term) || lowerContent.includes(term))

    return nameInResult || isRealEstateRelated
  })

  if (relevantResults.length === 0) {
    return <div className="mt-2 text-sm text-gray-500">Ingen ytterligare information hittad om denna mäklare.</div>
  }

  // Extract the most relevant information
  const brokerInfo = {
    company: extractCompany(relevantResults, brokerName),
    experience: extractExperience(relevantResults),
    specialties: extractSpecialties(relevantResults),
    contact: extractContactInfo(relevantResults),
  }

  return (
    <div className="mt-2">
      {isFallback && (
        <div className="text-xs text-amber-600 mb-2">
          Obs: Informationen nedan kan vara för en annan mäklare med samma efternamn.
        </div>
      )}

      <div className="space-y-2 text-sm">
        {brokerInfo.company && (
          <div>
            <span className="font-medium">Företag:</span> {brokerInfo.company}
          </div>
        )}

        {brokerInfo.experience && (
          <div>
            <span className="font-medium">Erfarenhet:</span> {brokerInfo.experience}
          </div>
        )}

        {brokerInfo.specialties && (
          <div>
            <span className="font-medium">Specialiteter:</span> {brokerInfo.specialties}
          </div>
        )}

        {brokerInfo.contact && (
          <div>
            <span className="font-medium">Kontakt:</span> {brokerInfo.contact}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {relevantResults.slice(0, 3).map((result, index) => (
          <div key={index} className="text-xs">
            <Link
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center"
            >
              {truncateText(result.title, 60)}
              <ExternalLink className="h-3 w-3 ml-1 inline" />
            </Link>
            <p className="text-gray-500">{truncateText(result.content, 100)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper functions to extract information from search results
function extractCompany(results: any[], brokerName: string): string | null {
  // Common real estate companies in Sweden
  const companies = [
    "Mäklarhuset",
    "Svensk Fastighetsförmedling",
    "Fastighetsbyrån",
    "Länsförsäkringar Fastighetsförmedling",
    "HusmanHagberg",
    "Bjurfors",
    "SkandiaMäklarna",
    "ERA",
    "Notar",
    "Mäklarringen",
  ]

  for (const result of results) {
    const content = result.content.toLowerCase()
    const title = result.title.toLowerCase()

    // Check if any company name appears in the content or title
    for (const company of companies) {
      if (content.includes(company.toLowerCase()) || title.includes(company.toLowerCase())) {
        return company
      }
    }

    // Look for patterns like "[Name] at [Company]" or "[Name] från [Company]"
    const nameParts = brokerName.split(" ")
    const lastName = nameParts[nameParts.length - 1].toLowerCase()

    const atPattern = new RegExp(`${lastName}\\s+(at|på|från|hos|i)\\s+([A-Z][\\w\\s]+)`, "i")
    const match = content.match(atPattern) || title.match(atPattern)

    if (match && match[2]) {
      return match[2]
    }
  }

  return null
}

function extractExperience(results: any[]): string | null {
  const experiencePatterns = [
    /(\d+)\s+års?\s+erfarenhet/i,
    /erfarenhet\s+(\d+)\s+år/i,
    /arbetat\s+som\s+mäklare\s+i\s+(\d+)\s+år/i,
    /(\d+)\s+years?\s+of\s+experience/i,
  ]

  for (const result of results) {
    const content = result.content

    for (const pattern of experiencePatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        return `${match[1]} års erfarenhet`
      }
    }
  }

  return null
}

function extractSpecialties(results: any[]): string | null {
  const specialtyKeywords = [
    "specialist",
    "specialiserad",
    "fokuserar",
    "inriktad på",
    "expertis",
    "expert på",
    "specialitet",
  ]

  for (const result of results) {
    const content = result.content.toLowerCase()

    for (const keyword of specialtyKeywords) {
      const index = content.indexOf(keyword)
      if (index !== -1) {
        // Extract the sentence containing the keyword
        const start = content.lastIndexOf(".", index) + 1
        const end = content.indexOf(".", index)
        if (end !== -1) {
          const sentence = content.substring(start, end).trim()
          return sentence.charAt(0).toUpperCase() + sentence.slice(1)
        }
      }
    }
  }

  return null
}

function extractContactInfo(results: any[]): string | null {
  // Look for phone numbers or email addresses
  const phonePattern = /(\+?46|0)[\s-]?7[\s-]?[0-9][\s-]?[0-9]{7}|(\+?46|0)[\s-]?[1-9][\s-]?[0-9]{7}/g
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

  for (const result of results) {
    const content = result.content

    const phoneMatch = content.match(phonePattern)
    const emailMatch = content.match(emailPattern)

    if (phoneMatch || emailMatch) {
      let contactInfo = ""

      if (phoneMatch) {
        contactInfo += phoneMatch[0]
      }

      if (emailMatch) {
        if (contactInfo) contactInfo += ", "
        contactInfo += emailMatch[0]
      }

      return contactInfo
    }
  }

  return null
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}
