'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/portal" className="flex items-center gap-2">
            <img src="/logo.png" alt="Agency Beats" className="h-9 w-auto rounded" />
            <span className="font-semibold">Agency Beats</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Client Portal
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {pathname !== '/portal' && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/portal">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  My Brands
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
