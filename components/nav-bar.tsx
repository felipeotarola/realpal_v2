"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, Home, BookmarkIcon, BarChart2, Settings, User, LayoutDashboard, BarChart } from "lucide-react"
import Image from "next/image"

export const NavBar = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close menu when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setMobileMenuOpen(false)
    }

    window.addEventListener("popstate", handleRouteChange)
    return () => {
      window.removeEventListener("popstate", handleRouteChange)
    }
  }, [])

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [mobileMenuOpen])

  return (
    <nav className="bg-white shadow sticky top-0 z-50">
      <div className="container mx-auto py-3 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center font-bold text-gray-800">
          <Image src="https://c1hxfnulg8jbz3wb.public.blob.vercel-storage.com/RealPal-Logo-qMXpdNkF9fA1BnZW3O3rkQJfsdnX4X.png" alt="RealPal Logo" width={120} height={30} className="mr-2" />
          RealPal
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/" className="text-gray-600 hover:text-gray-800">
                Hem
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
                Dashboard
              </Link>
              <Link href="/saved" className="text-gray-600 hover:text-gray-800">
                Sparade
              </Link>
              <Link href="/saved-comparisons" className="text-gray-600 hover:text-gray-800">
                Jämförelser
              </Link>
              <Link href="/preferences" className="text-gray-600 hover:text-gray-800">
                Preferenser
              </Link>
              <Link href="/statistics" className="text-gray-600 hover:text-gray-800">
                Statistik
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-gray-800">
                Profil
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Logga ut
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
                Logga in
              </Button>
              <Button onClick={() => router.push("/signup")}>Registrera dig</Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Stäng meny" : "Öppna meny"}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[250px] bg-white z-50 shadow-xl md:hidden transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <Link href="/" className="flex items-center text-xl font-bold" onClick={() => setMobileMenuOpen(false)}>
              <Image src="https://c1hxfnulg8jbz3wb.public.blob.vercel-storage.com/RealPal-Logo-qMXpdNkF9fA1BnZW3O3rkQJfsdnX4X.png" alt="RealPal Logo" width={120} height={30} className="mr-2" />
              RealPal
            </Link>
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Stäng meny"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <div className="space-y-1 px-2">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-4 w-4" />
                Hem
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/saved"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    Sparade
                  </Link>
                  <Link
                    href="/saved-comparisons"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart2 className="h-4 w-4" />
                    Jämförelser
                  </Link>
                  <Link
                    href="/preferences"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Preferenser
                  </Link>
                  <Link
                    href="/statistics"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart className="h-4 w-4" />
                    Statistik
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Profil
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {user ? (
            <div className="border-t p-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  signOut()
                  setMobileMenuOpen(false)
                }}
              >
                Logga ut
              </Button>
            </div>
          ) : (
            <div className="border-t p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  router.push("/login")
                  setMobileMenuOpen(false)
                }}
              >
                Logga in
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  router.push("/signup")
                  setMobileMenuOpen(false)
                }}
              >
                Registrera dig
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
