import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  user_id?: number
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth?error=NotAuthenticated', request.url))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/provider/dashboard?error=MissingCodeOrState', request.url))
  }

  const { data: mpCreds, error: mpError } = await supabase
    .from('provider_mp_credentials')
    .select('mp_client_id, mp_client_secret, mp_oauth_state')
    .eq('provider_id', user.id)
    .maybeSingle()

  if (mpError) {
    console.error('Error reading provider_mp_credentials', mpError)
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpCredentialsReadFailed', request.url))
  }

  if (!mpCreds?.mp_client_id || !mpCreds?.mp_client_secret) {
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpClientIdSecretMissing', request.url))
  }

  if (!mpCreds?.mp_oauth_state || mpCreds.mp_oauth_state !== state) {
    return NextResponse.redirect(new URL('/provider/dashboard?error=InvalidState', request.url))
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    console.error('Missing NEXT_PUBLIC_SITE_URL env var')
    return NextResponse.redirect(new URL('/provider/dashboard?error=MissingSiteUrl', request.url))
  }

  const redirectUri = `${siteUrl.replace(/\/$/, '')}/api/mercadopago/oauth/callback`

  const body = new URLSearchParams()
  body.set('client_id', mpCreds.mp_client_id)
  body.set('client_secret', mpCreds.mp_client_secret)
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', redirectUri)

  const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text().catch(() => '')
    console.error('Mercado Pago token exchange failed', tokenRes.status, errorText)
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpTokenExchangeFailed', request.url))
  }

  const tokenJson = (await tokenRes.json().catch(() => null)) as TokenResponse | null

  if (!tokenJson?.access_token) {
    console.error('Invalid token response from Mercado Pago', tokenJson)
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpInvalidTokenResponse', request.url))
  }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
    : null

  const { error: saveError } = await supabase
    .from('provider_mp_credentials')
    .update({
      mp_access_token: tokenJson.access_token,
      mp_refresh_token: tokenJson.refresh_token || null,
      mp_user_id: tokenJson.user_id ?? null,
      mp_token_expires_at: expiresAt,
      mp_connected_at: new Date().toISOString(),
      mp_oauth_state: null,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_id', user.id)

  if (saveError) {
    console.error('Error saving Mercado Pago tokens', saveError)
    return NextResponse.redirect(new URL('/provider/dashboard?error=MpTokenSaveFailed', request.url))
  }

  return NextResponse.redirect(new URL('/provider/dashboard?success=MercadoPagoConnected', request.url))
}
