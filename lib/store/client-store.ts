import { create } from "zustand"

export interface Provider {
  id: string
  businessName: string
  description: string
  phone: string
  city: string
  province: string
  rating: number
  reviews: number
  coverImageUrl?: string
  services: { id: string; name: string; price: string }[]
}

export interface Quotation {
  id: string
  providerId: string
  providerName: string
  service: string
  price: string
  date: string
  notes: string
  status: "pending" | "accepted" | "rejected"
}

export interface Contract {
  id: string
  providerId: string
  providerName: string
  providerPhone: string
  service: string
  terms: string
  expiryDate: string
}

interface ClientState {
  providers: Provider[]
  quotations: Quotation[]
  contracts: Contract[]
  sendQuotationRequest: (providerId: string, data: any) => void
  acceptQuotation: (quotationId: string) => void
  setProviders: (providers: Provider[]) => void
}

export const useClientStore = create<ClientState>((set) => ({
  providers: [],
  quotations: [],
  contracts: [
    {
      id: "contract_1",
      providerId: "provider_1",
      providerName: "Dr. García Médicos",
      providerPhone: "+54 9 1123456789",
      service: "Consulta General",
      terms: "Consulta de 30 minutos. Incluye revisión general y recomendaciones.",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],

  sendQuotationRequest: (providerId, data) => {
    set((state) => ({
      quotations: [
        ...state.quotations,
        {
          id: `quotation_${Date.now()}`,
          providerId,
          providerName: "Provider Name", // Would come from provider data
          service: data.service,
          price: "$5,000 - $7,000",
          date: data.date,
          notes: data.notes,
          status: "pending",
        },
      ],
    }))
  },

  acceptQuotation: (quotationId) => {
    set((state) => ({
      quotations: state.quotations.map((q) => (q.id === quotationId ? { ...q, status: "accepted" } : q)),
    }))
  },

  setProviders: (providers) => set({ providers }),
}))
