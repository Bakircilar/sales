// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    // Supabase URL ve key'i doğrudan belirtin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials are missing')
      return res
    }
    
    const supabase = createMiddlewareClient({ req, res })
    
    const { data: { session } } = await supabase.auth.getSession()
    
    // URL yollarını kontrol et
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')
    
    // Oturum yoksa ve auth sayfasında değilse, login sayfasına yönlendir
    if (!session && !isAuthPage && !isApiRoute) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
    
    // Oturum varsa ve auth sayfasındaysa, dashboard'a yönlendir
    if (session && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  } catch (error) {
    console.error('Middleware error:', error)
  }
  
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}