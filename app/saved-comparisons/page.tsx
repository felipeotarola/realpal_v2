"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useComparison } from "@/contexts/comparison-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart2, Calendar, Loader2, Trash2, Eye, Share } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SavedComparisonsPage() {
  const { user } = useAuth()
  const { savedComparisons, loadingSavedComparisons, loadComparison, deleteComparison } = useComparison()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [comparisonToDelete, setComparisonToDelete] = useState<string | null>(null)

  const handleDeleteClick = (comparisonId: string) => {
    setComparisonToDelete(comparisonId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (comparisonToDelete) {
      await deleteComparison(comparisonToDelete)
      setDeleteDialogOpen(false)
      setComparisonToDelete(null)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-2">Sparade jämförelser</h1>
        <p className="text-gray-500 mb-8">Dina sparade fastighetsjämförelser</p>

        {loadingSavedComparisons ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : savedComparisons.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BarChart2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Inga sparade jämförelser ännu</h2>
            <p className="text-gray-500 mb-4">Jämför fastigheter och spara dem för att komma tillbaka senare</p>
            <Link href="/saved">
              <Button>Gå till sparade fastigheter</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedComparisons.map((comparison) => (
              <Card key={comparison.id} className="overflow-hidden flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart2 className="h-5 w-5 mr-2 text-blue-600" />
                    {comparison.title}
                  </CardTitle>
                  <CardDescription>
                    {comparison.property_ids.length} fastigheter • Senast visad:{" "}
                    {new Date(comparison.last_viewed_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-gray-700 line-clamp-3">
                    {comparison.description || "Ingen beskrivning tillgänglig."}
                  </p>
                  <div className="flex items-center mt-4 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Skapad: {new Date(comparison.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => loadComparison(comparison.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Visa
                  </Button>
                  <div className="flex gap-2">
                    {comparison.is_shared && (
                      <Button variant="outline" size="sm">
                        <Share className="h-4 w-4 mr-2" />
                        Delad
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClick(comparison.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Ta bort
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort jämförelse</AlertDialogTitle>
              <AlertDialogDescription>
                Är du säker på att du vill ta bort denna jämförelse? Detta kan inte ångras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}
