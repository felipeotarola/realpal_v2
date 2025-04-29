import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { ChatProvider } from "@/contexts/chat-context"
import { ComparisonProvider } from "@/contexts/comparison-context"
import { NavBar } from "@/components/nav-bar"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata = {
  title: "RealPal | Din fastighetsassistent",
  description:
    "En AI-driven assistent för att hjälpa dig hitta, analysera och jämföra fastigheter på ett enkelt sätt.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} font-sans bg-slate-50`} style={{ height: '100%' }}>
        <AuthProvider>
          <ChatProvider>
            <ComparisonProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
              >
                <main className="h-screen overflow-auto">
                  <NavBar />
                  {children}</main>
              </ThemeProvider>
            </ComparisonProvider>
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
