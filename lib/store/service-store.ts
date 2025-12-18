import { create } from "zustand"

export interface ServiceItem {
  id: string
  name: string
  description: string
  category: "medical" | "physio" | "dental" | "psychology" | "nutrition"
  price: string
  duration: string
  provider: {
    id: string
    businessName: string
    city: string
    rating: number
    reviews: number
    verified: boolean
  }
}

interface ServiceState {
  services: ServiceItem[]
  initializeMockServices: () => void
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],

  initializeMockServices: () => {
    set({
      services: [
        {
          id: "service_1",
          name: "Consulta Médica General",
          description: "Consulta inicial con médico general para diagnóstico y derivación",
          category: "medical",
          price: "5000",
          duration: "30 minutos",
          provider: {
            id: "provider_1",
            businessName: "Dr. García Médicos",
            city: "Buenos Aires",
            rating: 5,
            reviews: 48,
            verified: true,
          },
        },
        {
          id: "service_2",
          name: "Sesión de Fisioterapia",
          description: "Sesión completa de fisioterapia con evaluación y tratamiento",
          category: "physio",
          price: "3500",
          duration: "45 minutos",
          provider: {
            id: "provider_2",
            businessName: "Fisioterapia Movimiento",
            city: "Buenos Aires",
            rating: 4,
            reviews: 32,
            verified: true,
          },
        },
        {
          id: "service_3",
          name: "Limpieza Dental Profesional",
          description: "Limpieza profunda y pulido dental con fluoración",
          category: "dental",
          price: "4000",
          duration: "60 minutos",
          provider: {
            id: "provider_3",
            businessName: "Centro Odontológico Premium",
            city: "Buenos Aires",
            rating: 5,
            reviews: 56,
            verified: true,
          },
        },
        {
          id: "service_4",
          name: "Sesión Psicológica",
          description: "Sesión individual de psicoterapia con especialista",
          category: "psychology",
          price: "4500",
          duration: "50 minutos",
          provider: {
            id: "provider_4",
            businessName: "Consultorio Psicológico Centro",
            city: "Buenos Aires",
            rating: 5,
            reviews: 28,
            verified: true,
          },
        },
        {
          id: "service_5",
          name: "Consulta Nutricional",
          description: "Evaluación nutricional completa con plan personalizado",
          category: "nutrition",
          price: "3800",
          duration: "45 minutos",
          provider: {
            id: "provider_5",
            businessName: "Nutrición Integral",
            city: "Buenos Aires",
            rating: 4,
            reviews: 20,
            verified: true,
          },
        },
        {
          id: "service_6",
          name: "Chequeo Médico Completo",
          description: "Chequeo integral con múltiples estudios y laboratorio",
          category: "medical",
          price: "8000",
          duration: "90 minutos",
          provider: {
            id: "provider_1",
            businessName: "Dr. García Médicos",
            city: "Buenos Aires",
            rating: 5,
            reviews: 48,
            verified: true,
          },
        },
      ],
    })
  },
}))

// Initialize mock services on store creation
if (typeof window !== "undefined") {
  useServiceStore.getState().initializeMockServices()
}
