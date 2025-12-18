'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'No autorizado' }
  }

  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const dni = formData.get('dni') as string
  const birth_date = formData.get('birth_date') as string
  const country = formData.get('country') as string
  const province = formData.get('province') as string
  const city = formData.get('city') as string
  const department = formData.get('department') as string

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone,
      dni,
      birth_date: birth_date || null,
      country: country || 'Argentina',
      province,
      city,
      department,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/client/dashboard')
  return { success: true, message: 'Perfil actualizado correctamente' }
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return data
}
