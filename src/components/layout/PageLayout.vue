<script setup lang="ts">
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
defineProps<{ title?: string; image?: string; above?: string; below?: string }>()
</script>
<template>
  <!-- Optional full-bleed content above the hero (e.g. a sticky standings bar). -->
  <slot name="top" />
  <ImageHeader v-if="title || $slots.hero" :image="image" :above="above" :below="below">
    <template v-if="$slots.hero" #hero><slot name="hero" /></template>
    {{ title }}
  </ImageHeader>
  <ContentContainer>
    <div class="pb-8 pt-4"><slot /></div>
  </ContentContainer>
</template>
