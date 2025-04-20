"use client"

import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PropertyRequirementsForm } from "@/components/property-requirements-form"
import { LocationPreferencesForm } from "@/components/location-preferences-form"

export default function PreferencesPage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Dina preferenser</h1>
          <p className="text-gray-600 mb-8">
            Ange dina önskemål för fastigheter så att vi kan hjälpa dig hitta den perfekta bostaden.
          </p>

          <Tabs defaultValue="property-requirements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="property-requirements">Fastighetskrav</TabsTrigger>
              <TabsTrigger value="location-preferences">Platsönskemål</TabsTrigger>
            </TabsList>
            <TabsContent value="property-requirements">
              <Card>
                <CardHeader>
                  <CardTitle>Fastighetskrav</CardTitle>
                  <CardDescription>
                    Ange dina krav och önskemål för fastigheter. Ju högre prioritet, desto större påverkan på
                    matchningspoängen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PropertyRequirementsForm />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="location-preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Platsönskemål</CardTitle>
                  <CardDescription>
                    Ange dina önskemål för plats och område. Välj en adress eller plats på kartan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LocationPreferencesForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
