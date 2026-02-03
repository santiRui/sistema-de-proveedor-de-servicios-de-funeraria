import { NextResponse } from 'next/server'

// Checkout Pro de prueba: crea una preference fija de 100 ARS
// Usa el access token de producción del dueño del sistema.

export async function POST() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!accessToken) {
    console.error('Falta MERCADOPAGO_ACCESS_TOKEN')
    return NextResponse.json({ error: 'Falta MERCADOPAGO_ACCESS_TOKEN' }, { status: 500 })
  }

  if (!siteUrl) {
    console.error('Falta NEXT_PUBLIC_SITE_URL')
    return NextResponse.json({ error: 'Falta NEXT_PUBLIC_SITE_URL' }, { status: 500 })
  }

  const amount = 100

  const preferenceBody = {
    items: [
      {
        title: 'Servicio de prueba',
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      },
    ],
    external_reference: 'test-checkout-100-ars',
    auto_return: 'approved' as const,
    back_urls: {
      success: `${siteUrl.replace(/\/$/, '')}/?payment=success_test`,
      pending: `${siteUrl.replace(/\/$/, '')}/?payment=pending_test`,
      failure: `${siteUrl.replace(/\/$/, '')}/?payment=failure_test`,
    },
  }

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferenceBody),
  })

  if (!mpRes.ok) {
    const text = await mpRes.text().catch(() => '')
    console.error('Mercado Pago preference (test) failed', mpRes.status, text)
    return NextResponse.json({ error: 'Mercado Pago rechazó la creación del pago de prueba' }, { status: 502 })
  }

  const pref = (await mpRes.json().catch(() => null)) as any
  const initPoint = pref?.init_point as string | undefined

  if (!initPoint) {
    console.error('Respuesta de MP sin init_point (test)', pref)
    return NextResponse.json({ error: 'Respuesta inválida de Mercado Pago (test)' }, { status: 502 })
  }

  return NextResponse.json({ init_point: initPoint })
}
