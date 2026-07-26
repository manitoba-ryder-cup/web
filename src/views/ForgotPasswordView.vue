<script setup lang="ts">
import { ref } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const email = ref('')
const sending = ref(false)
const emailSent = ref(false)

// Stubbed for now: no reset email is actually sent. We flip to the confirmation either
// way, which is also the right end state once it's wired up — the message never reveals
// whether an address is on file.
function sendResetInstructions() {
  sending.value = true
  emailSent.value = true
  sending.value = false
}
</script>
<template>
  <PageLayout title="Reset Password" image="/img/oceanside.webp">
    <div class="mx-auto max-w-md pt-2">
      <p v-if="emailSent" class="mb-8">
        If the email address you provided is linked to an account you will receive an email with instructions on how to reset your password.
      </p>
      <template v-else>
        <p class="mb-8">To reset your password, please provide the email address associated with your Manitoba Ryder Cup account.</p>
        <BaseLabel>Email Address</BaseLabel>
        <BaseInput v-model="email" type="email" @keyup.enter="sendResetInstructions" />
        <BaseButton :loading="sending" class="mt-4 w-full py-4" @click="sendResetInstructions"> Send Reset Instructions </BaseButton>
      </template>
    </div>
  </PageLayout>
</template>
