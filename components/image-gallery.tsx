"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageGalleryProps {
  images: string[]
  websiteUrl: string
}

export function ImageGallery({ images, websiteUrl }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  if (images.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-center">
        Inga bilder hittades för denna fastighet.
      </div>
    )
  }

  const handleImageClick = (image: string, index: number) => {
    setSelectedImage(image)
    setSelectedIndex(index)
  }

  const handleNext = () => {
    if (selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1)
      setSelectedImage(images[selectedIndex + 1])
    }
  }

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
      setSelectedImage(images[selectedIndex - 1])
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((image, index) => (
          <Card
            key={index}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleImageClick(image, index)}
          >
            <div className="relative aspect-square bg-gray-100">
              <img
                src={image || "/placeholder.svg"}
                alt={`Fastighetsbild ${index + 1}`}
                className="object-cover w-full h-full"
                onError={(e) => {
                  // Replace broken images with a placeholder
                  ;(e.target as HTMLImageElement).src = `/placeholder.svg?height=200&width=200&query=property`
                  ;(e.target as HTMLImageElement).className = "object-contain p-4"
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                <ZoomIn className="text-white h-8 w-8" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              Fastighetsbild {selectedIndex + 1} av {images.length}
            </DialogTitle>
            <DialogDescription>
              <a
                href={selectedImage || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Öppna originalbild
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[70vh] bg-gray-100 rounded-md overflow-hidden">
            {selectedImage && (
              <img
                src={selectedImage || "/placeholder.svg"}
                alt={`Fastighetsbild ${selectedIndex + 1}`}
                className="object-contain w-full h-full"
                onError={(e) => {
                  // Replace broken images with a placeholder
                  ;(e.target as HTMLImageElement).src = `/placeholder.svg?height=600&width=800&query=property`
                }}
              />
            )}

            <div className="absolute inset-x-0 bottom-0 flex justify-between p-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={selectedIndex === 0}
                className="bg-white/80 hover:bg-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={selectedIndex === images.length - 1}
                className="bg-white/80 hover:bg-white"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
