// Agency Beats Service Worker — Web Push Notifications
// This file must be served as-is from /public/ (not TypeScript)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const options = {
    body: data.body ?? '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: {
      url: data.url,
      notificationId: data.notificationId,
    },
    tag: data.tag ?? 'default',
    renotify: true,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Agency Beats', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url
  const notificationId = event.notification.data?.notificationId

  // Track click event
  if (notificationId) {
    fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId,
        event: 'clicked',
        channel: 'push',
      }),
    }).catch(() => {})
  }

  // Open or focus the app window
  if (url) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(url)
      })
    )
  }
})

// Install and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
