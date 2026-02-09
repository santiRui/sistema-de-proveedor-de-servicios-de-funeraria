import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let body: { orderId?: string; reason?: string } | null = null
  try {
    body = (await request.json()) as { orderId?: string; reason?: string } | null
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const orderId = body?.orderId
  const reasonRaw = body?.reason ?? ''
  const reason = reasonRaw.trim()

  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 })
  }

  if (!reason) {
    return NextResponse.json({ error: 'Debes indicar un motivo para la baja' }, { status: 400 })
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, client_id, provider_id, service_id')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Cancel contract: order not found', orderError)
    return NextResponse.json({ error: 'No se encontró la orden' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, parent_provider_id')
    .eq('id', user.id)
    .maybeSingle()

  const isProviderOwner = user.id === order.provider_id
  const isEmployeeOfProvider =
    profile?.role === 'provider_employee' && profile.parent_provider_id === order.provider_id

  if (!isProviderOwner && !isEmployeeOfProvider) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle()

  if (contractError) {
    console.error('Cancel contract: error fetching contract', contractError)
  } else if (contract) {
    const { error: updateContractError } = await admin
      .from('contracts')
      .update({ status: 'cancelled', cancelled_by: 'provider', cancellation_reason: reason })
      .eq('id', contract.id)

    if (updateContractError) {
      console.error('Cancel contract: failed to update contract', updateContractError)
      return NextResponse.json({ error: 'No se pudo actualizar el contrato' }, { status: 500 })
    }
  }

  const { error: orderUpdateError } = await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id)

  if (orderUpdateError) {
    console.error('Cancel contract: failed to update order', orderUpdateError)
    return NextResponse.json({ error: 'No se pudo actualizar la orden' }, { status: 500 })
  }

  // Enviar notificación por WhatsApp al cliente (best-effort, no afecta el resultado de la cancelación)
  try {
    const { data: clientProfile } = await admin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.client_id)
      .maybeSingle()

    const { data: providerProfile } = await admin
      .from('provider_profiles')
      .select('business_name')
      .eq('id', order.provider_id)
      .maybeSingle()

    const { data: service } = await admin
      .from('services')
      .select('name')
      .eq('id', order.service_id)
      .maybeSingle()

    const clientPhone = clientProfile?.phone?.trim()
    if (clientPhone) {
      const clientName = clientProfile?.full_name || 'Cliente'
      const planName = service?.name || 'plan de servicios'
      const providerName = providerProfile?.business_name || 'proveedor'

      // Variables según plantilla plan_cancelled_by_provider:
      // 1 = nombre cliente, 2 = nombre plan, 3 = proveedor, 4 = motivo, 5 = contacto proveedor (teléfono)
      const vars = [
        clientName,
        planName,
        providerName,
        reason,
        '',
      ]

      await sendWhatsAppTemplate({
        to: clientPhone,
        templateName: 'plan_cancelled_by_provider',
        languageCode: 'es_AR',
        variables: vars,
      })
    }
  } catch (e) {
    console.error('Cancel contract: failed to send WhatsApp notification', e)
  }

  return NextResponse.json({ ok: true })
}
