// eslint-disable-next-line comment-cap/max-lines -- names the two ways of retiring the old
// worker that do not work, either of which is the obvious thing to try instead.
// The previous site's service worker still serves its own precache to anyone who loaded it.
// A browser retires one by re-fetching the script and getting a 404, which cannot happen
// here: the SPA catch-all answers this path with index.html, and an update that fails on
// MIME type leaves the registration in place. Deleting the file and registering nothing both
// fail the same way — only a valid script from this exact path is accepted as a successor,
// so the replacement has to unregister itself.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Caches first: once unregistered this worker can be torn down mid-flight, and the
      // precache it would leave behind is what still holds the old app.
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      // Reload every open tab: they are still displaying the old app this worker served.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    })(),
  )
})
