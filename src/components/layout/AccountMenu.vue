<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseMenu from '@/components/base/BaseMenu.vue'
import { useAuthStore } from '@/stores/auth'
import AdminIcon from '@/components/icons/AdminIcon.vue'
import LoginIcon from '@/components/icons/LoginIcon.vue'
import AccountIcon from '@/components/icons/AccountIcon.vue'
import { SCOPE_TOURNAMENTS_WRITE } from '@/api/scopes'

const auth = useAuthStore()
const router = useRouter()

const menu = ref<InstanceType<typeof BaseMenu> | null>(null)
async function onLogout() {
  menu.value?.close()
  await auth.logout()
  router.push('/')
}
</script>
<template>
  <RouterLink v-if="!auth.isAuthenticated" to="/login" class="flex min-h-[44px] items-center gap-2 px-3 text-white/80 hover:text-white">
    <LoginIcon /><span class="sr-only md:not-sr-only md:text-sm">Login</span>
  </RouterLink>
  <BaseMenu v-else ref="menu" label="Account">
    <template #trigger><AccountIcon /></template>
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
  </BaseMenu>
</template>
