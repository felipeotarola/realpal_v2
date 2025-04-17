"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ContrastIcon as CompareIcon, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface SavedProperty {
  id: string
  title: string
  location: string
  price: string
  images: string[]
}

interface ComparisonSelectorProps {
  properties: SavedProperty[]
  userId: string
}

export function ComparisonSelector({ properties, userId }: ComparisonSelectorProps) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const togglePropertySelection = (propertyId: string) => {
    if (selectedProperties.includes(propertyId)) {
      setSelectedProperties(selectedProperties.filter((id) => id !== propertyId))
    } else {
      setSelectedProperties([...selectedProperties, propertyId])
    }
  }

  const handleCompareClick = () => {
    if (selectedProperties.length < 2) {
      toast({
        title: "För få fastigheter valda",
        description: "Du måste välja minst 2 fastigheter för att jämföra.",
        variant: "destructive",
      })
      return
    }

    if (selectedProperties.length > 5) {
      toast({
        title: "För många fastigheter valda",
        description: "Du kan jämföra max 5 fastigheter samtidigt för bästa resultat.",
        variant: "destructive",
      })
      return
    }

    setIsDialogOpen(true)
  }

  const createComparison = async () => {
    if (!title.trim()) {
      toast({
        title: "Titel krävs",
        description: "Du måste ange en titel för jämförelsen.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      // Skapa jämförelsen i databasen
      const { data, error } = await supabase
        .from("property_comparisons")
        .insert({
          user_id: userId,
          title: title,
          description: description,
          property_ids: selectedProperties,
        })
        .select("id")
        .single()

      if (error) {
        throw error
      }

      toast({
        title: "Jämförelse skapad",
        description: "Din jämförelse har skapats och är redo att analyseras.",
      })

      // Navigera till jämförelsesidan
      router.push(`/comparison/${data.id}`)
    } catch (error) {
      console.error("Fel vid skapande av jämförelse:", error)
      toast({
        title: "Kunde inte skapa jämförelse",
        description: "Ett fel uppstod. Försök igen senare.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
      setIsDialogOpen(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Välj fastigheter att jämföra</h2>
          <p className="text-sm text-gray-500">Markera 2-5 fastigheter och klicka på "Jämför"</p>
        </div>
        <Button onClick={handleCompareClick} disabled={selectedProperties.length < 2} className="w-full sm:w-auto">
          <CompareIcon className="mr-2 h-4 w-4" />
          Jämför ({selectedProperties.length} valda)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {properties.map((property) => (
          <div
            key={property.id}
            className={`border rounded-lg p-4 flex items-start gap-3 cursor-pointer transition-colors ${
              selectedProperties.includes(property.id) ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
            }`}
            onClick={() => togglePropertySelection(property.id)}
          >
            <Checkbox
              checked={selectedProperties.includes(property.id)}
              onCheckedChange={() => togglePropertySelection(property.id)}
              className="mt-1"
            />
            <div className="flex-grow">
              <div className="font-medium line-clamp-1">{property.title}</div>
              <div className="text-sm text-gray-500">{property.location}</div>
              <div className="text-sm font-medium mt-1">{property.price}</div>
            </div>
            {property.images && property.images.length > 0 && (
              <div className="w-16 h-16 flex-shrink-0">
                <img
                  src={property.images[0] || "/placeholder.svg"}
                  alt={property.title}
                  className="w-full h-full object-cover rounded"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = `/placeholder.svg?height=64&width=64&query=property`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Skapa jämförelse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel på jämförelsen</Label>
              <Input
                id="title"
                placeholder="T.ex. 'Lägenheter i Vasastan'"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning (valfritt)</Label>
              <Textarea
                id="description"
                placeholder="Beskriv vad du jämför och varför"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                Du har valt att jämföra {selectedProperties.length} fastigheter. AI kommer att analysera skillnaderna
                och ge dig en detaljerad jämförelse.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={createComparison} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skapar...
                </>
              ) : (
                "Skapa jämförelse"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
