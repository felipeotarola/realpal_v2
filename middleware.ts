import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Create a response object that we'll use to handle the request
  let response = NextResponse.next()

  try {
    // Create a Supabase client without directly accessing cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name, options) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Lightweight session check - doesn't throw if cookies are invalid
    const { data } = await supabase.auth.getSession()
    
    // Add user info to request headers if available
    if (data?.session?.user) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', data.session.user.id)
      
      // Create a new request with the updated headers
      const updatedRequest = new Request(request.url, {
        headers: requestHeaders,
        method: request.method,
        body: request.body,
        cache: request.cache,
        credentials: request.credentials,
        integrity: request.integrity,
        keepalive: request.keepalive,
        mode: request.mode,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        signal: request.signal,
      })
      
      // Update the response with the new request
      response = NextResponse.next({
        request: updatedRequest,
      })
    }
  } catch (error) {
    // If there's any error processing cookies, just continue with the request
    console.error('Middleware auth error:', error)
  }

  return response
}

// Specify which routes the middleware should run on
export const config = {
  matcher: [
    // Add paths where auth is needed but don't block access
    '/preferences/:path*',
    '/profile/:path*',
    '/saved/:path*',
    '/saved-comparisons/:path*',
    '/compare/:path*',
    '/api/:path*',
  ],
}