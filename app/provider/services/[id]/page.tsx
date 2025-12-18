import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ServiceEdit } from "@/components/provider/service-edit"

interface ServiceEditPageProps {
  params: { id: string }
}

export default async function ServiceEditPage({ params }: ServiceEditPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  return <ServiceEdit serviceId={params.id} />
}
