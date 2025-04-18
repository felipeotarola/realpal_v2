"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  getPropertyFeatures,
  getUserPropertyRequirements,
  saveUserPropertyRequirements,
} from "@/actions/property-requirements"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define the importance levels
const importanceLevels = [
  { value: 0, label: "Inte viktigt", color: "bg-gray-200 text-gray-700" },
  { value: 1, label: "Trevligt att ha", color: "bg-blue-100 text-blue-700" },
  { value: 2, label: "Ganska viktigt", color: "bg-blue-200 text-blue-800" },
  { value: 3, label: "Mycket viktigt", color: "bg-blue-300 text-blue-900" },
  { value: 4, label: "Måste ha", color: "bg-blue-500 text-white" },
]

export function PropertyRequirementsForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [features, setFeatures] = useState<any[]>([])
  const [requirements, setRequirements] = useState<Record<string, { value: any; importance: number }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch property features and user requirements
  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        // Fetch property features
        const featuresData = await getPropertyFeatures()
        setFeatures(featuresData)

        // Initialize requirements with default values
        const defaultRequirements = featuresData.reduce(
          (acc, feature) => {
            acc[feature.id] = {
              value:
                feature.type === "number"
                  ? feature.min_value
                  : feature.type === "select"
                    ? feature.options
                      ? feature.options[0]
                      : ""
                    : false,
              importance: 0, // Default to "Not important"
            }
            return acc
          },
          {} as Record<string, { value: any; importance: number }>,
        )

        // Fetch user requirements
        const userRequirements = await getUserPropertyRequirements(user.id)
        console.log("User requirements fetched:", userRequirements)

        // Merge default requirements with user requirements
        setRequirements({
          ...defaultRequirements,
          ...userRequirements,
        })
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Det gick inte att hämta dina preferenser. Försök igen senare.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Handle importance change
  const handleImportanceChange = (featureId: string, value: number[]) => {
    setRequirements((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        importance: value[0],
      },
    }))
  }

  // Handle value change
  const handleValueChange = (featureId: string, value: any) => {
    console.log(`Changing value for ${featureId} to:`, value)
    setRequirements((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        value,
      },
    }))
  }

  // Save requirements
  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      setError(null)

      // Log the requirements being saved for debugging
      console.log("Requirements to save:", requirements)

      const result = await saveUserPropertyRequirements(user.id, requirements)

      if (result.success) {
        toast({
          title: "Preferenser sparade!",
          description: "Dina fastighetspreferenser har sparats.",
          variant: "default",
          duration: 3000,
        })
      } else {
        setError(result.message)
        toast({
          title: "Kunde inte spara preferenser",
          description: result.message,
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (err) {
      console.error("Error saving requirements:", err)
      setError("Det gick inte att spara dina preferenser. Försök igen senare.")
      toast({
        title: "Ett fel inträffade",
        description: "Det gick inte att spara dina preferenser. Försök igen senare.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  // Get importance badge
  const getImportanceBadge = (importance: number) => {
    const level = importanceLevels.find((level) => level.value === importance)
    return <Badge className={level?.color}>{level?.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Laddar preferenser...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        <p>{error}</p>
        <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
          Försök igen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {features.map((feature) => {
        const currentValue = requirements[feature.id]?.value
        const currentImportance = requirements[feature.id]?.importance || 0

        console.log(`Rendering feature ${feature.id}:`, {
          type: feature.type,
          currentValue,
          currentImportance,
        })

        return (
          <div key={feature.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label htmlFor={feature.id} className="text-base font-medium">
                {feature.label}
              </Label>
              {getImportanceBadge(currentImportance)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${feature.id}-value`} className="text-sm text-gray-500">
                  Önskat värde
                </Label>
                {feature.type === "number" && (
                  <Input
                    id={`${feature.id}-value`}
                    type="number"
                    min={feature.min_value}
                    max={feature.max_value}
                    value={currentValue !== undefined ? currentValue : feature.min_value}
                    onChange={(e) => handleValueChange(feature.id, Number(e.target.value) || feature.min_value)}
                  />
                )}
                {feature.type === "select" && (
                  <Select
                    value={String(currentValue || (feature.options ? feature.options[0] : ""))}
                    onValueChange={(value) => handleValueChange(feature.id, value)}
                  >
                    <SelectTrigger id={`${feature.id}-value`}>
                      <SelectValue placeholder="Välj..." />
                    </SelectTrigger>
                    <SelectContent>
                      {feature.options &&
                        feature.options.map((option: string) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                {feature.type === "boolean" && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`${feature.id}-value`}
                      checked={!!currentValue}
                      onCheckedChange={(checked) => handleValueChange(feature.id, checked)}
                    />
                    <Label htmlFor={`${feature.id}-value`}>{currentValue ? "Ja" : "Nej"}</Label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`${feature.id}-importance`} className="text-sm text-gray-500">
                    Viktighet
                  </Label>
                  <span className="text-xs text-gray-500 truncate ml-2">
                    {importanceLevels.find((level) => level.value === currentImportance)?.label}
                  </span>
                </div>
                <Slider
                  id={`${feature.id}-importance`}
                  min={0}
                  max={4}
                  step={1}
                  value={[currentImportance]}
                  onValueChange={(value) => handleImportanceChange(feature.id, value)}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="text-[10px] sm:text-xs">Inte viktigt</span>
                  <span className="text-[10px] sm:text-xs">Måste ha</span>
                </div>
              </div>
            </div>
            <Separator className="mt-4" />
          </div>
        )
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sparar...
            </>
          ) : (
            "Spara preferenser"
          )}
        </Button>
      </div>
    </div>
  )
}
