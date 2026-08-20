<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminIcon from '@/components/icons/AdminIcon.vue'
import LoginIcon from '@/components/icons/LoginIcon.vue'
import AccountIcon from '@/components/icons/AccountIcon.vue'
import { SCOPE_TOURNAMENTS_WRITE } from '@/api/scopes'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const open = ref(false)

// The menu is anchored in the header, which survives navigation — without this it would
// still be hanging open over whatever page the link led to.
watch(
  () => route.fullPath,
  () => (open.value = false),
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

async function onLogout() {
  open.value = false
  await auth.logout()
  router.push('/')
}
</script>
<template>
  <RouterLink v-if="!auth.isAuthenticated" to="/login" class="flex min-h-11 items-center gap-2 px-3 text-white/80 hover:text-white">
    <LoginIcon /><span class="sr-only md:not-sr-only md:text-sm">Login</span>
  </RouterLink>
  <div v-else class="relative">
    <button
      type="button"
      class="flex min-h-11 items-center px-3 text-white/80 hover:text-white"
      aria-label="Account"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <AccountIcon />
    </button>
    <template v-if="open">
      <div data-testid="backdrop" class="fixed inset-0 z-20" @click="open = false" />
      <div class="absolute right-2 z-30 mt-1 w-44 overflow-hidden rounded-md bg-mrc-ink py-1 shadow-lg ring-1 ring-white/15">
        <RouterLink
          v-if="auth.hasScope(SCOPE_TOURNAMENTS_WRITE)"
          to="/admin"
          class="flex items-center px-4 py-2 text-white hover:bg-mrc-accent/25"
        >
          <AdminIcon class="mr-3" />Admin
        </RouterLink>
        <button type="button" class="flex w-full items-center px-4 py-2 text-left text-white hover:bg-mrc-accent/25" @click="onLogout">
          <LoginIcon class="mr-3" />Logout
        </button>
      </div>
    </template>
  </div>
</template>
