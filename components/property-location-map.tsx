"use client"

import { useState, useEffect } from "react"
import { GoogleMap, useLoadScript, Marker, Circle } from "@react-google-maps/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin, AlertTriangle, Check, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getUserLocationPreference } from "@/actions/location-preferences"
import { Badge } from "@/components/ui/badge"

// Define libraries outside component to prevent re-renders
const libraries = ["places"] as const

const mapContainerStyle = {
  width: "100%",
  height: "300px",
}

interface PropertyLocationMapProps {
  propertyId: string
  propertyLocation: string
  propertyCoordinates?: { lat: number; lng: number }
  userId: string
}

export function PropertyLocationMap({
  propertyId,
  propertyLocation,
  propertyCoordinates,
  userId,
}: PropertyLocationMapProps) {
  const [userPreference, setUserPreference] = useState<{
    address: string
    latitude: number
    longitude: number
    radius: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [propertyLatLng, setPropertyLatLng] = useState<{ lat: number; lng: number } | null>(propertyCoordinates || null)

  // Check if Google Maps API key is set
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries,
  })

  // Load user's location preference
  useEffect(() => {
    async function loadLocationPreference() {
      if (!userId) return

      setIsLoading(true)
      try {
        const preference = await getUserLocationPreference(userId)
        if (preference) {
          setUserPreference(preference)

          // If we don't have property coordinates, we'll center on the user's preference
          if (!propertyCoordinates) {
            setMapCenter({ lat: preference.latitude, lng: preference.longitude })
          }
        } else {
          // No preference found
          setUserPreference(null)
        }
      } catch (error) {
        console.error("Error loading location preference:", error)
        setError("Kunde inte ladda platsönskemål")
      } finally {
        setIsLoading(false)
      }
    }

    loadLocationPreference()
  }, [userId, propertyCoordinates])

  // Geocode property location if coordinates not provided
  useEffect(() => {
    if (!isLoaded || propertyCoordinates || !propertyLocation || !window.google?.maps?.Geocoder) return

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: propertyLocation }, (results, status) => {
      if (status === "OK" && results && results[0] && results[0].geometry?.location) {
        const location = results[0].geometry.location
        const newCoordinates = {
          lat: location.lat(),
          lng: location.lng(),
        }
        setPropertyLatLng(newCoordinates)
        setMapCenter(newCoordinates)
      } else {
        console.error("Geocoding failed:", status)
      }
    })
  }, [isLoaded, propertyCoordinates, propertyLocation])

  // Calculate distance and check if within radius when both coordinates are available
  useEffect(() => {
    if (!userPreference || !propertyLatLng) return

    // Calculate distance using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3 // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180
      const φ2 = (lat2 * Math.PI) / 180
      const Δφ = ((lat2 - lat1) * Math.PI) / 180
      const Δλ = ((lon2 - lon1) * Math.PI) / 180

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c // in meters

      return distance
    }

    const dist = calculateDistance(
      userPreference.latitude,
      userPreference.longitude,
      propertyLatLng.lat,
      propertyLatLng.lng,
    )
    setDistance(dist)
    setIsWithinRadius(dist <= userPreference.radius)

    // Set map center to show both points
    if (userPreference && propertyLatLng) {
      // Calculate center point between the two locations
      const centerLat = (userPreference.latitude + propertyLatLng.lat) / 2
      const centerLng = (userPreference.longitude + propertyLatLng.lng) / 2
      setMapCenter({ lat: centerLat, lng: centerLng })
    }
  }, [userPreference, propertyLatLng])

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`
    } else {
      return `${(meters / 1000).toFixed(1)} km`
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (!userPreference) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platsönskemål</CardTitle>
          <CardDescription>Jämför med dina platsönskemål</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Du har inte angett några platsönskemål. Gå till Preferenser för att ställa in din önskade plats.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!isLoaded || loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platsönskemål</CardTitle>
          <CardDescription>Jämför med dina platsönskemål</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Kartan kunde inte laddas. Vi visar avståndet utan karta.</AlertDescription>
            </Alert>

            {distance !== null && (
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avstånd till din önskade plats</p>
                    <p className="text-lg font-medium">{formatDistance(distance)}</p>
                  </div>
                  {isWithinRadius !== null && (
                    <Badge variant={isWithinRadius ? "success" : "destructive"}>
                      {isWithinRadius ? (
                        <span className="flex items-center">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Inom radie
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <X className="h-3.5 w-3.5 mr-1" />
                          Utanför radie
                        </span>
                      )}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">Din önskade plats: {userPreference.address}</p>
                <p className="text-sm text-gray-500">
                  Din önskade radie: {(userPreference.radius / 1000).toFixed(1)} km
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platsönskemål</CardTitle>
        <CardDescription>Jämför med dina platsönskemål</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div className="h-[300px] w-full">
            {mapCenter && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={mapCenter}
                options={{
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {/* User preference location */}
                {userPreference && (
                  <>
                    <Marker
                      position={{ lat: userPreference.latitude, lng: userPreference.longitude }}
                      icon={{
                        url:
                          "data:image/svg+xml;charset=UTF-8," +
                          encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                        `),
                        scaledSize: new window.google.maps.Size(32, 32),
                        anchor: new window.google.maps.Point(16, 32),
                      }}
                      title="Din önskade plats"
                    />
                    <Circle
                      center={{ lat: userPreference.latitude, lng: userPreference.longitude }}
                      radius={userPreference.radius}
                      options={{
                        fillColor: "rgba(66, 133, 244, 0.1)",
                        fillOpacity: 0.3,
                        strokeColor: "#4285F4",
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                      }}
                    />
                  </>
                )}

                {/* Property location */}
                {propertyLatLng && (
                  <Marker
                    position={propertyLatLng}
                    icon={{
                      url:
                        "data:image/svg+xml;charset=UTF-8," +
                        encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF4136" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                      `),
                      scaledSize: new window.google.maps.Size(32, 32),
                      anchor: new window.google.maps.Point(16, 32),
                    }}
                    title="Fastighetens plats"
                  />
                )}
              </GoogleMap>
            )}
          </div>

          {/* Distance info overlay */}
          {distance !== null && (
            <div className="absolute top-4 right-4 bg-white p-3 rounded-md shadow-md max-w-[200px]">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Avstånd:</p>
                  <p className="text-sm font-bold">{formatDistance(distance)}</p>
                </div>
                {isWithinRadius !== null && (
                  <Badge variant={isWithinRadius ? "success" : "destructive"} className="self-end">
                    {isWithinRadius ? (
                      <span className="flex items-center">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Inom radie
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <X className="h-3.5 w-3.5 mr-1" />
                        Utanför radie
                      </span>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Din önskade plats</p>
              <p className="text-sm text-gray-500">{userPreference.address}</p>
              <p className="text-xs text-gray-400 mt-1">Radie: {(userPreference.radius / 1000).toFixed(1)} km</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
