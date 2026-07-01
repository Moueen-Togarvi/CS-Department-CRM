'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  linkUrl: string | null
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const queryClient = useQueryClient()

  const { data: unreadCount = 0, refetch } = useQuery<number>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count')
      const json = await res.json()
      return json.data?.count ?? 0
    },
    refetchInterval: 60000,
  })

  const { data: notifications = [] } = useQuery<AppNotification[]>({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      return json.data || []
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}/read`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetch('/api/notifications/read-all', { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  // Refetch on window focus
  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetch])

  return {
    unreadCount,
    notifications,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  }
}
