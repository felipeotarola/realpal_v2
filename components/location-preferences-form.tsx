"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { GoogleMap, useLoadScript, Marker, Circle } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, AlertTriangle } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { saveLocationPreference, getUserLocationPreference } from "@/actions/location-preferences"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Define libraries outside component to prevent re-renders
const libraries = ["places"] as const

const mapContainerStyle = {
  width: "100%",
  height: "400px",
}

// Default center (Stockholm)
const defaultCenter = { lat: 59.334591, lng: 18.06324 }

// Declare google variable
declare global {
  interface Window {
    google: any
  }
}

export function LocationPreferencesForm() {
  const { user } = useAuth()
  const [address, setAddress] = useState("")
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState<number>(5000) // Default 5km radius
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyError, setApiKeyError] = useState<boolean>(false)
  const [autocompleteInitialized, setAutocompleteInitialized] = useState(false)
  const [mapFallbackMode, setMapFallbackMode] = useState(false)

  const mapRef = useRef<google.maps.Map | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Check if Google Maps API key is set
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  useEffect(() => {
    if (!googleMapsApiKey) {
      setApiKeyError(true)
      setMapFallbackMode(true)
      console.error("Google Maps API key is not set")
    }
  }, [googleMapsApiKey])

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries,
    onError: (error) => {
      console.error("Google Maps load error:", error)
      setMapFallbackMode(true)
      // Removed toast notification for map loading error
    },
  })

  // Load user's existing location preference
  useEffect(() => {
    async function loadLocationPreference() {
      if (!user) return

      setIsLoadingPreferences(true)
      try {
        const preference = await getUserLocationPreference(user.id)
        if (preference) {
          setAddress(preference.address)
          setCoordinates({ lat: preference.latitude, lng: preference.longitude })
          setRadius(preference.radius || 5000)
        }
      } catch (error) {
        console.error("Error loading location preference:", error)
        setError("Kunde inte ladda dina platsönskemål. Försök igen senare.")
      } finally {
        setIsLoadingPreferences(false)
      }
    }

    loadLocationPreference()
  }, [user])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    console.log("Map loaded successfully")
  }, [])

  // Initialize autocomplete when the map is loaded
  useEffect(() => {
    if (isLoaded && inputRef.current && window.google?.maps?.places && !autocompleteInitialized) {
      try {
        console.log("Initializing autocomplete")

        // Create the autocomplete instance
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "se" },
          fields: ["address_components", "geometry", "formatted_address"],
        })

        // Store the autocomplete instance
        autocompleteRef.current = autocomplete

        // Add the place_changed event listener
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace()
          console.log("Place selected:", place)

          if (!place?.geometry?.location) {
            console.log("Returned place contains no geometry")
            return
          }

          const newCoordinates = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }

          setAddress(place.formatted_address || "")
          setCoordinates(newCoordinates)

          // Pan to the new location
          if (mapRef.current) {
            mapRef.current.panTo(newCoordinates)
            mapRef.current.setZoom(15)
          }
        })

        // Mark autocomplete as initialized
        setAutocompleteInitialized(true)
        console.log("Autocomplete initialized successfully")
      } catch (error) {
        console.error("Error initializing autocomplete:", error)
        setError("Kunde inte initiera adressökning. Kontrollera att Google Maps API-nyckeln är korrekt.")
      }
    }
  }, [isLoaded, autocompleteInitialized])

  // Handle manual address input
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value)
  }

  // Handle map click to set location
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const clickedLat = e.latLng.lat()
      const clickedLng = e.latLng.lng()

      setCoordinates({ lat: clickedLat, lng: clickedLng })

      // Get address from coordinates (reverse geocoding)
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat: clickedLat, lng: clickedLng } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            setAddress(results[0].formatted_address)
          }
        })
      }
    }
  }, [])

  // Handle radius change
  const handleRadiusChange = (value: number[]) => {
    setRadius(value[0])
  }

  const handleSave = async () => {
    if (!user) return

    // In fallback mode, we need at least an address
    if (!mapFallbackMode && !coordinates) return

    setIsLoading(true)
    setError(null)

    try {
      // If we're in fallback mode and have no coordinates, use a default for Stockholm
      const locationData = {
        address,
        latitude: coordinates?.lat || defaultCenter.lat,
        longitude: coordinates?.lng || defaultCenter.lng,
        radius,
      }

      console.log("Saving location preference:", locationData)

      // Save location preference to database
      const result = await saveLocationPreference(user.id, locationData)

      console.log("Save result:", result)

      if (result.success) {
        toast.success("Platsönskemål sparade!", {
          description: "Dina platsönskemål har sparats.",
          duration: 3000,
        })
      } else {
        setError(result.message)
        // Removed toast notification for save error
      }
    } catch (error) {
      console.error("Error saving location preference:", error)
      setError("Kunde inte spara platsönskemål. Försök igen senare.")
      // Removed toast notification for save error
    } finally {
      setIsLoading(false)
    }
  }

  // Manual geocoding function
  const handleManualGeocode = async () => {
    if (!address) return

    setIsLoading(true)
    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results[0] && results[0].geometry?.location) {
            const location = results[0].geometry.location
            const newCoordinates = {
              lat: location.lat(),
              lng: location.lng(),
            }

            setCoordinates(newCoordinates)

            // Pan to the new location
            if (mapRef.current) {
              mapRef.current.panTo(newCoordinates)
              mapRef.current.setZoom(15)
            }

            // Removed toast notification for address found
          } else {
            setError("Kunde inte hitta koordinater för den angivna adressen.")
            // Removed toast notification for address not found
          }
        })
      } else {
        // In fallback mode, just accept the address as is
        if (mapFallbackMode) {
          // Removed toast notification for address saved in fallback mode
        } else {
          setError("Geocoding är inte tillgängligt. Kontrollera att Google Maps API-nyckeln är korrekt.")
        }
      }
    } catch (error) {
      console.error("Error geocoding address:", error)
      setError("Kunde inte omvandla adress till koordinater.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoaded || isLoadingPreferences)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )

  // Render fallback UI if there's an API key error or load error
  if (mapFallbackMode) {
    return (
      <div className="space-y-4">
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Google Maps kunde inte laddas. Du kan fortfarande ange din adress manuellt.
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="address" className="mb-1.5 block">
            Adress
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="address"
                ref={inputRef}
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="Ange adress"
                className="pr-10"
              />
              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Ange din adress manuellt</p>
        </div>

        <Card className="bg-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sökradie</CardTitle>
            <CardDescription>Hur stort område runt din adress vill du söka i?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="radius">Sökradie</Label>
                <span className="text-sm font-medium">{(radius / 1000).toFixed(1)} km</span>
              </div>
              <Slider
                id="radius"
                min={500}
                max={20000}
                step={500}
                value={[radius]}
                onValueChange={handleRadiusChange}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>500m</span>
                <span>20km</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={isLoading || !address || !user} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sparar...
            </>
          ) : (
            "Spara platsönskemål"
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="address" className="mb-1.5 block">
          Adress
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="address"
              ref={inputRef}
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="Ange adress"
              className="pr-10"
            />
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <Button type="button" variant="outline" onClick={handleManualGeocode} disabled={!address.trim()}>
            Sök
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Skriv en adress och välj från förslagen, eller klicka på kartan för att välja plats
        </p>
      </div>

      <div className="h-[400px] w-full rounded-md overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={12}
          center={coordinates || defaultCenter}
          onLoad={onMapLoad}
          onClick={handleMapClick}
          options={{
            restriction: {
              latLngBounds: {
                north: 70,
                south: 55,
                west: 10,
                east: 25,
              },
              strictBounds: false,
            },
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {coordinates && (
            <>
              <Marker position={coordinates} />
              <Circle
                center={coordinates}
                radius={radius}
                options={{
                  fillColor: "rgba(66, 133, 244, 0.2)",
                  fillOpacity: 0.3,
                  strokeColor: "#4285F4",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
            </>
          )}
        </GoogleMap>
      </div>

      {coordinates && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="radius">Sökradie</Label>
              <span className="text-sm font-medium">{(radius / 1000).toFixed(1)} km</span>
            </div>
            <Slider id="radius" min={500} max={20000} step={500} value={[radius]} onValueChange={handleRadiusChange} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>500m</span>
              <span>20km</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Latitude: {coordinates.lat.toFixed(6)}, Longitude: {coordinates.lng.toFixed(6)}
          </div>
        </>
      )}

      <Button onClick={handleSave} disabled={isLoading || !coordinates || !address || !user} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sparar...
          </>
        ) : (
          "Spara platsönskemål"
        )}
      </Button>
    </div>
  )
}
