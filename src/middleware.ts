import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const publicPaths = ['/login', '/signup', '/auth/callback', '/invite', '/docs', '/contact', '/about', '/privacy', '/terms', '/cookies', '/guide', '/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/auth/figma') ||
    pathname.startsWith('/api/auth/google-calendar') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/notifications/track') ||
    pathname.startsWith('/api/contact') ||
    pathname.startsWith('/api/newsletter') ||
    pathname.startsWith('/api/meet') ||
    pathname.startsWith('/meet') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const { user, supabaseResponse } = await updateSession(request)

  // Allow public paths
  const isPublic = publicPaths.some(p => p === '/' ? pathname === '/' : pathname.startsWith(p))
  if (isPublic) {
    if (user && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Super admin paths: require auth + super admin flag
  if (pathname.startsWith('/super-admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url))
    }
    const isSuperAdmin = user.app_metadata?.is_super_admin === true
    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Portal paths
  if (pathname.startsWith('/portal')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url))
    }
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
