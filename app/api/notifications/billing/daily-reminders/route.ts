import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('es-AR')
}

function formatPeriodLabel(date: Date) {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${month.toString().padStart(2, '0')}/${year}`
}

export async function GET() {
  const admin = createAdminClient()

  const today = new Date()
  const upcomingDate = new Date(today)
  upcomingDate.setDate(today.getDate() + 2)
  const overdueDate = new Date(today)
  overdueDate.setDate(today.getDate() - 2)

  const upcomingStr = upcomingDate.toISOString().slice(0, 10)
  const overdueStr = overdueDate.toISOString().slice(0, 10)

  try {
    // Órdenes mensuales próximas a cobrarse (2 días antes)
    const { data: upcomingOrders, error: upcomingError } = await admin
      .from('orders')
      .select('id, client_id, provider_id, service_id, quotation_id, amount, scheduled_for, status')
      .eq('scheduled_for', upcomingStr)
      .neq('status', 'paid')

    if (upcomingError) {
      console.error('DailyReminders: error fetching upcoming orders', upcomingError)
    }

    // Órdenes mensuales vencidas hace 2 días y aún impagas
    const { data: overdueOrders, error: overdueError } = await admin
      .from('orders')
      .select('id, client_id, provider_id, service_id, quotation_id, amount, scheduled_for, status')
      .eq('scheduled_for', overdueStr)
      .neq('status', 'paid')

    if (overdueError) {
      console.error('DailyReminders: error fetching overdue orders', overdueError)
    }

    const processOrder = async (
      order: any,
      type: 'upcoming' | 'overdue',
    ) => {
      const [clientProfileRes, providerProfileRes, serviceRes, quotationRes] = await Promise.all([
        admin
          .from('profiles')
          .select('full_name, phone')
          .eq('id', order.client_id)
          .maybeSingle(),
        admin
          .from('provider_profiles')
          .select('business_name')
          .eq('id', order.provider_id)
          .maybeSingle(),
        admin
          .from('services')
          .select('name, billing_mode')
          .eq('id', order.service_id)
          .maybeSingle(),
        admin
          .from('quotations')
          .select('client_full_name, requested_billing_mode')
          .eq('id', order.quotation_id)
          .maybeSingle(),
      ])

      const clientProfile = clientProfileRes.data
      const providerProfile = providerProfileRes.data
      const service = serviceRes.data
      const quotation = quotationRes.data

      const clientPhone = clientProfile?.phone?.trim()
      if (!clientPhone) return

      const serviceBillingMode = (service as any)?.billing_mode as string | undefined
      const quotationBillingMode = (quotation as any)?.requested_billing_mode as string | undefined
      const isMonthly = serviceBillingMode === 'monthly' || quotationBillingMode === 'monthly'
      if (!isMonthly) return

      const scheduledDate = new Date(order.scheduled_for as string)

      const clientName = clientProfile?.full_name || quotation?.client_full_name || 'Cliente'
      const planName = (service as any)?.name || 'plan de servicios'
      const providerName = providerProfile?.business_name || 'Proveedor'
      const amountNumber = Number(order.amount) || 0

      if (type === 'upcoming') {
        // subscription_upcoming_charge:
        // {{1}} cliente, {{2}} proveedor, {{3}} plan, {{4}} fecha cobro, {{5}} importe
        await sendWhatsAppTemplate({
          to: clientPhone,
          templateName: 'subscription_upcoming_charge',
          languageCode: 'es_AR',
          variables: [
            clientName,
            providerName,
            planName,
            formatDateLabel(scheduledDate),
            amountNumber.toFixed(2),
          ],
        })
      } else {
        // subscription_overdue:
        // {{1}} cliente, {{2}} plan, {{3}} proveedor, {{4}} período, {{5}} importe
        await sendWhatsAppTemplate({
          to: clientPhone,
          templateName: 'subscription_overdue',
          languageCode: 'es_AR',
          variables: [
            clientName,
            planName,
            providerName,
            formatPeriodLabel(scheduledDate),
            amountNumber.toFixed(2),
          ],
        })
      }
    }

    const upcomingList = upcomingOrders || []
    const overdueList = overdueOrders || []

    for (const order of upcomingList) {
      try {
        await processOrder(order, 'upcoming')
      } catch (e) {
        console.error('DailyReminders: failed processing upcoming order', order.id, e)
      }
    }

    for (const order of overdueList) {
      try {
        await processOrder(order, 'overdue')
      } catch (e) {
        console.error('DailyReminders: failed processing overdue order', order.id, e)
      }
    }

    return NextResponse.json({
      ok: true,
      upcomingProcessed: upcomingList.length,
      overdueProcessed: overdueList.length,
    })
  } catch (e) {
    console.error('DailyReminders: unexpected error', e)
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 })
  }
}
