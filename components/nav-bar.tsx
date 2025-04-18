"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, User, LogOut, Menu, X } from "lucide-react"

export function NavBar() {
  const { user, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Home className="h-6 w-6" />
          <span className="text-xl font-bold">RealPal</span>
        </Link>

        {/* Mobile menu button */}
        <button
          onClick={toggleMenu}
          className="block md:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-label={isMenuOpen ? "Stäng meny" : "Öppna meny"}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            Hem
          </Link>
          {user ? (
            <>
              <Link href="/saved" className="text-gray-700 hover:text-gray-900">
                Sparade Fastigheter
              </Link>
              <Link href="/saved-comparisons" className="text-gray-700 hover:text-gray-900">
                Jämförelser
              </Link>
              <DropdownMenu onOpenChange={(open) => console.log("Dropdown open state:", open)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full border border-gray-200 hover:bg-gray-100"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="/placeholder.svg" alt={user.email || ""} />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 z-50" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logga ut</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Logga in</Button>
              </Link>
              <Link href="/signup">
                <Button>Registrera</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 right-0 z-50 bg-white border-b shadow-lg md:hidden">
            <div className="flex flex-col p-4 space-y-4">
              <Link
                href="/"
                className="block px-4 py-3 text-base hover:bg-gray-100 rounded-md text-gray-700 hover:text-gray-900"
                onClick={toggleMenu}
              >
                Hem
              </Link>
              {user ? (
                <>
                  <Link
                    href="/saved"
                    className="block px-4 py-3 text-base hover:bg-gray-100 rounded-md text-gray-700 hover:text-gray-900"
                    onClick={toggleMenu}
                  >
                    Sparade Fastigheter
                  </Link>
                  <Link
                    href="/saved-comparisons"
                    className="block px-4 py-3 text-base hover:bg-gray-100 rounded-md text-gray-700 hover:text-gray-900"
                    onClick={toggleMenu}
                  >
                    Jämförelser
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-base hover:bg-gray-100 rounded-md text-gray-700 hover:text-gray-900"
                    onClick={toggleMenu}
                  >
                    Profil
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      signOut()
                      toggleMenu()
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logga ut
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={toggleMenu}>
                    <Button variant="ghost" className="w-full">
                      Logga in
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={toggleMenu}>
                    <Button className="w-full">Registrera</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
