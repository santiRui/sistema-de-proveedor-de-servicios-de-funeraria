import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptMpToken } from '@/lib/security/mpToken'

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

  // Aceptamos notificaciones tanto de pagos únicos como de suscripciones
  const allowedTypes = new Set(['payment', 'authorized_payment'])

  if (!paymentId || (payload?.type && !allowedTypes.has(payload.type))) {
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

  const allowedTopics = new Set(['payment', 'authorized_payment'])

  if (!paymentId || (topic && !allowedTopics.has(topic))) {
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
    .select('mp_access_token, mp_access_token_encrypted, mp_access_token_iv')
    .eq('provider_id', params.providerId)
    .maybeSingle()

  if (mpError) {
    console.error('Webhook: error reading provider_mp_credentials', mpError)
    return
  }

  // Obtener access token de forma segura: priorizar cifrado, luego fallback legacy si existiera
  let accessToken: string | null = null

  try {
    if (mpCreds?.mp_access_token_encrypted && mpCreds.mp_access_token_iv) {
      accessToken = decryptMpToken(mpCreds.mp_access_token_encrypted, mpCreds.mp_access_token_iv)
    } else if (mpCreds?.mp_access_token) {
      // Compatibilidad con datos antiguos en texto plano (idealmente se migrarán)
      accessToken = mpCreds.mp_access_token
    }
  } catch (e) {
    console.error('Webhook: failed to decrypt provider Mercado Pago access token', e)
    return
  }

  if (!accessToken) {
    console.error('Webhook: missing provider mp_access_token (none decrypted or legacy)')
    return
  }

  let payment: PaymentResponse
  try {
    payment = await fetchPaymentDetail(accessToken, params.paymentId)
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
    .select('id, status, quotation_id, client_id, provider_id, service_id, paid_at, amount')
    .eq('id', params.orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Webhook: order not found', orderError)
    return
  }

  const paidAt = payment.date_approved ? new Date(payment.date_approved).toISOString() : new Date().toISOString()
  const paidDate = new Date(order.paid_at || paidAt)

  const { data: quotation } = await admin
    .from('quotations')
    .select(
      'id, client_full_name, client_dni, client_address, client_age, family_members, requested_billing_mode, provider_id, service_id',
    )
    .eq('id', order.quotation_id)
    .maybeSingle()

  const { data: service } = await admin
    .from('services')
    .select('id, name, description, billing_mode')
    .eq('id', order.service_id)
    .maybeSingle()

  const { data: providerProfile } = await admin
    .from('provider_profiles')
    .select('id, business_name, address, city, province')
    .eq('id', order.provider_id)
    .maybeSingle()

  const meses = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ]

  // Si la orden aún no estaba marcada como pagada, la actualizamos y creamos el contrato si falta
  if (order.status !== 'paid') {
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
      const titularNombre = (quotation as any)?.client_full_name || ''
      const titularDni = (quotation as any)?.client_dni || ''
      const titularDomicilio = (quotation as any)?.client_address || ''
      const titularEdad = (quotation as any)?.client_age
        ? String((quotation as any).client_age)
        : ''

      const convenioNombre = (service as any)?.name || 'PLAN DE SERVICIO'
      const descripcionServicio = (service as any)?.description || ''

      const empresaNombre = (providerProfile as any)?.business_name || 'Proveedor de servicios'
      const empresaDomicilioPartes = [
        (providerProfile as any)?.address,
        (providerProfile as any)?.city,
        (providerProfile as any)?.province,
      ].filter(Boolean)
      const empresaDomicilio = empresaDomicilioPartes.join(', ')

      const ciudadContrato = (providerProfile as any)?.city || 'Salta'

      const grupoFamiliar = Array.isArray((quotation as any)?.family_members)
        ? ((quotation as any).family_members as any[])
        : []

      const integrantesLineas = [
        `${titularNombre} - DNI ${titularDni || 's/d'} - Titular`,
        ...grupoFamiliar.map((m: any) => {
          const nombre = m.full_name || m.nombre || ''
          const dni = m.dni || m.documento || ''
          const edad = m.age != null ? ` - Edad ${m.age}` : ''
          return `${nombre} - DNI ${dni || 's/d'}${edad}`
        }),
      ]

      const integrantesTexto = integrantesLineas.join('\n')

      const dia = paidDate.getDate()
      const mes = meses[paidDate.getMonth()] || ''
      const anio = paidDate.getFullYear()

      const modalidad =
        (quotation as any)?.requested_billing_mode === 'monthly'
          ? 'Póliza mensual (suscripción)'
          : 'Pago único por el servicio detallado'

      const encabezado = 'SOLICITUD DE ALTA\nDeclaración Jurada\n\n'

      const bloqueConvenio =
        `Convenio: ${convenioNombre}\n` +
        `Nombre del Titular: ${titularNombre}\n` +
        `Domicilio: ${titularDomicilio}\n` +
        `Modalidad de pago: ${modalidad}\n\n`

      const bloqueFechaLugar = `${ciudadContrato}, ${dia} de ${mes} de ${anio}\n\n`

      const bloqueIntro =
        `El que suscribe ${titularNombre} en calidad de titular, con Documento N° ${titularDni}` +
        (titularEdad ? `, de ${titularEdad} años` : '') +
        ` y con domicilio en ${titularDomicilio}, solicita a ${empresaNombre}` +
        (empresaDomicilio ? `, con domicilio en ${empresaDomicilio},` : ',') +
        ' la provisión de servicios sociales de acuerdo a lo establecido en este contrato para todas las personas individualizadas a continuación, con las condiciones y cláusulas que se encuentran al reverso de esta hoja.\n\n'

      const bloqueIntegrantes = `Integrantes del grupo familiar incluidos en el convenio:\n${integrantesTexto}\n\n`

      const bloqueNota =
        'NOTA: Los afiliados solo cuentan con los servicios que tienen fecha de vigencia. ' +
        'Los servicios que no figuran en el presente contrato no han sido contratados.\n\n'

      const bloqueCaracteristicas =
        `Características del servicio: Incluye ${descripcionServicio || 'las prestaciones detalladas en el plan contratado.'}`

      const contractText =
        encabezado +
        bloqueConvenio +
        bloqueFechaLugar +
        bloqueIntro +
        bloqueIntegrantes +
        bloqueNota +
        bloqueCaracteristicas

      const contractNumber = `CT-${new Date().getFullYear()}-${params.orderId}`

      const { error: contractError } = await admin.from('contracts').insert({
        order_id: params.orderId,
        contract_number: contractNumber,
        status: 'active',
        contract_text: contractText,
      })

      if (contractError) {
        console.error('Webhook: failed creating contract', contractError)
      }
    }
  }

  // Generar comprobante de pago (recibo) para este pago aprobado
  try {
    const titularNombre = (quotation as any)?.client_full_name || ''
    const titularDomicilio = (quotation as any)?.client_address || ''

    const grupoFamiliar = Array.isArray((quotation as any)?.family_members)
      ? ((quotation as any).family_members as any[])
      : []

    const integrantesLineas = [
      titularNombre ? `${titularNombre} - Titular` : 'Titular',
      ...grupoFamiliar.map((m: any) => {
        const nombre = m.full_name || m.nombre || ''
        const dni = m.dni || m.documento || ''
        const edad = m.age != null ? ` - Edad ${m.age}` : ''
        const base = nombre || 'Integrante'
        return `${base}${dni ? ` - DNI ${dni}` : ''}${edad}`
      }),
    ]

    const integrantesTextoRecibo = integrantesLineas.join('\n')

    const esMensual = (service as any)?.billing_mode === 'monthly'
    const periodoMes = esMensual ? paidDate.getMonth() + 1 : null
    const periodoAnio = esMensual ? paidDate.getFullYear() : null

    const detallePrincipal = esMensual
      ? `Pago de servicios sociales - Cuota correspondiente a ${paidDate.getMonth() + 1}/${paidDate.getFullYear()}`
      : 'Pago por servicio contratado'

    const avisoVencimiento =
      'RECUERDE: para mantener la vigencia del seguro de sepelio, este pago debe efectuarse hasta el día 30 de cada mes.'

    const detalles = `${detallePrincipal}\n\nIntegrantes:\n${integrantesTextoRecibo}\n\n${avisoVencimiento}`

    await admin.from('payment_receipts').insert({
      order_id: params.orderId,
      mp_payment_id: String(payment.id),
      client_full_name: titularNombre || null,
      client_address: titularDomicilio || null,
      amount: Number((order as any).amount) || 0,
      issued_at: paidDate.toISOString(),
      period_month: periodoMes,
      period_year: periodoAnio,
      details: detalles,
    })
  } catch (e) {
    // Evitar que un error de recibo rompa el flujo de pago
    console.error('Webhook: failed creating payment receipt', e)
  }

  if (order.quotation_id) {
    await admin
      .from('quotations')
      .update({ status: 'accepted', client_deleted_at: new Date().toISOString() })
      .eq('id', order.quotation_id)
  }
}
