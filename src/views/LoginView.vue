<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function onSubmit() {
  if (!email.value || !password.value) {
    error.value = 'Email and password are required'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    toast.success('Logged in')
    router.push((route.query.redirect as string) || { name: 'dashboard' })
  } catch {
    password.value = ''
    error.value = 'Sorry, something went wrong'
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <!-- The v2 "Welcome Back" screen: the form floats directly on a full-bleed course photo
       below the site nav, no card. The dark gradient overlay is the site's signature hero
       treatment (see ImageHeader) — it keeps white type legible and the mood consistent.
       min-height fills the viewport under the 4rem header. -->
  <div class="flex min-h-[calc(100vh-4rem)] justify-center bg-cover bg-center px-4"
       :style="{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url('/img/empty-course.webp')` }">
    <div class="mt-16 w-full max-w-sm">
      <h1 class="mb-10 text-center text-white">Welcome Back</h1>
      <BaseAlert v-if="error" variant="error" class="mb-6">{{ error }}</BaseAlert>
      <BaseInput v-model="email" type="email" placeholder="Email Address" class="mb-6" />
      <BaseInput v-model="password" type="password" placeholder="Password" @keyup.enter="onSubmit" />
      <RouterLink :to="{ name: 'forgot-password' }" class="block">
        <div class="mb-10 mr-1 mt-2 flex justify-end text-sm text-mrc-accent-soft underline hover:text-white">Forgot your password?</div>
      </RouterLink>
      <BaseButton :loading="loading" class="w-full py-4" @click="onSubmit">
        {{ loading ? 'Logging In' : 'Login' }}
      </BaseButton>
    </div>
  </div>
</template>
