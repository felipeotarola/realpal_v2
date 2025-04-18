import type { PropertyFeature } from "@/actions/property-requirements"

export interface PropertyMatchResult {
  score: number
  maxScore: number
  percentage: number
  matches: Record<string, { matched: boolean; importance: number; featureLabel: string }>
}

// Calculate how well a property matches user requirements
export function calculatePropertyMatchScore(
  property: Record<string, any>,
  requirements: Record<string, { value: any; importance: number }>,
  features: PropertyFeature[],
): PropertyMatchResult {
  let score = 0
  let maxScore = 0
  const matches: Record<string, { matched: boolean; importance: number; featureLabel: string }> = {}

  // Process each requirement
  Object.entries(requirements).forEach(([featureId, { value, importance }]) => {
    const feature = features.find((f) => f.id === featureId)
    if (!feature) return

    // Skip if importance is 0 (not important)
    if (importance === 0) {
      matches[featureId] = {
        matched: true,
        importance,
        featureLabel: feature.label,
      }
      return
    }

    // Add to max possible score
    const featureWeight = importance * 10
    maxScore += featureWeight

    let matched = false
    let matchScore = 0
    const propertyValue = property[featureId]

    // Calculate match based on feature type
    if (feature.type === "boolean") {
      matched = propertyValue === value
      matchScore = matched ? featureWeight : 0
    } else if (feature.type === "number") {
      // For numbers, calculate partial match based on proximity
      const diff = Math.abs(propertyValue - value)
      const range = (feature.max_value || 100) - (feature.min_value || 0)
      const normalizedDiff = Math.min(diff / (range * 0.5), 1)
      const matchPercentage = 1 - normalizedDiff

      matchScore = featureWeight * matchPercentage
      matched = matchPercentage > 0.7 // Consider it a match if at least 70% similar
    } else if (feature.type === "select") {
      matched = propertyValue === value
      matchScore = matched ? featureWeight : 0
    }

    // Add to total score
    score += matchScore

    // Record match details
    matches[featureId] = {
      matched,
      importance,
      featureLabel: feature.label,
    }
  })

  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 100,
    matches,
  }
}

// Get a text description of the match quality
export function getMatchQualityDescription(percentage: number): string {
  if (percentage >= 90) return "Perfekt matchning"
  if (percentage >= 80) return "Utmärkt matchning"
  if (percentage >= 70) return "Mycket bra matchning"
  if (percentage >= 60) return "Bra matchning"
  if (percentage >= 50) return "Acceptabel matchning"
  if (percentage >= 40) return "Mindre bra matchning"
  if (percentage >= 30) return "Dålig matchning"
  return "Mycket dålig matchning"
}
