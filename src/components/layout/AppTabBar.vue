<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCupStore } from '@/stores/cup'
import { navSection, type NavSection } from '@/lib/navSection'
import HomeIcon from '@/components/icons/HomeIcon.vue'
import ScoresIcon from '@/components/icons/ScoresIcon.vue'
import GroupsIcon from '@/components/icons/GroupsIcon.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'

const route = useRoute()
const cup = useCupStore()
// A failed lookup leaves Scores on the list — a worse link, never a broken header.
cup.load().catch(() => {})
const scoresTo = computed(() => cup.scoresTo)

// Which tab is lit is navSection's call, not RouterLink's isActive, which only matches the
// exact route a tab points at: drilling from the scores into a match would blank the bar,
// with no way to say a match still belongs to Scores. The header asks the same function,
// so the two navs always name the same section.
const section = computed(() => navSection(route))

const tabs = computed((): { to: string; label: string; icon: Component; section: NavSection }[] => [
  { to: '/', label: 'Home', icon: HomeIcon, section: 'home' },
  { to: scoresTo.value, label: 'Scores', icon: ScoresIcon, section: 'scores' },
  { to: '/teams', label: 'Teams', icon: GroupsIcon, section: 'teams' },
  { to: '/tournaments', label: 'History', icon: TrophyIcon, section: 'history' },
])

// Resolved once here rather than three times per tab in the template, where the same
// question drives the label, the colour and the pill.
const resolved = computed(() => tabs.value.map((t) => ({ ...t, isActive: t.section === section.value })))
</script>
<template>
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-mrc-ink text-white md:hidden" aria-label="Primary">
    <ul class="flex">
      <li v-for="t in resolved" :key="t.label" class="flex-1">
        <RouterLink :to="t.to" custom v-slot="{ href, navigate }">
          <a
            :href="href"
            @click="navigate"
            :aria-current="t.isActive ? 'page' : undefined"
            class="flex flex-col items-center gap-1 py-2"
            :class="t.isActive ? 'text-mrc-accent-soft' : 'text-white/70'"
          >
            <!-- The pill is the cue that survives without colour: it is there or it is
                 not, rather than one hue against another. -->
            <span class="flex h-10 w-16 items-center justify-center rounded-full" :class="t.isActive ? 'bg-mrc-accent/40' : ''">
              <component :is="t.icon" />
            </span>
            <span class="text-sm">{{ t.label }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
