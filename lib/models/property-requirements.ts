export interface PropertyRequirement {
  id: string
  userId: string
  featureId: string
  value: any
  importance: number
  createdAt: string
  updatedAt: string
  locationAddress?: string // Add location address
  locationLatitude?: number // Add location latitude
  locationLongitude?: number // Add location longitude
}

export interface PropertyFeature {
  id: string
  label: string
  type: "number" | "boolean" | "select" | "location" // Add location type
  options?: string[]
  min?: number
  max?: number
}

export interface PropertyRequirementWithFeature extends PropertyRequirement {
  feature: PropertyFeature
}

// This will be used to calculate a match score between a property and user requirements
export function calculateMatchScore(
  property: Record<string, any>,
  requirements: PropertyRequirement[],
  features: PropertyFeature[],
): {
  score: number
  maxScore: number
  percentage: number
  matches: Record<string, { matched: boolean; importance: number }>
} {
  let score = 0
  let maxScore = 0
  const matches: Record<string, { matched: boolean; importance: number }> = {}

  requirements.forEach((req) => {
    const feature = features.find((f) => f.id === req.featureId)
    if (!feature) return

    const importanceWeight = req.importance
    maxScore += importanceWeight * 10

    // Skip if importance is 0 (not important)
    if (importanceWeight === 0) {
      matches[req.featureId] = { matched: true, importance: req.importance }
      return
    }

    let matched = false
    const propertyValue = property[req.featureId]

    if (feature.type === "boolean") {
      matched = propertyValue === req.value
    } else if (feature.type === "number") {
      // For numbers, we give partial credit based on how close the values are
      const diff = Math.abs(propertyValue - req.value)
      const range = (feature.max || 100) - (feature.min || 0)
      const normalizedDiff = Math.min(diff / (range * 0.5), 1)
      const matchPercentage = 1 - normalizedDiff
      score += importanceWeight * 10 * matchPercentage
      matches[req.featureId] = { matched: matchPercentage > 0.7, importance: req.importance }
      return
    } else if (feature.type === "select") {
      matched = propertyValue === req.value
    } else if (feature.type === "location") {
      // Implement location matching logic here
      // This could involve calculating the distance between the property's location and the user's preferred location
      // and giving a score based on the distance
      // For simplicity, we'll just consider it a match if the property is in the same city
      // This will require you to have city information for both the property and the user's preference
      // You'll also need to implement the logic to fetch the city information
      // For now, we'll just set matched to false
      matched = false
    }

    if (matched) {
      score += importanceWeight * 10
    }

    matches[req.featureId] = { matched, importance: req.importance }
  })

  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? (score / maxScore) * 100 : 100,
    matches,
  }
}
