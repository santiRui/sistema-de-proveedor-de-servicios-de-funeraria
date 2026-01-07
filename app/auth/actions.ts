'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const type = formData.get('type') as string // 'client' o 'provider'

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Verificar rol
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      revalidatePath('/', 'layout')
      // Redirección según rol
      if (profile.role === 'client') redirect('/client/dashboard')
      if (profile.role === 'provider' || profile.role === 'provider_employee') redirect('/provider/dashboard')
      if (profile.role === 'admin') redirect('/admin/dashboard')
    }
  }

  redirect('/client/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const type = formData.get('type') as string // 'client' o 'provider'

  // Construir metadata con todos los campos extra
  const metadata: Record<string, any> = {
    role: type,
  }

  formData.forEach((value, key) => {
    if (key !== 'email' && key !== 'password' && key !== 'confirmPassword') {
      if (key === 'service_areas') {
        try {
          metadata[key] = JSON.parse(value as string)
        } catch {
          metadata[key] = []
        }
      } else {
        metadata[key] = value
      }
    }
  })

  // Alinear el nombre completo con el trigger de perfiles (usa meta->>'full_name')
  if (type === 'client') {
    const name = formData.get('name') as string | null
    if (name && !metadata.full_name) {
      metadata.full_name = name
    }
  }

  if (type === 'provider') {
    const businessName = formData.get('business_name') as string | null
    if (businessName && !metadata.full_name) {
      metadata.full_name = businessName
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Si hay usuario pero NO hay sesión, significa que requiere confirmación de email
  if (data.user && !data.session) {
    return { success: true, message: 'Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta.' }
  }

  revalidatePath('/', 'layout')
  
  // Si hay sesión (auto-confirm activo), redirigimos
  if (type === 'client') redirect('/client/dashboard')
  if (type === 'provider') redirect('/provider/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string | null
  if (!email) {
    return { error: 'Debes ingresar un email.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sistema-de-proveedor-de-servicios-d.vercel.app/auth/reset'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Te enviamos un correo con instrucciones para restablecer tu contraseña.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string | null
  const confirm = formData.get('confirmPassword') as string | null

  if (!password || !confirm) {
    return { error: 'Debes completar ambos campos de contraseña.' }
  }

  if (password !== confirm) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  if (password.length < 6) {
    return { error: 'La nueva contraseña debe tener al menos 6 caracteres.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Enlace inválido o expirado. Solicita un nuevo correo de recuperación.' }
  }

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.' }
}
