import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get("order_id")

  if (!orderId) {
    return new NextResponse("Falta order_id", { status: 400 })
  }

  const admin = createAdminClient()

  const { data: contract, error } = await admin
    .from("contracts")
    .select("contract_text, contract_number")
    .eq("order_id", orderId)
    .maybeSingle()

  if (error || !contract?.contract_text) {
    return new NextResponse("Contrato no disponible", { status: 404 })
  }

  const contractText = contract.contract_text as string
  const contractNumber = (contract.contract_number as string) || undefined

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()

  const margin = 50
  const maxWidth = width - margin * 2

  const title = contractNumber ? `CONTRATO ${contractNumber}` : "CONTRATO"

  let y = height - margin

  page.drawText(title, {
    x: margin,
    y,
    font,
    size: 14,
    color: rgb(0, 0, 0),
  })

  y -= 24

  const subtitle = "Documento generado desde Memorial Home. Conservá una copia para tus registros."
  const subtitleLines = wrapText(subtitle, font, 9, maxWidth)
  subtitleLines.forEach((line) => {
    page.drawText(line, { x: margin, y, font, size: 9, color: rgb(0.4, 0.4, 0.4) })
    y -= 12
  })

  y -= 12

  const bodyLines = wrapText(contractText, font, 11, maxWidth)

  bodyLines.forEach((line) => {
    if (y < margin) {
      y = height - margin
      const newPage = pdfDoc.addPage()
      ;(page as any) = newPage
    }
    page.drawText(line, { x: margin, y, font, size: 11, color: rgb(0, 0, 0) })
    y -= 14
  })

  const pdfBytes = await pdfDoc.save()

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${(contractNumber || "contrato")}.pdf"`,
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
