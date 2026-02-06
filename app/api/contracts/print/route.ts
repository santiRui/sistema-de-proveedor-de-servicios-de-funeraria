import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
    const message = error ? "No se pudo cargar el contrato" : "Contrato no disponible para esta orden"
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8" /><title>Contrato</title></head><body><p>${message}</p></body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    )
  }

  const contractText = contract.contract_text as string
  const contractNumber = (contract.contract_number as string) || null

  const safeText = contractText.replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const title = contractNumber ? `Contrato ${contractNumber}` : "Contrato de prestación de servicios"

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px auto; max-width: 820px; color: #111827; background: #f3f4f6; }
      .sheet { background: white; padding: 32px 40px; box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12); border-radius: 8px; }
      h1 { font-size: 1.4rem; margin-bottom: 0.25rem; text-align: center; letter-spacing: 0.03em; text-transform: uppercase; }
      .subtitle { font-size: 0.9rem; color: #6b7280; margin-bottom: 1.75rem; text-align: center; }
      .toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
      .print-button { font-size: 0.85rem; padding: 6px 12px; border-radius: 999px; border: 1px solid #d1d5db; background: white; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; color: #374151; }
      .print-button:hover { background: #f3f4f6; }
      .content { white-space: pre-wrap; line-height: 1.6; font-size: 0.95rem; }
      .content section + section { margin-top: 1.25rem; }
      @media print {
        body { margin: 0; background: white; }
        .sheet { box-shadow: none; border-radius: 0; }
        .toolbar { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="print-button" onclick="window.print()">🖨 Imprimir</button>
    </div>
    <div class="sheet">
      <h1>${title}</h1>
      <div class="subtitle">Documento generado desde Memorial Home. Conservá una copia para tus registros.</div>
      <div class="content">${safeText}</div>
    </div>
  </body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}
