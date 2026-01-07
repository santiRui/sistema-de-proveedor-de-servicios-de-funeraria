'use client'

import { useNotificationCenter } from '@/hooks/use-notification'

export function NotificationCenter() {
  const { notifications } = useNotificationCenter()

  if (!notifications.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-5 py-4 rounded-lg shadow-xl border text-sm bg-white ${
            n.type === 'error'
              ? 'border-red-300 text-red-800'
              : n.type === 'success'
                ? 'border-emerald-300 text-emerald-800'
                : 'border-sky-300 text-sky-800'
          }`}
        >
          {n.title && <p className="font-semibold mb-1">{n.title}</p>}
          <p>{n.message}</p>
        </div>
      ))}
    </div>
  )
}
