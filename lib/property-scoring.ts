import type { PropertyFeature } from "@/actions/property-requirements"

export interface PropertyMatchResult {
  score: number
  maxScore: number
  percentage: number
  matches: Record<string, { matched: boolean; importance: number; featureLabel: string }>
}

// Calculate how well a property matches user requirements
export function calculatePropertyMatchScore(
  propertyFeatures: Record<string, any>,
  userPreferences: Record<string, { value: any; importance: number }>,
  featureDefinitions: PropertyFeature[],
): PropertyMatchResult {
  console.log("Starting property match score calculation")
  console.log("Property features:", propertyFeatures)
  console.log("User preferences:", userPreferences)

  let totalScore = 0
  let maxPossibleScore = 0
  const matches: Record<string, { matched: boolean; importance: number; featureLabel: string }> = {}

  // Process each requirement
  Object.entries(userPreferences).forEach(([featureId, { value, importance }]) => {
    const feature = featureDefinitions.find((f) => f.id === featureId)
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
    maxPossibleScore += featureWeight

    let matched = false
    let matchScore = 0
    const propertyValue = propertyFeatures[featureId]

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
    totalScore += matchScore

    // Record match details
    matches[featureId] = {
      matched,
      importance,
      featureLabel: feature.label,
    }
  })

  const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100

  console.log("Match calculation complete:")
  console.log(`Total score: ${totalScore}/${maxPossibleScore} = ${percentage}%`)
  console.log("Matches:", matches)

  return {
    score: totalScore,
    maxScore: maxPossibleScore,
    percentage,
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
