<script setup lang="ts">
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
defineProps<{ title?: string; image?: string; above?: string; below?: string }>()
</script>
<template>
  <ImageHeader v-if="title" :image="image" :above="above" :below="below">{{ title }}</ImageHeader>
  <ContentContainer>
    <div class="py-8"><slot /></div>
  </ContentContainer>
</template>
