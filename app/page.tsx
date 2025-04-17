"use client"

import { CrawlerForm } from "@/components/crawler-form"
import { useAuth } from "@/contexts/auth-context"

export default function Home() {
  const { user } = useAuth()

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">RealPal</h1>
      <p className="text-center text-gray-500 mb-8">
        {user
          ? `Välkommen tillbaka, ${user.email?.split("@")[0] || "Användare"}! Spara och organisera fastigheter du är intresserad av.`
          : "Spara och organisera fastigheter du är intresserad av"}
      </p>
      <div className="max-w-3xl mx-auto">
        <CrawlerForm />
      </div>
    </main>
  )
}
