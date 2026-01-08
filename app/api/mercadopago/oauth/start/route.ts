import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth?error=NotAuthenticated', request.url))
  }

  // Solo proveedores (y empleados) deberían llegar acá, pero no bloqueamos por rol para evitar falsos negativos.
  const { data: mpCreds, error: mpError } = await supabase
    .from('provider_mp_credentials')
    .select('mp_client_id, mp_client_secret')
    .eq('provider_id', user.id)
    .maybeSingle()

  if (mpError) {
    console.error('Error reading provider_mp_credentials', mpError)
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpCredentialsReadFailed', request.url))
  }

  if (!mpCreds?.mp_client_id || !mpCreds?.mp_client_secret) {
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpClientIdSecretMissing', request.url))
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    console.error('Missing NEXT_PUBLIC_SITE_URL env var')
    return NextResponse.redirect(new URL('/provider/dashboard?error=MissingSiteUrl', request.url))
  }

  const redirectUri = `${siteUrl.replace(/\/$/, '')}/api/mercadopago/oauth/callback`
  const state = crypto.randomUUID()

  const { error: updateError } = await supabase
    .from('provider_mp_credentials')
    .upsert({
      provider_id: user.id,
      mp_oauth_state: state,
      updated_at: new Date().toISOString(),
    })

  if (updateError) {
    console.error('Error saving mp_oauth_state', updateError)
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpStateSaveFailed', request.url))
  }

  const authUrl = new URL('https://auth.mercadopago.com.ar/authorization')
  authUrl.searchParams.set('client_id', mpCreds.mp_client_id)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('platform_id', 'mp')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(authUrl)
}
