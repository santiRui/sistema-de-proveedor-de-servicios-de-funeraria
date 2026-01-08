'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProviderProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'No autorizado' }

  // Datos generales (tabla profiles)
  const full_name = formData.get('business_name') as string // Sincronizamos business_name con full_name para display
  const phone = formData.get('phone') as string
  const country = formData.get('country') as string
  const province = formData.get('province') as string
  const city = formData.get('city') as string
  
  // Datos específicos (tabla provider_profiles)
  const business_name = formData.get('business_name') as string
  const cuit = formData.get('cuit') as string
  const description = formData.get('description') as string
  const address = formData.get('address') as string
  const service_areas_json = formData.get('service_areas') as string
  const cover_image_url = formData.get('cover_image_url') as string
  
  let service_areas: string[] = []
  try {
    service_areas = JSON.parse(service_areas_json)
  } catch {}

  // 1. Actualizar perfil base
  const { error: errorBase } = await supabase
    .from('profiles')
    .update({
      full_name, // Usamos nombre comercial como nombre de display
      phone,
      country: country || 'Argentina',
      province,
      city,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (errorBase) return { error: errorBase.message }

  // 2. Actualizar o Crear perfil proveedor (UPSERT)
  const { error: errorProvider } = await supabase
    .from('provider_profiles')
    .upsert({
      id: user.id, // Necesario para el upsert
      business_name,
      cuit,
      description,
      address,
      cover_image_url: cover_image_url || null,
      service_areas,
      updated_at: new Date().toISOString()
    })

  if (errorProvider) {
    console.error('Error updating provider profile:', errorProvider)
    return { error: errorProvider.message }
  }

  // 3. Asegurar registro para OAuth Marketplace (tabla privada)
  const { error: mpError } = await supabase.from('provider_mp_credentials').upsert({
    provider_id: user.id,
    updated_at: new Date().toISOString(),
  })

  if (mpError) {
    console.error('Error ensuring provider Mercado Pago record:', mpError)
    return { error: mpError.message }
  }

  revalidatePath('/provider/dashboard')
  return { success: true, message: 'Perfil actualizado correctamente' }
}

export async function getProviderProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // 1. Obtener datos base del perfil
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
  }

  // 2. Obtener datos específicos del proveedor
  const { data: providerData, error: providerError } = await supabase
    .from('provider_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (providerError) {
    console.error('Error fetching provider profile:', providerError)
  }

  const { data: mpData, error: mpError } = await supabase
    .from('provider_mp_credentials')
    .select('mp_user_id, mp_connected_at')
    .eq('provider_id', user.id)
    .maybeSingle()

  if (mpError) {
    console.error('Error fetching provider Mercado Pago credentials:', mpError)
  }
  
  // Combinar datos, dando prioridad a providerData si hay conflictos, 
  // pero asegurando que usamos los campos correctos de cada lado.
  return {
    ...providerData,
    // Campos que vienen de profiles (tabla base)
    phone: profileData?.phone || providerData?.phone, // Fallback
    country: profileData?.country,
    province: profileData?.province,
    city: profileData?.city, // Este es el Departamento/Partido
    email: user.email,
    // Campos específicos de provider que ya están en ...providerData
    business_name: providerData?.business_name,
    cuit: providerData?.cuit,
    description: providerData?.description,
    address: providerData?.address,
    service_areas: providerData?.service_areas,
    verified: providerData?.verified,
    cover_image_url: providerData?.cover_image_url,
    mp_user_id: (mpData as any)?.mp_user_id,
    mp_connected_at: (mpData as any)?.mp_connected_at,
  }
}
