const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0"

if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  // No lanzamos error en import para no romper build; el envío fallará con mensaje claro.
  console.warn("WhatsApp API env vars missing: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID")
}

interface SendTemplateParams {
  to: string
  templateName: string
  languageCode?: string // ej: "es_AR"
  variables?: (string | number | null | undefined)[]
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = "es_AR",
  variables = [],
}: SendTemplateParams): Promise<{ ok: boolean; error?: any }> {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("WhatsApp: faltan variables de entorno necesarias")
    return { ok: false, error: "missing_env" }
  }

  // Normalizar número: eliminar espacios y guiones; asumimos que ya viene con código de país si aplica
  const normalizedTo = to.replace(/\s+/g, "").replace(/-/g, "")

  const components: any[] = []
  if (variables.length > 0) {
    components.push({
      type: "body",
      parameters: variables.map((v) => ({ type: "text", text: String(v ?? "") })),
    })
  }

  const payload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => "")
      console.error("WhatsApp API error", res.status, errorText)
      return { ok: false, error: errorText || res.statusText }
    }

    return { ok: true }
  } catch (e) {
    console.error("WhatsApp API unexpected error", e)
    return { ok: false, error: e }
  }
}
