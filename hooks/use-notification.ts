'use client'

import { useEffect, useState } from 'react'

export type NotificationKind = 'success' | 'error' | 'info'

export interface AppNotification {
  id: number
  type: NotificationKind
  title?: string
  message: string
}

let globalId = 0
let listeners: Array<(notifications: AppNotification[]) => void> = []
let notificationsState: AppNotification[] = []

function emit(next: AppNotification[]) {
  notificationsState = next
  listeners.forEach((l) => l(notificationsState))
}

export function notify(type: NotificationKind, message: string, title?: string) {
  const id = ++globalId
  const n: AppNotification = { id, type, message, title }
  emit([...notificationsState, n])
  // auto remove after 5s
  setTimeout(() => {
    emit(notificationsState.filter((x) => x.id !== id))
  }, 5000)
}

export function useNotificationCenter() {
  const [items, setItems] = useState<AppNotification[]>(notificationsState)

  useEffect(() => {
    listeners.push(setItems)
    return () => {
      listeners = listeners.filter((l) => l !== setItems)
    }
  }, [])

  const clear = () => emit([])

  return { notifications: items, clear }
}
