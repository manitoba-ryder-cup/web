<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const router = useRouter()
async function onLogout() { await auth.logout(); router.push({ name: 'home' }) }
</script>
<template>
  <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
    <RouterLink to="/" class="font-display text-lg font-bold text-mrc-red">Manitoba Ryder Cup</RouterLink>
    <nav class="flex items-center gap-4 text-sm">
      <RouterLink to="/" class="hover:underline">Home</RouterLink>
      <RouterLink to="/tournaments" class="hover:underline">Tournaments</RouterLink>
      <RouterLink v-if="auth.isAuthenticated" to="/dashboard" class="hover:underline">Dashboard</RouterLink>
      <button v-if="auth.isAuthenticated" class="text-slate-600 hover:text-slate-900" @click="onLogout">
        Log out ({{ auth.user?.first_name }})
      </button>
      <RouterLink v-else to="/login" class="rounded bg-mrc-blue px-3 py-1 text-white">Log in</RouterLink>
    </nav>
  </header>
</template>
