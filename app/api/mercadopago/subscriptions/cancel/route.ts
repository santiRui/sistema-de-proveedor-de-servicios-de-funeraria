import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptMpToken } from '@/lib/security/mpToken'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let body: { orderId?: string } | null = null
  try {
    body = (await request.json()) as { orderId?: string } | null
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const orderId = body?.orderId

  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 })
  }

  // 1) Verificar que la orden pertenece al usuario y tiene una suscripción asociada
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, client_id, provider_id, subscription_id')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Cancel subscription: order not found', orderError)
    return NextResponse.json({ error: 'No se encontró la orden' }, { status: 404 })
  }

  if (order.client_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const subscriptionId = (order as any).subscription_id as string | null

  if (!subscriptionId) {
    return NextResponse.json({ error: 'Esta orden no tiene una suscripción activa para cancelar' }, { status: 400 })
  }

  // 2) Leer credenciales de Mercado Pago del proveedor
  const admin = createAdminClient()

  const { data: mpCreds, error: mpError } = await admin
    .from('provider_mp_credentials')
    .select('mp_access_token, mp_access_token_encrypted, mp_access_token_iv')
    .eq('provider_id', order.provider_id)
    .maybeSingle()

  if (mpError) {
    console.error('Cancel subscription: error reading provider_mp_credentials', mpError)
    return NextResponse.json({ error: 'No se pudieron leer las credenciales de Mercado Pago del proveedor' }, { status: 500 })
  }

  let accessToken: string | null = null

  try {
    if (mpCreds?.mp_access_token_encrypted && mpCreds.mp_access_token_iv) {
      accessToken = decryptMpToken(mpCreds.mp_access_token_encrypted, mpCreds.mp_access_token_iv)
    } else if (mpCreds?.mp_access_token) {
      accessToken = mpCreds.mp_access_token
    }
  } catch (e) {
    console.error('Cancel subscription: failed to decrypt provider Mercado Pago access token', e)
    return NextResponse.json({ error: 'No se pudieron leer las credenciales de Mercado Pago del proveedor' }, { status: 500 })
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'El proveedor aún no configuró correctamente sus credenciales de Mercado Pago' }, { status: 400 })
  }

  // 3) Cancelar la suscripción en Mercado Pago
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  if (!mpRes.ok) {
    const text = await mpRes.text().catch(() => '')
    console.error('Mercado Pago subscription cancel failed', mpRes.status, text)
    return NextResponse.json({ error: 'Mercado Pago rechazó la cancelación de la suscripción' }, { status: 502 })
  }

  // 4) Marcar el contrato como cancelado (y opcionalmente dejar registro en la orden)
  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle()

  if (contractError) {
    console.error('Cancel subscription: error fetching contract', contractError)
  } else if (contract) {
    const { error: updateContractError } = await admin
      .from('contracts')
      .update({ status: 'cancelled' })
      .eq('id', contract.id)

    if (updateContractError) {
      console.error('Cancel subscription: failed to update contract status', updateContractError)
    }
  }

  return NextResponse.json({ ok: true })
}
