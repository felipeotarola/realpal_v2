"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ZoomIn, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ImageGalleryProps {
  images: string[]
  websiteUrl: string
}

export function ImageGallery({ images, websiteUrl }: ImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [openLightbox, setOpenLightbox] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const imagesPerPage = 12
  const totalPages = Math.ceil(images.length / imagesPerPage)

  const paginatedImages = images.slice(currentPage * imagesPerPage, (currentPage + 1) * imagesPerPage)

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }

  const openImage = (index: number) => {
    setCurrentImageIndex(index + currentPage * imagesPerPage)
    setOpenLightbox(true)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const downloadImage = (url: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = url.split("/").pop() || "image"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {paginatedImages.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square overflow-hidden rounded-md border cursor-pointer group"
            onClick={() => openImage(index)}
          >
            <img
              src={image || "/placeholder.svg"}
              alt={`Property image ${index + 1}`}
              className="object-cover w-full h-full transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages - 1}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <Dialog open={openLightbox} onOpenChange={setOpenLightbox}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0">
          <div className="relative h-[80vh] flex items-center justify-center">
            <img
              src={images[currentImageIndex] || "/placeholder.svg"}
              alt={`Property image ${currentImageIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 text-white hover:bg-black/50"
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 text-white hover:bg-black/50"
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-black/50 text-white border-white/20 hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadImage(images[currentImageIndex])
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-black/50 text-white border-white/20 hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(images[currentImageIndex], "_blank")
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm">
              Image {currentImageIndex + 1} of {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
