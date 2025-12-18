import { create } from "zustand"

export interface Order {
  id: string
  service: string
  provider: string
  price: number
  date: string
  status: "paid" | "pending" | "failed"
  createdAt: string
}

interface PaymentState {
  orders: Order[]
  createOrder: (order: Omit<Order, "id" | "createdAt">) => string
  updateOrderStatus: (id: string, status: Order["status"]) => void
}

export const usePaymentStore = create<PaymentState>((set) => ({
  orders: [],

  createOrder: (order) => {
    const newOrder: Order = {
      ...order,
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      orders: [...state.orders, newOrder],
    }))
    return newOrder.id
  },

  updateOrderStatus: (id, status) => {
    set((state) => ({
      orders: state.orders.map((order) => (order.id === id ? { ...order, status } : order)),
    }))
  },
}))
