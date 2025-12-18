import { create } from "zustand"

export type UserRole = "client" | "provider" | "provider_employee" | "admin"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthState {
  user: User | null
  isLoading: boolean
  signIn: (email: string, role: UserRole) => void
  signUp: (email: string, name: string, role: UserRole) => void
  signOut: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  signIn: (email, role) => {
    // Mock implementation - en producción, esto se conectaría a Supabase
    const user: User = {
      id: `user_${Date.now()}`,
      email,
      name: email.split("@")[0],
      role,
    }
    set({ user })
  },

  signUp: (email, name, role) => {
    // Mock implementation
    const user: User = {
      id: `user_${Date.now()}`,
      email,
      name,
      role,
    }
    set({ user })
  },

  signOut: () => {
    set({ user: null })
  },

  setUser: (user) => {
    set({ user })
  },
}))
