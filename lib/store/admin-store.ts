import { create } from "zustand"

export interface PendingProvider {
  id: string
  businessName: string
  description: string
  phone: string
  email: string
  city: string
  province: string
  servicesCount: number
  documents: string[]
}

export interface Transaction {
  id: string
  providerName: string
  clientName: string
  amount: string
  commission: string
  status: "completed" | "pending" | "failed"
  date: string
}

interface AdminState {
  pendingProviders: PendingProvider[]
  transactions: Transaction[]
  approveProvider: (id: string) => void
  rejectProvider: (id: string) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  pendingProviders: [
    {
      id: "pending_1",
      businessName: "Centro Médico San Martín",
      description: "Centro integral de salud con especialidades múltiples",
      phone: "+54 9 1156789012",
      email: "contacto@centromedico.com",
      city: "Buenos Aires",
      province: "Buenos Aires",
      servicesCount: 8,
      documents: ["Cédula CUIL", "Licencia Comercial", "Certificado Médico"],
    },
    {
      id: "pending_2",
      businessName: "Laboratorio Clínico Express",
      description: "Análisis clínicos rápidos y confiables",
      phone: "+54 9 1167890123",
      email: "info@laboratorioexpress.com",
      city: "La Plata",
      province: "Buenos Aires",
      servicesCount: 5,
      documents: ["Cédula CUIL", "Acreditación Sanitaria", "Seguro Responsabilidad Civil"],
    },
  ],
  transactions: [
    {
      id: "TX-2025-001",
      providerName: "Dr. García Médicos",
      clientName: "Juan Pérez",
      amount: "5,000",
      commission: "500",
      status: "completed",
      date: "2025-07-01",
    },
    {
      id: "TX-2025-002",
      providerName: "Fisioterapia Movimiento",
      clientName: "María López",
      amount: "3,500",
      commission: "350",
      status: "completed",
      date: "2025-07-02",
    },
    {
      id: "TX-2025-003",
      providerName: "Consultorio Psicológico",
      clientName: "Carlos Rodríguez",
      amount: "4,500",
      commission: "450",
      status: "pending",
      date: "2025-07-05",
    },
    {
      id: "TX-2025-004",
      providerName: "Centro Odontológico",
      clientName: "Ana Martínez",
      amount: "8,000",
      commission: "800",
      status: "completed",
      date: "2025-07-06",
    },
  ],

  approveProvider: (id) => {
    set((state) => ({
      pendingProviders: state.pendingProviders.filter((p) => p.id !== id),
    }))
  },

  rejectProvider: (id) => {
    set((state) => ({
      pendingProviders: state.pendingProviders.filter((p) => p.id !== id),
    }))
  },
}))
