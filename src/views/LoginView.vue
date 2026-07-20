<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const email = ref('dev@manitobarydercup.com')
const password = ref('DevPassword123!')
const error = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push((route.query.redirect as string) || { name: 'dashboard' })
  } catch {
    error.value = 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <ImageHeader image="/img/empty-course.webp">Login</ImageHeader>
  <ContentContainer>
    <div class="py-10">
      <BaseCard class="mx-auto max-w-sm">
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div>
            <BaseLabel required>Email</BaseLabel>
            <BaseInput v-model="email" type="email" />
          </div>
          <div>
            <BaseLabel required>Password</BaseLabel>
            <BaseInput v-model="password" type="password" />
          </div>
          <BaseAlert v-if="error" variant="error">{{ error }}</BaseAlert>
          <BaseButton type="submit" :loading="loading" class="w-full">Log in</BaseButton>
        </form>
      </BaseCard>
    </div>
  </ContentContainer>
</template>
