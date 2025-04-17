"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabaseClient"
import { generateAIComparison } from "@/actions/generate-comparison"

// Define the property type
export interface ComparisonProperty {
  id: string
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
  year_built?: string
  monthly_fee?: string
  energy_rating?: string
  created_at: string
  is_analyzed: boolean
  analysis?: PropertyAnalysis | null
}

interface PropertyAnalysis {
  id: string
  property_id: string
  analysis_summary: string
  total_score: number
  attribute_scores: AttributeScore[]
  pros: string[]
  cons: string[]
  investment_rating: number
  value_for_money: number
  created_at: string
  updated_at: string
}

interface AttributeScore {
  name: string
  score: number
  comment: string
}

interface SavedComparison {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  property_ids: string[]
  is_shared: boolean
  share_code?: string
  last_viewed_at: string
}

interface ComparisonNote {
  id: string
  comparison_id: string
  property_id?: string
  note_text: string
  created_at: string
  updated_at: string
}

interface ComparisonContextType {
  selectedProperties: ComparisonProperty[]
  addProperty: (property: ComparisonProperty) => void
  removeProperty: (propertyId: string) => void
  clearComparison: () => void
  isSelected: (propertyId: string) => boolean
  aiComparison: any | null
  loadingAiComparison: boolean
  generateAiComparison: () => Promise<void>
  savedComparisons: SavedComparison[]
  loadingSavedComparisons: boolean
  saveComparison: (title: string, description?: string) => Promise<string | null>
  loadComparison: (comparisonId: string) => Promise<void>
  deleteComparison: (comparisonId: string) => Promise<boolean>
  currentComparisonId: string | null
  comparisonNotes: ComparisonNote[]
  addComparisonNote: (noteText: string, propertyId?: string) => Promise<boolean>
  loadingComparison: boolean
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined)

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [selectedProperties, setSelectedProperties] = useState<ComparisonProperty[]>([])
  const [aiComparison, setAiComparison] = useState<any | null>(null)
  const [loadingAiComparison, setLoadingAiComparison] = useState(false)
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([])
  const [loadingSavedComparisons, setLoadingSavedComparisons] = useState(false)
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null)
  const [comparisonNotes, setComparisonNotes] = useState<ComparisonNote[]>([])
  const [loadingComparison, setLoadingComparison] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Load selected properties from localStorage on mount
  useEffect(() => {
    const savedComparison = localStorage.getItem("realpal_comparison")
    if (savedComparison) {
      try {
        const parsed = JSON.parse(savedComparison)
        setSelectedProperties(parsed)
      } catch (error) {
        console.error("Error parsing saved comparison:", error)
        localStorage.removeItem("realpal_comparison")
      }
    }
  }, [])

  // Save selected properties to localStorage when they change
  useEffect(() => {
    if (selectedProperties.length > 0) {
      localStorage.setItem("realpal_comparison", JSON.stringify(selectedProperties))
    } else {
      localStorage.removeItem("realpal_comparison")
    }
  }, [selectedProperties])

  // Load saved comparisons when user changes
  useEffect(() => {
    if (user) {
      loadSavedComparisons()
    } else {
      setSavedComparisons([])
    }
  }, [user])

  // Replace the loadSavedComparisons function with this direct Supabase implementation
  const loadSavedComparisons = async () => {
    if (!user) return

    setLoadingSavedComparisons(true)
    try {
      const { data, error } = await supabase
        .from("property_comparisons")
        .select(`
        id, 
        title, 
        description, 
        created_at, 
        updated_at, 
        property_ids, 
        is_shared, 
        share_code, 
        last_viewed_at
      `)
        .eq("user_id", user.id)
        .order("last_viewed_at", { ascending: false })

      if (error) {
        throw new Error("Failed to load saved comparisons")
      }

      setSavedComparisons(data || [])
    } catch (error) {
      console.error("Error loading saved comparisons:", error)
      toast({
        title: "Error",
        description: "Failed to load saved comparisons",
        variant: "destructive",
      })
    } finally {
      setLoadingSavedComparisons(false)
    }
  }

  const addProperty = (property: ComparisonProperty) => {
    // Don't add if already selected
    if (selectedProperties.some((p) => p.id === property.id)) return

    // Limit to 4 properties for comparison
    if (selectedProperties.length >= 4) {
      toast({
        title: "Maximum properties reached",
        description: "You can compare up to 4 properties at once. Remove a property to add a new one.",
        variant: "warning",
      })
      return
    }

    setSelectedProperties([...selectedProperties, property])
    setAiComparison(null) // Reset AI comparison when properties change
  }

  const removeProperty = (propertyId: string) => {
    setSelectedProperties(selectedProperties.filter((p) => p.id !== propertyId))
    setAiComparison(null) // Reset AI comparison when properties change
  }

  const clearComparison = () => {
    setSelectedProperties([])
    setAiComparison(null)
    setCurrentComparisonId(null)
    setComparisonNotes([])
  }

  const isSelected = (propertyId: string) => {
    return selectedProperties.some((p) => p.id === propertyId)
  }

  // Replace the generateAiComparison function with this version that calls the server action
  const generateAiComparison = async () => {
    if (selectedProperties.length < 2) {
      toast({
        title: "Not enough properties",
        description: "You need at least 2 properties to generate a comparison",
        variant: "warning",
      })
      return
    }

    setLoadingAiComparison(true)
    try {
      // Extract relevant property data for comparison
      const propertyData = selectedProperties.map((property) => ({
        id: property.id,
        title: property.title,
        price: property.price,
        size: property.size,
        rooms: property.rooms,
        location: property.location,
        description: property.description.substring(0, 300) + "...", // Truncate for prompt size
        features: property.features,
        yearBuilt: property.year_built || property.yearBuilt,
        monthlyFee: property.monthly_fee || property.monthlyFee,
        analysis: property.analysis
          ? {
              totalScore: property.analysis.total_score || property.analysis.totalScore,
              pros: property.analysis.pros,
              cons: property.analysis.cons,
              investmentRating: property.analysis.investment_rating || property.analysis.investmentRating,
              valueForMoney: property.analysis.value_for_money || property.analysis.valueForMoney,
            }
          : null,
      }))

      // Call the server action to generate the comparison
      const data = await generateAIComparison(propertyData)
      setAiComparison(data)

      // If this is a saved comparison, update it with the new AI analysis
      if (currentComparisonId && user) {
        await supabase
          .from("property_comparisons")
          .update({ ai_analysis: data })
          .eq("id", currentComparisonId)
          .eq("user_id", user.id)
      }
    } catch (error) {
      console.error("Error generating AI comparison:", error)
      toast({
        title: "Error",
        description: "Failed to generate comparison. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoadingAiComparison(false)
    }
  }

  // Replace the saveComparison function with this direct Supabase implementation
  const saveComparison = async (title: string, description?: string): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save comparisons",
        variant: "warning",
      })
      router.push("/login")
      return null
    }

    if (selectedProperties.length < 2) {
      toast({
        title: "Not enough properties",
        description: "You need at least 2 properties to save a comparison",
        variant: "warning",
      })
      return null
    }

    try {
      // If we're updating an existing comparison
      if (currentComparisonId) {
        const updateData: any = {
          title,
          description,
          property_ids: selectedProperties.map((p) => p.id),
          ai_analysis: aiComparison,
          last_viewed_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from("property_comparisons")
          .update(updateData)
          .eq("id", currentComparisonId)
          .eq("user_id", user.id)

        if (error) {
          throw new Error("Failed to update comparison")
        }

        // Refresh the saved comparisons list
        await loadSavedComparisons()

        toast({
          title: "Comparison updated",
          description: "Your comparison has been updated successfully",
        })

        return currentComparisonId
      } else {
        // Creating a new comparison
        const { data, error } = await supabase
          .from("property_comparisons")
          .insert({
            user_id: user.id,
            title,
            description,
            property_ids: selectedProperties.map((p) => p.id),
            ai_analysis: aiComparison,
            last_viewed_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          throw new Error("Failed to save comparison")
        }

        setCurrentComparisonId(data.id)

        // Add properties to the junction table
        for (let i = 0; i < selectedProperties.length; i++) {
          await supabase.from("comparison_properties").insert({
            comparison_id: data.id,
            property_id: selectedProperties[i].id,
            display_order: i + 1,
          })
        }

        // Create a history record
        await supabase.from("comparison_history").insert({
          comparison_id: data.id,
          property_ids: selectedProperties.map((p) => p.id),
          ai_analysis: aiComparison,
          user_id: user.id,
        })

        // Refresh the saved comparisons list
        await loadSavedComparisons()

        toast({
          title: "Comparison saved",
          description: "Your comparison has been saved successfully",
        })

        return data.id
      }
    } catch (error) {
      console.error("Error saving comparison:", error)
      toast({
        title: "Error",
        description: "Failed to save comparison. Please try again.",
        variant: "destructive",
      })
      return null
    }
  }

  // Replace the loadComparison function with this direct Supabase implementation
  const loadComparison = async (comparisonId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to view saved comparisons",
        variant: "warning",
      })
      router.push("/login")
      return
    }

    setLoadingComparison(true)
    try {
      // Fetch the comparison directly from Supabase
      const { data: comparison, error: comparisonError } = await supabase
        .from("property_comparisons")
        .select(`
        id, 
        user_id,
        title, 
        description, 
        created_at, 
        updated_at, 
        property_ids, 
        ai_analysis,
        is_shared, 
        share_code, 
        last_viewed_at
      `)
        .eq("id", comparisonId)
        .single()

      if (comparisonError) {
        throw new Error("Failed to load comparison")
      }

      // Check if the user has access to this comparison
      if (comparison.user_id !== user.id && !comparison.is_shared) {
        throw new Error("Unauthorized access to comparison")
      }

      // Update last_viewed_at
      await supabase
        .from("property_comparisons")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("id", comparisonId)
        .eq("user_id", user.id)

      // Fetch the properties in this comparison
      const { data: properties, error: propertiesError } = await supabase
        .from("saved_properties")
        .select(`
        id, 
        title, 
        price, 
        size, 
        rooms, 
        location, 
        description, 
        features, 
        images, 
        url, 
        agent, 
        year_built, 
        monthly_fee, 
        energy_rating, 
        created_at, 
        is_analyzed
      `)
        .in("id", comparison.property_ids)

      if (propertiesError) {
        throw new Error("Failed to fetch properties")
      }

      // Fetch analyses for properties that have them
      const analyzedPropertyIds = properties.filter((p) => p.is_analyzed).map((p) => p.id)

      let analyses = []
      if (analyzedPropertyIds.length > 0) {
        const { data: analysesData, error: analysesError } = await supabase
          .from("property_analyses")
          .select("*")
          .in("property_id", analyzedPropertyIds)

        if (!analysesError) {
          analyses = analysesData
        }
      }

      // Attach analyses to properties
      const propertiesWithAnalyses = properties.map((property) => {
        const analysis = analyses.find((a) => a.property_id === property.id)
        return {
          ...property,
          analysis: analysis || null,
        }
      })

      // Fetch notes for this comparison
      const { data: notes } = await supabase.from("comparison_notes").select("*").eq("comparison_id", comparisonId)

      // Set the current comparison ID
      setCurrentComparisonId(comparisonId)

      // Set the properties
      setSelectedProperties(propertiesWithAnalyses || [])

      // Set the AI comparison if it exists
      setAiComparison(comparison.ai_analysis || null)

      // Set the notes
      setComparisonNotes(notes || [])

      // Navigate to the comparison page
      router.push("/compare")
    } catch (error) {
      console.error("Error loading comparison:", error)
      toast({
        title: "Error",
        description: "Failed to load comparison. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingComparison(false)
    }
  }

  // Replace the deleteComparison function with this direct Supabase implementation
  const deleteComparison = async (comparisonId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete comparisons",
        variant: "warning",
      })
      router.push("/login")
      return false
    }

    try {
      // Check if the user owns this comparison
      const { data: existingComparison, error: checkError } = await supabase
        .from("property_comparisons")
        .select("user_id")
        .eq("id", comparisonId)
        .single()

      if (checkError) {
        throw new Error("Failed to verify comparison ownership")
      }

      if (existingComparison.user_id !== user.id) {
        throw new Error("Unauthorized to delete this comparison")
      }

      // Delete the comparison (cascade will handle related records)
      const { error } = await supabase.from("property_comparisons").delete().eq("id", comparisonId)

      if (error) {
        throw new Error("Failed to delete comparison")
      }

      // If we're deleting the current comparison, clear it
      if (currentComparisonId === comparisonId) {
        clearComparison()
      }

      // Refresh the saved comparisons list
      await loadSavedComparisons()

      toast({
        title: "Comparison deleted",
        description: "Your comparison has been deleted successfully",
      })

      return true
    } catch (error) {
      console.error("Error deleting comparison:", error)
      toast({
        title: "Error",
        description: "Failed to delete comparison. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Replace the addComparisonNote function with this direct Supabase implementation
  const addComparisonNote = async (noteText: string, propertyId?: string): Promise<boolean> => {
    if (!user || !currentComparisonId) {
      toast({
        title: "Error",
        description: "You must be viewing a saved comparison to add notes",
        variant: "warning",
      })
      return false
    }

    try {
      // Check if the user owns this comparison
      const { data: existingComparison, error: checkError } = await supabase
        .from("property_comparisons")
        .select("user_id")
        .eq("id", currentComparisonId)
        .single()

      if (checkError) {
        throw new Error("Failed to verify comparison ownership")
      }

      if (existingComparison.user_id !== user.id) {
        throw new Error("Unauthorized to add notes to this comparison")
      }

      // Create the note
      const { data, error } = await supabase
        .from("comparison_notes")
        .insert({
          comparison_id: currentComparisonId,
          property_id: propertyId || null,
          note_text: noteText,
        })
        .select()
        .single()

      if (error) {
        throw new Error("Failed to create note")
      }

      // Update the last_viewed_at timestamp on the comparison
      await supabase
        .from("property_comparisons")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("id", currentComparisonId)

      // Add the new note to the list
      setComparisonNotes([...comparisonNotes, data])

      toast({
        title: "Note added",
        description: "Your note has been added successfully",
      })

      return true
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  return (
    <ComparisonContext.Provider
      value={{
        selectedProperties,
        addProperty,
        removeProperty,
        clearComparison,
        isSelected,
        aiComparison,
        loadingAiComparison,
        generateAiComparison,
        savedComparisons,
        loadingSavedComparisons,
        saveComparison,
        loadComparison,
        deleteComparison,
        currentComparisonId,
        comparisonNotes,
        addComparisonNote,
        loadingComparison,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  )
}

export function useComparison() {
  const context = useContext(ComparisonContext)
  if (context === undefined) {
    throw new Error("useComparison must be used within a ComparisonProvider")
  }
  return context
}
