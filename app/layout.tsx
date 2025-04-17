import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { ComparisonProvider } from "@/contexts/comparison-context"
import { NavBar } from "@/components/nav-bar"
import { ComparisonIndicator } from "@/components/comparison-indicator"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RealPal",
  description: "Spara och organisera fastigheter du är intresserad av",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={inter.className}>
        <AuthProvider>
          <ComparisonProvider>
            <NavBar />
            {children}
            <ComparisonIndicator />
          </ComparisonProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
