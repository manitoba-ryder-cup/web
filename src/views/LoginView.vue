<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const email = ref('dev@manitobarydercup.com')
const password = ref('DevPassword123!')
const error = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
async function onSubmit() {
  error.value = ''; loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push((route.query.redirect as string) || { name: 'dashboard' })
  } catch (e) { error.value = 'Login failed' } finally { loading.value = false }
}
</script>
<template>
  <section class="mx-auto max-w-sm">
    <h2 class="mb-4 text-xl font-semibold">Log in</h2>
    <form class="space-y-3" @submit.prevent="onSubmit">
      <input v-model="email" type="email" placeholder="Email" class="w-full rounded border px-3 py-2" />
      <input v-model="password" type="password" placeholder="Password" class="w-full rounded border px-3 py-2" />
      <p v-if="error" class="text-red-600">{{ error }}</p>
      <button :disabled="loading" class="w-full rounded bg-mrc-blue px-3 py-2 text-white disabled:opacity-50">
        {{ loading ? '…' : 'Log in' }}
      </button>
    </form>
  </section>
</template>
