import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'provider') {
    return NextResponse.json({ error: 'Solo el proveedor titular puede ver empleados.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'provider_employee')
    .eq('parent_provider_id', user.id)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching provider employees', error)
    return NextResponse.json({ error: 'No se pudieron cargar los empleados.' }, { status: 500 })
  }

  return NextResponse.json({ employees: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'provider') {
    return NextResponse.json({ error: 'Solo el proveedor titular puede crear empleados.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { email?: string; name?: string } | null
  const email = body?.email?.trim()
  const name = body?.name?.trim()

  if (!email || !name) {
    return NextResponse.json({ error: 'Email y nombre son obligatorios.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: email, // Contraseña inicial igual al correo
      email_confirm: true,
      user_metadata: {
        role: 'provider_employee',
        full_name: name,
        parent_provider_id: user.id,
      },
    })

    if (createError || !created.user) {
      console.error('Error creating provider employee user', createError)
      return NextResponse.json({ error: createError?.message || 'No se pudo crear el empleado.' }, { status: 500 })
    }

    // Asegurar perfil con rol de empleado y vinculación a la empresa (inserta o actualiza según exista)
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert(
        {
          id: created.user.id,
          role: 'provider_employee',
          parent_provider_id: user.id,
          full_name: name,
          email,
        },
        { onConflict: 'id' },
      )

    if (upsertError) {
      console.error('Error upserting profile for employee', upsertError)
      return NextResponse.json({ error: 'Empleado creado, pero no se pudo vincular al proveedor.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Unexpected error creating provider employee', e)
    return NextResponse.json({ error: 'Error inesperado al crear el empleado.' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'provider') {
    return NextResponse.json({ error: 'Solo el proveedor titular puede eliminar empleados.' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { id?: string } | null
  const employeeId = body?.id

  if (!employeeId) {
    return NextResponse.json({ error: 'Falta el id del empleado.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { error: deleteError } = await admin.auth.admin.deleteUser(employeeId)

    if (deleteError) {
      console.error('Error deleting provider employee user', deleteError)
      return NextResponse.json({ error: deleteError.message || 'No se pudo eliminar el empleado.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Unexpected error deleting provider employee', e)
    return NextResponse.json({ error: 'Error inesperado al eliminar el empleado.' }, { status: 500 })
  }
}
