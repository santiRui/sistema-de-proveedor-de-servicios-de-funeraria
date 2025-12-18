'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Obtener estadísticas para el dashboard
export async function getAdminStats() {
  const supabase = await createClient()

  const { count: providersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'provider')

  const { count: clientsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'client')

  const { count: verifiedProviders } = await supabase
    .from('provider_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true)
    
  const { count: pendingProviders } = await supabase
    .from('provider_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verified', false)

  return {
    totalProviders: providersCount || 0,
    totalClients: clientsCount || 0,
    verifiedProviders: verifiedProviders || 0,
    pendingProviders: pendingProviders || 0
  }
}

// Obtener lista de proveedores con sus datos
export async function getProvidersList() {
  const supabase = await createClient()

  // 1. Traer perfiles de proveedor
  const { data: providerProfiles, error: providerError } = await supabase
    .from('provider_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (providerError) {
    console.error('Error fetching provider profiles:', providerError)
    return []
  }

  if (!providerProfiles || providerProfiles.length === 0) {
    console.log('[getProvidersList] No provider_profiles encontrados')
    return []
  }

  // 2. Traer datos base de los perfiles correspondientes
  const providerIds = providerProfiles.map(p => p.id)
  console.log('[getProvidersList] provider_profiles IDs:', providerIds)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, province, city, phone')
    .in('id', providerIds)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return []
  }

  // 3. Unir datos (incluyendo campos extra para la vista de detalle)
  console.log('[getProvidersList] Total providers combinados:', providerProfiles.length)
  return providerProfiles.map(p => {
    const profile = profiles?.find(prof => prof.id === p.id)
    return {
      id: p.id,
      business_name: p.business_name,
      cuit: p.cuit,
      description: p.description,
      address: p.address,
      service_areas: p.service_areas,
      verified: p.verified,
      // Datos del perfil base o fallbacks
      email: profile?.email,
      full_name: profile?.full_name,
      phone: profile?.phone,
      province: profile?.province,
      city: profile?.city,
      created_at: p.created_at
    }
  })
}

// Verificar (activar) un proveedor
export async function verifyProvider(providerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('provider_profiles')
    .update({ verified: true })
    .eq('id', providerId)

  if (error) return { error: error.message }

  revalidatePath('/admin/providers')
  return { success: true }
}

// Rechazar (desactivar) un proveedor
export async function unverifyProvider(providerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('provider_profiles')
    .update({ verified: false })
    .eq('id', providerId)

  if (error) return { error: error.message }

  revalidatePath('/admin/providers')
  return { success: true }
}

// Obtener detalle completo de un proveedor por ID (consultas directas)
export async function getProviderById(id: string) {
  const supabase = await createClient()

  // 1. Obtener datos del perfil de proveedor
  const { data: provider, error: providerError } = await supabase
    .from('provider_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (providerError) {
    console.error('Error fetching single provider_profile:', providerError)
    return null
  }

  if (!provider) {
    return null
  }

  // 2. Obtener datos base del perfil asociado
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, province, city, department')
    .eq('id', id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching base profile for provider detail:', profileError)
  }

  return {
    ...provider,
    full_name: profile?.full_name,
    email: profile?.email,
    phone: profile?.phone ?? provider.phone,
    base_province: profile?.province,
    base_city: profile?.city,
    base_department: profile?.department,
  }
}
