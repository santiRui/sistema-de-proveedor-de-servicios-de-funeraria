import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Body = {
  quotationId?: number
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Body | null
  const quotationId = body?.quotationId

  if (!quotationId || typeof quotationId !== 'number') {
    return NextResponse.json({ error: 'quotationId es requerido' }, { status: 400 })
  }

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, client_id, provider_id, service_id, status, proposed_price')
    .eq('id', quotationId)
    .single()

  if (quotationError || !quotation) {
    console.error('Error fetching quotation for checkout', quotationError)
    return NextResponse.json({ error: 'No se pudo cargar la cotización' }, { status: 500 })
  }

  if (quotation.client_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (quotation.status !== 'accepted') {
    return NextResponse.json({ error: 'La cotización debe estar aceptada para pagar' }, { status: 400 })
  }

  const amount = quotation.proposed_price != null ? Number(quotation.proposed_price) : NaN
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'La cotización no tiene un importe válido' }, { status: 400 })
  }

  const platformFee = Math.round(amount * 0.1 * 100) / 100

  const { data: service } = await supabase
    .from('services')
    .select('name')
    .eq('id', quotation.service_id)
    .maybeSingle()

  const { data: mpCreds, error: mpError } = await supabase
    .from('provider_mp_credentials')
    .select('mp_access_token, mp_user_id')
    .eq('provider_id', quotation.provider_id)
    .maybeSingle()

  if (mpError) {
    console.error('Error reading provider_mp_credentials for checkout', mpError)
    return NextResponse.json({ error: 'No se pudo validar la conexión del proveedor' }, { status: 500 })
  }

  if (!mpCreds?.mp_access_token || !mpCreds?.mp_user_id) {
    return NextResponse.json({ error: 'El proveedor aún no conectó Mercado Pago' }, { status: 400 })
  }

  // 1) Crear orden en estado pending (el webhook la marcará paid)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: user.id,
      provider_id: quotation.provider_id,
      service_id: quotation.service_id,
      quotation_id: quotation.id,
      status: 'pending',
      amount,
      platform_fee: platformFee,
      scheduled_for: null,
      paid_at: null,
      payment_reference: null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Error creating order for checkout', orderError)
    return NextResponse.json({ error: 'No se pudo crear la orden' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return NextResponse.json({ error: 'Falta NEXT_PUBLIC_SITE_URL' }, { status: 500 })
  }

  const notificationUrl = `${siteUrl.replace(/\/$/, '')}/api/mercadopago/webhook?provider_id=${encodeURIComponent(
    quotation.provider_id,
  )}&order_id=${encodeURIComponent(order.id)}`

  const preferenceBody: any = {
    items: [
      {
        title: service?.name || 'Servicio',
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      },
    ],
    marketplace_fee: platformFee,
    external_reference: order.id,
    notification_url: notificationUrl,
    metadata: {
      order_id: order.id,
      quotation_id: quotation.id,
    },
    auto_return: 'approved',
    back_urls: {
      success: `${siteUrl.replace(/\/$/, '')}/client/dashboard?payment=success`,
      pending: `${siteUrl.replace(/\/$/, '')}/client/dashboard?payment=pending`,
      failure: `${siteUrl.replace(/\/$/, '')}/client/dashboard?payment=failure`,
    },
  }

  // Nota: marketplace_fee cobra automáticamente la comisión del marketplace.

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mpCreds.mp_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferenceBody),
  })

  if (!mpRes.ok) {
    const text = await mpRes.text().catch(() => '')
    console.error('Mercado Pago preference creation failed', mpRes.status, text)
    return NextResponse.json({ error: 'Mercado Pago rechazó la creación del pago' }, { status: 502 })
  }

  const pref = (await mpRes.json().catch(() => null)) as any

  const initPoint = pref?.init_point as string | undefined
  const prefId = pref?.id as string | undefined

  if (prefId) {
    await supabase.from('orders').update({ payment_reference: prefId }).eq('id', order.id)
  }

  if (!initPoint) {
    console.error('Mercado Pago response missing init_point', pref)
    return NextResponse.json({ error: 'Respuesta inválida de Mercado Pago' }, { status: 502 })
  }

  return NextResponse.json({ init_point: initPoint, order_id: order.id })
}
