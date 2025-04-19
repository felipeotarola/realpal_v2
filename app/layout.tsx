import type React from "react"
import "./globals.css"
// Import the mobile menu CSS
import "./mobile-menu.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { ComparisonProvider } from "@/contexts/comparison-context"
import { NavBar } from "@/components/nav-bar"
import { ComparisonIndicator } from "@/components/comparison-indicator"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { SimpleChatDrawer } from "@/components/simple-chat-drawer";
import { ChatDrawer } from "@/components/chat-drawer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RealPal",
  description: "Spara och organisera fastigheter du är intresserad av",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
                  <ChatDrawer />

          </ComparisonProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
