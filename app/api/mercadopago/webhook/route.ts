import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type WebhookPayload = {
  type?: string
  action?: string
  data?: {
    id?: string | number
  }
}

type PaymentResponse = {
  id: number
  status: string
  external_reference?: string
  date_approved?: string | null
}

async function fetchPaymentDetail(accessToken: string, paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MP payment fetch failed: ${res.status} ${text}`)
  }

  return (await res.json()) as PaymentResponse
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const providerId = url.searchParams.get('provider_id')
  const orderId = url.searchParams.get('order_id')

  const payload = (await request.json().catch(() => null)) as WebhookPayload | null
  const paymentIdRaw = payload?.data?.id
  const paymentId = paymentIdRaw != null ? String(paymentIdRaw) : null

  if (!paymentId || (payload?.type && payload.type !== 'payment')) {
    return NextResponse.json({ received: true })
  }

  if (!providerId || !orderId) {
    return NextResponse.json({ received: true })
  }

  await handlePaymentNotification({ providerId, orderId, paymentId })
  return NextResponse.json({ received: true })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const paymentId = url.searchParams.get('id') || url.searchParams.get('data.id')
  const topic = url.searchParams.get('topic') || url.searchParams.get('type')
  const providerId = url.searchParams.get('provider_id')
  const orderId = url.searchParams.get('order_id')

  if (!paymentId || (topic && topic !== 'payment')) {
    return NextResponse.json({ received: true })
  }

  if (!providerId || !orderId) {
    return NextResponse.json({ received: true })
  }

  await handlePaymentNotification({ providerId, orderId, paymentId })
  return NextResponse.json({ received: true })
}

async function handlePaymentNotification(params: { providerId: string; orderId: string; paymentId: string }) {
  const admin = createAdminClient()

  const { data: mpCreds, error: mpError } = await admin
    .from('provider_mp_credentials')
    .select('mp_access_token')
    .eq('provider_id', params.providerId)
    .maybeSingle()

  if (mpError || !mpCreds?.mp_access_token) {
    console.error('Webhook: missing provider mp_access_token', mpError)
    return
  }

  let payment: PaymentResponse
  try {
    payment = await fetchPaymentDetail(mpCreds.mp_access_token, params.paymentId)
  } catch (e) {
    console.error('Webhook: failed fetching payment', e)
    return
  }

  const externalRef = payment.external_reference || null
  if (externalRef && externalRef !== params.orderId) {
    console.warn('Webhook: external_reference mismatch', { externalRef, orderId: params.orderId })
    return
  }

  if (payment.status !== 'approved') {
    return
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, status, quotation_id')
    .eq('id', params.orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Webhook: order not found', orderError)
    return
  }

  if (order.status === 'paid') {
    return
  }

  const paidAt = payment.date_approved ? new Date(payment.date_approved).toISOString() : new Date().toISOString()

  const { error: updateError } = await admin
    .from('orders')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_reference: String(payment.id),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)

  if (updateError) {
    console.error('Webhook: failed updating order', updateError)
    return
  }

  const { data: existingContract } = await admin
    .from('contracts')
    .select('id')
    .eq('order_id', params.orderId)
    .maybeSingle()

  if (!existingContract) {
    const contractNumber = `CT-${new Date().getFullYear()}-${params.orderId}`
    const { error: contractError } = await admin.from('contracts').insert({
      order_id: params.orderId,
      contract_number: contractNumber,
      status: 'active',
      contract_text: null,
    })

    if (contractError) {
      console.error('Webhook: failed creating contract', contractError)
    }
  }

  if (order.quotation_id) {
    await admin
      .from('quotations')
      .update({ status: 'accepted', client_deleted_at: new Date().toISOString() })
      .eq('id', order.quotation_id)
  }
}
