import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

export async function POST(request: Request) {
  let body: { quotationId?: number } | null = null
  try {
    body = (await request.json()) as { quotationId?: number } | null
  } catch (e) {
    console.error('WA quotation_responded: error parsing body', e)
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const quotationId = body?.quotationId
  console.log('WA quotation_responded: incoming request', { quotationId })

  if (!quotationId || Number.isNaN(quotationId)) {
    console.warn('WA quotation_responded: missing or invalid quotationId', { quotationId })
    return NextResponse.json({ error: 'quotationId es requerido' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const { data: quotation, error: qError } = await admin
      .from('quotations')
      .select('id, client_full_name, client_phone, provider_id, service_id')
      .eq('id', quotationId)
      .maybeSingle()

    console.log('WA quotation_responded: quotation lookup result', {
      quotationId,
      hasQuotation: !!quotation,
      qError,
    })

    if (qError || !quotation) {
      console.error('WA quotation_responded: quotation not found', { quotationId, qError })
      return NextResponse.json({ ok: false })
    }

    const clientPhone = (quotation as any).client_phone as string | null
    if (!clientPhone) {
      console.warn('WA quotation_responded: quotation has no client_phone', {
        quotationId,
        quotation,
      })
      return NextResponse.json({ ok: false })
    }

    const { data: providerProfile, error: providerError } = await admin
      .from('provider_profiles')
      .select('business_name')
      .eq('id', quotation.provider_id)
      .maybeSingle()

    if (providerError) {
      console.error('WA quotation_responded: error loading provider profile', {
        quotationId,
        providerId: quotation.provider_id,
        providerError,
      })
    }

    const { data: service, error: serviceError } = await admin
      .from('services')
      .select('name')
      .eq('id', quotation.service_id)
      .maybeSingle()

    if (serviceError) {
      console.error('WA quotation_responded: error loading service', {
        quotationId,
        serviceId: quotation.service_id,
        serviceError,
      })
    }

    const clientName = (quotation as any).client_full_name || 'Cliente'
    const providerName = providerProfile?.business_name || 'Proveedor'
    const planName = service?.name || 'plan de servicios'

    console.log('WA quotation_responded: prepared WhatsApp payload', {
      to: clientPhone,
      clientName,
      providerName,
      planName,
    })

    // quotation_responded: {{1}} = cliente, {{2}} = proveedor, {{3}} = plan
    const result = await sendWhatsAppTemplate({
      to: clientPhone,
      templateName: 'quotation_responded',
      languageCode: 'es_AR',
      variables: [clientName, providerName, planName],
    })

    console.log('WA quotation_responded: WhatsApp send result', {
      quotationId,
      ok: result.ok,
      error: result.error,
    })

    return NextResponse.json({ ok: result.ok })
  } catch (e) {
    console.error('WA quotation_responded: unexpected error', e)
    return NextResponse.json({ ok: false })
  }
}
