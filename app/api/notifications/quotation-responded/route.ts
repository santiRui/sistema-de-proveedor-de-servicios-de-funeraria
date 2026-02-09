import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

export async function POST(request: Request) {
  let body: { quotationId?: number } | null = null
  try {
    body = (await request.json()) as { quotationId?: number } | null
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const quotationId = body?.quotationId
  if (!quotationId || Number.isNaN(quotationId)) {
    return NextResponse.json({ error: 'quotationId es requerido' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const { data: quotation, error: qError } = await admin
      .from('quotations')
      .select('id, client_full_name, client_phone, provider_id, service_id')
      .eq('id', quotationId)
      .maybeSingle()

    if (qError || !quotation) {
      console.error('WA quotation_responded: quotation not found', qError)
      return NextResponse.json({ ok: false })
    }

    const clientPhone = (quotation as any).client_phone as string | null
    if (!clientPhone) {
      return NextResponse.json({ ok: false })
    }

    const { data: providerProfile } = await admin
      .from('provider_profiles')
      .select('business_name')
      .eq('id', quotation.provider_id)
      .maybeSingle()

    const { data: service } = await admin
      .from('services')
      .select('name')
      .eq('id', quotation.service_id)
      .maybeSingle()

    const clientName = (quotation as any).client_full_name || 'Cliente'
    const providerName = providerProfile?.business_name || 'Proveedor'
    const planName = service?.name || 'plan de servicios'

    // quotation_responded: {{1}} = cliente, {{2}} = proveedor, {{3}} = plan
    await sendWhatsAppTemplate({
      to: clientPhone,
      templateName: 'quotation_responded',
      languageCode: 'es_AR',
      variables: [clientName, providerName, planName],
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('WA quotation_responded: unexpected error', e)
    return NextResponse.json({ ok: false })
  }
}
