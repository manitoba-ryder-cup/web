<script setup lang="ts">
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import CupArchive from '@/components/tournament/CupArchive.vue'
import ParticipantRoll from '@/components/player/ParticipantRoll.vue'

// Each half owns its fetch, so one going down leaves the other readable and the roll is not
// requested until asked for. Kept alive so returning to a tab shows what it loaded.
</script>
<template>
  <!-- The hero says what the tab bar already says, so it carries the line the page used to
       spend a paragraph on and earns the height that way. -->
  <PageLayout title="History" image="/img/oceanside.webp" below="An Event Like No Other">
    <!-- The bar sits outside any loading state because its labels are fixed: it is page chrome, not
         a claim about data, so a deep link's tab is right from the first frame. -->
    <FullBleed flush-top>
      <BaseTabs :tabs="['Tournaments', 'Participants']">
        <template #default="{ index }">
          <div class="px-4">
            <KeepAlive>
              <CupArchive v-if="index === 0" />
              <ParticipantRoll v-else />
            </KeepAlive>
          </div>
        </template>
      </BaseTabs>
    </FullBleed>
  </PageLayout>
</template>
