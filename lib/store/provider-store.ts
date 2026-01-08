import { create } from "zustand"

export interface Service {
  id: string
  name: string
  description: string
  price: string
  billingMode?: 'one_time' | 'monthly' | 'both'
  areas: string[]
  images: string[]
  videos: string[]
  pdfs: string[]
  maxMembers?: number
}

export interface ProviderProfile {
  businessName: string
  description: string
  phone: string
  email: string
  city: string
  province: string
  website: string
  verificationStatus: "pending" | "verified" | "rejected"
}

interface ProviderState {
  profile: ProviderProfile | null
  services: Service[]
  updateProfile: (profile: ProviderProfile) => void
  addService: (service: Service) => void
  removeService: (id: string) => void
  updateService: (id: string, service: Omit<Service, "id">) => void
  setServices: (services: Service[]) => void
}

export const useProviderStore = create<ProviderState>((set) => ({
  profile: null,
  services: [],

  updateProfile: (profile) => {
    set({ profile })
  },

  addService: (service) => {
    set((state) => ({
      services: [...state.services, service],
    }))
  },

  removeService: (id) => {
    set((state) => ({
      services: state.services.filter((s) => s.id !== id),
    }))
  },

  updateService: (id, service) => {
    set((state) => ({
      services: state.services.map((s) => (s.id === id ? { ...s, ...service } : s)),
    }))
  },

  setServices: (services) => {
    set({ services })
  },
}))
