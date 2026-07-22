'use client'

import { useState, useEffect, useCallback } from 'react'
import { trpc } from '@/trpc/client'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  const subscribeMutation = trpc.notification.subscribePush.useMutation()
  const unsubscribeMutation = trpc.notification.unsubscribePush.useMutation()

  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      setIsSupported(supported)
      setPermission(Notification.permission)

      if (!supported) {
        setIsLoading(false)
        return
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js')
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          setIsSubscribed(!!subscription)
        }
      } catch {
        // Silently fail — push just won't be available
      }
      setIsLoading(false)
    }

    checkSupport()
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported) return false

    try {
      // Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        return false
      }

      // Save subscription to server
      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      })

      setIsSubscribed(true)
      return true
    } catch (error) {
      console.error('[push] Subscribe failed:', error)
      return false
    }
  }, [isSupported, subscribeMutation])

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!registration) return false

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return false

      // Unsubscribe from push
      await subscription.unsubscribe()

      // Remove from server
      await unsubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
      })

      setIsSubscribed(false)
      return true
    } catch (error) {
      console.error('[push] Unsubscribe failed:', error)
      return false
    }
  }, [unsubscribeMutation])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  }
}
