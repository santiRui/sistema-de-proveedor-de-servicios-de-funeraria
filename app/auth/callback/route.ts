import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  // A donde redirigir después de loguearse (por defecto al dashboard client)
  const next = searchParams.get('next') ?? '/client/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // Intercambia el código de verificación por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Si algo falla, volver al login
  return NextResponse.redirect(new URL('/auth?error=VerificationFailed', request.url))
}
