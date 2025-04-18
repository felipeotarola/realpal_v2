"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export const NavBar = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto py-4 px-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-gray-800">
          RealPal
        </Link>

        <div className="flex items-center space-x-4">
          <Link href="/" className="text-gray-600 hover:text-gray-800">
            Hem
          </Link>
          {user ? (
            <>
              <Link href="/saved" className="text-gray-600 hover:text-gray-800">
                Sparade
              </Link>
              <Link href="/saved-comparisons" className="text-gray-600 hover:text-gray-800">
                Jämförelser
              </Link>
              <Link href="/preferences" className="text-gray-600 hover:text-gray-800">
                Preferenser
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
      </div>
    </nav>
  )
}
