// The previous site was a PWA and registered a service worker at this path. It is still
// active in every browser that loaded that site, still serving that app out of its own
// precache, so those visitors never receive anything deployed since.
//
// A browser normally retires a worker on its own: it re-fetches this script, gets a 404,
// and unregisters. That cannot happen here, because the SPA catch-all in _redirects
// answers this path with index.html at 200 text/html, and an update that fails on MIME
// type leaves the old registration in place. So the replacement has to remove itself.
//
// Registering nothing is not enough, and neither is deleting the file. Only a valid script
// served from this exact path is something the old worker will accept as its successor.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Caches before unregistering: once the registration is gone this worker can be
      // torn down mid-flight, and the precache it leaves behind is what still holds the
      // old app.
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      // Reload every open tab: they are still displaying the old app this worker served.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    })(),
  )
})
