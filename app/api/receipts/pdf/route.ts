import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const receiptId = url.searchParams.get("receipt_id")

  if (!receiptId) {
    return new NextResponse("Falta receipt_id", { status: 400 })
  }

  const admin = createAdminClient()

  const { data: receipt, error } = await admin
    .from("payment_receipts")
    .select("id, order_id, receipt_number, details, amount, issued_at, client_full_name, client_address, period_month, period_year")
    .eq("id", receiptId)
    .maybeSingle()

  if (error || !receipt) {
    return new NextResponse("Recibo no disponible", { status: 404 })
  }

  const { data: order } = await admin
    .from("orders")
    .select("provider_id")
    .eq("id", receipt.order_id)
    .maybeSingle()

  const { data: providerProfile } = order
    ? await admin
        .from("provider_profiles")
        .select("business_name, address, city, province")
        .eq("id", order.provider_id)
        .maybeSingle()
    : { data: null as any }

  const empresaNombre = (providerProfile as any)?.business_name || "Proveedor de servicios"
  const empresaDomicilioPartes = [
    (providerProfile as any)?.address,
    (providerProfile as any)?.city,
    (providerProfile as any)?.province,
  ].filter(Boolean)
  const empresaDomicilio = empresaDomicilioPartes.join(", ")

  const clientName = (receipt.client_full_name as string) || "Cliente"
  const clientAddress = (receipt.client_address as string) || ""
  const amount = Number(receipt.amount || 0)
  const issuedAt = new Date(receipt.issued_at as string)
  // Siempre usamos el mes/año de la fecha de emisión como período de la cuota
  const periodMonth = issuedAt.getMonth() + 1
  const periodYear = issuedAt.getFullYear()

  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()

  const margin = 40
  const maxWidth = width - margin * 2

  const reciboNumero = receipt.receipt_number as number
  const reciboStr = reciboNumero.toString().padStart(8, "0")

  let y = height - margin

  // Encabezado empresa
  page.drawText(empresaNombre, {
    x: margin,
    y,
    font,
    size: 14,
    color: rgb(0, 0, 0),
  })
  y -= 18

  if (empresaDomicilio) {
    const dirLines = wrapText(empresaDomicilio, font, 9, maxWidth)
    dirLines.forEach((line) => {
      page.drawText(line, { x: margin, y, font, size: 9, color: rgb(0.3, 0.3, 0.3) })
      y -= 11
    })
  }

  y -= 10

  // Recibo N / Fecha emisión
  const fechaStr = `${issuedAt.getDate().toString().padStart(2, "0")}/${(issuedAt.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${issuedAt.getFullYear()}`

  page.drawText(`Recibo N°: ${reciboStr}`, {
    x: margin,
    y,
    font,
    size: 10,
    color: rgb(0, 0, 0),
  })

  page.drawText(`F. Emisión: ${fechaStr}`, {
    x: width / 2,
    y,
    font,
    size: 10,
    color: rgb(0, 0, 0),
  })

  y -= 20

  // Datos del cliente
  page.drawText("Sr.(es):", { x: margin, y, font, size: 10, color: rgb(0, 0, 0) })
  page.drawText(clientName, { x: margin + 50, y, font, size: 10, color: rgb(0, 0, 0) })
  y -= 14

  if (clientAddress) {
    page.drawText("Domicilio:", { x: margin, y, font, size: 10, color: rgb(0, 0, 0) })
    const domLines = wrapText(clientAddress, font, 10, maxWidth - 70)
    let domY = y
    domLines.forEach((line) => {
      page.drawText(line, { x: margin + 65, y: domY, font, size: 10, color: rgb(0, 0, 0) })
      domY -= 12
    })
    y = domY - 6
  }

  // Período (siempre derivado de la fecha de emisión)
  const periodoStr = `${periodMonth.toString().padStart(2, "0")}/${periodYear}`
  page.drawText(`Período: ${periodoStr}`, { x: margin, y, font, size: 10, color: rgb(0, 0, 0) })
  y -= 16

  // Detalle y monto (encabezados)
  const detalleTituloY = y
  page.drawText("Detalle", { x: margin, y: detalleTituloY, font, size: 10, color: rgb(0, 0, 0) })
  const precioColX = width - margin - 80
  page.drawText("Precio", { x: precioColX, y: detalleTituloY, font, size: 10, color: rgb(0, 0, 0) })

  const rawDetails = (receipt.details as string) || ""

  // Primera línea siempre recalculada en base al período actual
  const firstLine = `Pago de servicios sociales - Cuota correspondiente a ${periodMonth}/${periodYear}`

  // El resto del texto lo tomamos desde "Integrantes:" hacia abajo para respetar
  // la estructura original y los espacios previos a "RECUERDE".
  let restText = ""
  const integrantesIndex = rawDetails.indexOf("Integrantes:")
  if (integrantesIndex >= 0) {
    restText = rawDetails.slice(integrantesIndex)
  } else {
    restText = rawDetails
  }

  // Fila principal: detalle de la cuota + importe alineado a la derecha
  y = detalleTituloY - 14
  if (firstLine) {
    page.drawText(firstLine, { x: margin, y, font, size: 10, color: rgb(0, 0, 0) })
  }

  const amountStr = `$${amount.toFixed(2)}`
  page.drawText(amountStr, {
    x: precioColX,
    y,
    font,
    size: 11,
    color: rgb(0, 0, 0),
  })

  // Línea separadora debajo de la fila principal
  y -= 8
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })

  // Espacio en blanco antes del bloque de integrantes / nota
  y -= 14

  const detailLines = restText ? wrapText(restText, font, 10, maxWidth - 90) : []

  detailLines.forEach((line) => {
    if (y < margin + 40) {
      page = pdfDoc.addPage()
      y = height - margin
    }
    page.drawText(line, { x: margin, y, font, size: 10, color: rgb(0, 0, 0) })
    y -= 12
  })

  // Nota final
  y = margin + 20
  const nota =
    "RECUERDE: para mantener la vigencia del seguro de sepelio, este pago debe efectuarse hasta el día 30 de cada mes."
  const notaLines = wrapText(nota, font, 8, maxWidth)
  notaLines.forEach((line) => {
    page.drawText(line, { x: margin, y, font, size: 8, color: rgb(0.3, 0.3, 0.3) })
    y -= 10
  })

  const pdfBytes = await pdfDoc.save()

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Recibo-${reciboStr}.pdf"`,
    },
  })
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split(/\r?\n/)

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("")
      continue
    }

    const words = paragraph.split(/\s+/)
    let currentLine = ""

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, fontSize)
      if (width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}
