import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptMpToken } from '@/lib/security/mpToken'

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

  // Cargar email de facturación del perfil del cliente (si existe)
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('billing_email')
    .eq('id', user.id)
    .maybeSingle()

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, client_id, provider_id, service_id, status, proposed_price')
    .eq('id', quotationId)
    .single()

  if (quotationError || !quotation) {
    console.error('Error fetching quotation for subscription', quotationError)
    return NextResponse.json({ error: 'No se pudo cargar la cotización' }, { status: 500 })
  }

  if (quotation.client_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (quotation.status !== 'accepted') {
    return NextResponse.json({ error: 'La cotización debe estar aceptada para crear una suscripción' }, { status: 400 })
  }

  if (!quotation.service_id) {
    return NextResponse.json({ error: 'La cotización no tiene un servicio asociado' }, { status: 400 })
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('name, billing_mode')
    .eq('id', quotation.service_id)
    .maybeSingle()

  if (serviceError || !service) {
    console.error('Error fetching service for subscription', serviceError)
    return NextResponse.json({ error: 'No se pudo cargar el servicio asociado a la cotización' }, { status: 500 })
  }

  if (service.billing_mode !== 'monthly') {
    return NextResponse.json({ error: 'Este servicio no está configurado como mensualidad' }, { status: 400 })
  }

  const amount = quotation.proposed_price != null ? Number(quotation.proposed_price) : NaN
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'La cotización no tiene un importe válido' }, { status: 400 })
  }

  const { data: mpCredsRow, error: mpError } = await supabase
    .from('provider_mp_credentials')
    .select('mp_access_token, mp_access_token_encrypted, mp_access_token_iv')
    .eq('provider_id', quotation.provider_id)
    .maybeSingle()

  if (mpError) {
    console.error('Error reading provider_mp_credentials for subscription', mpError)
    return NextResponse.json({ error: 'No se pudo validar las credenciales de Mercado Pago del proveedor' }, { status: 500 })
  }

  // Obtener access token de forma segura: priorizar cifrado, luego fallback legacy si existiera
  let accessToken: string | null = null

  try {
    if (mpCredsRow?.mp_access_token_encrypted && mpCredsRow.mp_access_token_iv) {
      accessToken = decryptMpToken(mpCredsRow.mp_access_token_encrypted, mpCredsRow.mp_access_token_iv)
    } else if (mpCredsRow?.mp_access_token) {
      // Compatibilidad con datos antiguos en texto plano (idealmente se migrarán)
      accessToken = mpCredsRow.mp_access_token
    }
  } catch (e) {
    console.error('Failed to decrypt provider Mercado Pago access token for subscription', e)
    return NextResponse.json({ error: 'No se pudieron leer las credenciales de Mercado Pago del proveedor' }, { status: 500 })
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'El proveedor aún no configuró correctamente sus credenciales de Mercado Pago' }, { status: 400 })
  }

  // Crear orden local asociada a la suscripción (estado pending)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: user.id,
      provider_id: quotation.provider_id,
      service_id: quotation.service_id,
      quotation_id: quotation.id,
      status: 'pending',
      amount,
      platform_fee: 0, // la comisión se liquida fuera del sistema
      scheduled_for: null,
      paid_at: null,
      payment_reference: null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Error creating order for subscription', orderError)
    return NextResponse.json({ error: 'No se pudo crear la orden local de suscripción' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return NextResponse.json({ error: 'Falta NEXT_PUBLIC_SITE_URL' }, { status: 500 })
  }

  const baseUrl = siteUrl.replace(/\/$/, '')

  const notificationUrl = `${baseUrl}/api/mercadopago/webhook?provider_id=${encodeURIComponent(
    quotation.provider_id,
  )}&order_id=${encodeURIComponent(order.id)}`

  const payerEmail = (clientProfile as any)?.billing_email || user.email || undefined

  const preapprovalBody: any = {
    reason: service.name || 'Suscripción mensual de servicio',
    external_reference: String(order.id),
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'ARS',
    },
    // Mercado Pago requiere el email del pagador para crear la suscripción
    payer_email: payerEmail,
    back_url: `${baseUrl}/client/dashboard?subscription=return`,
    notification_url: notificationUrl,
  }

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preapprovalBody),
  })

  if (!mpRes.ok) {
    const text = await mpRes.text().catch(() => '')
    console.error('Mercado Pago preapproval creation failed', mpRes.status, text)
    return NextResponse.json({ error: 'Mercado Pago rechazó la creación de la suscripción' }, { status: 502 })
  }

  const preapproval = (await mpRes.json().catch(() => null)) as any

  const initPoint = preapproval?.init_point as string | undefined
  // Algunos entornos de Mercado Pago pueden devolver el identificador de la suscripción
  // como `id` o como `preapproval_id`. Tomamos cualquiera de los dos.
  const preapprovalId =
    (preapproval?.preapproval_id as string | undefined) || (preapproval?.id as string | undefined)

  if (!preapprovalId) {
    console.error('Mercado Pago preapproval response missing subscription identifier', preapproval)
  } else {
    await supabase
      .from('orders')
      .update({ subscription_id: preapprovalId })
      .eq('id', order.id)
  }

  if (!initPoint) {
    console.error('Mercado Pago preapproval response missing init_point', preapproval)
    return NextResponse.json({ error: 'Respuesta inválida de Mercado Pago' }, { status: 502 })
  }

  return NextResponse.json({ init_point: initPoint, order_id: order.id })
}
