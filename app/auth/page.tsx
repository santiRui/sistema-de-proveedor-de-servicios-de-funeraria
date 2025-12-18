"use client"

import { useState } from "react"
import { SignInForm } from "@/components/auth/sign-in-form"
import { SignUpForm } from "@/components/auth/sign-up-form"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-huzKiElUb8p7PhCYTUKJxJ44hgTcVF.png"
          alt="Memorial Home"
          width={120}
          height={120}
          className="w-24 h-24"
        />
        <h1 className="text-4xl font-bold text-emerald-800 text-center">Memorial Home</h1>
      </div>

      <div className="w-full max-w-md">
        {authMode === "signin" ? (
          <SignInForm onSwitchMode={() => setAuthMode("signup")} />
        ) : (
          <SignUpForm onSwitchMode={() => setAuthMode("signin")} />
        )}
      </div>
    </div>
  )
}
