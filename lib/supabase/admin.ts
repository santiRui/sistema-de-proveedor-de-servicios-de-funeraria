import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase con Service Role Key, SOLO para uso en el servidor.
// Asegúrate de definir SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del proyecto.

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceKey)
}
