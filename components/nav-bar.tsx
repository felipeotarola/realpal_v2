"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, Home, BookmarkIcon, BarChart2, Settings, User, LayoutDashboard, BarChart, MessageSquareText } from "lucide-react"
import Image from "next/image"

export const NavBar = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
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

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow sticky top-0 z-50">
      <div className="container mx-auto py-2 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center font-bold text-gray-800">
          <Image src="https://c1hxfnulg8jbz3wb.public.blob.vercel-storage.com/RealPal-Logo-qMXpdNkF9fA1BnZW3O3rkQJfsdnX4X.png" alt="RealPal Logo" width={110} height={28} className="mr-1" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-0.5">
          {user ? (
            <>
              <Link href="/chat" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/chat') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquareText className="h-3.5 w-3.5 mr-1" />
                <span>Assistent</span>
              </Link>
              <Link href="/dashboard" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/dashboard') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                <span>Dashboard</span>
              </Link>
              <Link href="/saved" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/saved') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <BookmarkIcon className="h-3.5 w-3.5 mr-1" />
                <span>Sparade</span>
              </Link>
              <Link href="/saved-comparisons" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/saved-comparisons') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5 mr-1" />
                <span>Jämförelser</span>
              </Link>
              <Link href="/preferences" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/preferences') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                <span>Preferenser</span>
              </Link>
              <Link href="/statistics" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/statistics') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <BarChart className="h-3.5 w-3.5 mr-1" />
                <span>Statistik</span>
              </Link>
              <Link href="/profile" 
                className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive('/profile') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <User className="h-3.5 w-3.5 mr-1" />
                <span>Profil</span>
              </Link>
              <div className="border-l border-gray-200 h-5 mx-1.5"></div>
              <Button variant="outline" size="sm" onClick={() => signOut()} className="ml-1 text-xs py-1 h-auto">
                Logga ut
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push("/login")} className="text-xs py-1 h-auto">
                Logga in
              </Button>
              <Button onClick={() => router.push("/signup")} size="sm" className="text-xs py-1 h-auto ml-1">
                Registrera dig
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-1.5 rounded-md hover:bg-gray-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Stäng meny" : "Öppna meny"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
        className={`fixed right-0 top-0 bottom-0 w-[220px] bg-white z-50 shadow-xl md:hidden transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b flex items-center justify-between">
            <Link href="/" className="flex items-center font-bold" onClick={() => setMobileMenuOpen(false)}>
              <Image src="https://c1hxfnulg8jbz3wb.public.blob.vercel-storage.com/RealPal-Logo-qMXpdNkF9fA1BnZW3O3rkQJfsdnX4X.png" alt="RealPal Logo" width={100} height={25} className="mr-1" />
            </Link>
            <button
              className="p-1.5 rounded-md hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Stäng meny"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto py-1.5">
            <div className="space-y-0.5 px-1.5">
              <Link
                href="/"
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                  isActive('/') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="h-3.5 w-3.5" />
                Hem
              </Link>
              {user ? (
                <>
                <Link
                    href="/chat"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/chat') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    Realpal Assistent
                  </Link>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/dashboard') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <Link
                    href="/saved"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/saved') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookmarkIcon className="h-3.5 w-3.5" />
                    Sparade
                  </Link>
                  <Link
                    href="/saved-comparisons"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/saved-comparisons') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    Jämförelser
                  </Link>
                  <Link
                    href="/preferences"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/preferences') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Preferenser
                  </Link>
                  <Link
                    href="/statistics"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/statistics') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart className="h-3.5 w-3.5" />
                    Statistik
                  </Link>
                  <Link
                    href="/profile"
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 ${
                      isActive('/profile') ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-3.5 w-3.5" />
                    Profil
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {user ? (
            <div className="border-t p-3">
              <Button
                variant="outline"
                className="w-full text-xs py-1 h-auto"
                onClick={() => {
                  signOut()
                  setMobileMenuOpen(false)
                }}
              >
                Logga ut
              </Button>
            </div>
          ) : (
            <div className="border-t p-3 space-y-1.5">
              <Button
                variant="outline"
                className="w-full text-xs py-1 h-auto"
                onClick={() => {
                  router.push("/login")
                  setMobileMenuOpen(false)
                }}
              >
                Logga in
              </Button>
              <Button
                className="w-full text-xs py-1 h-auto"
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
