<template>
  <!--
    PageHeader — standard 3-column view header: [back] [title] [action?]

    Props:
      title       – page title text
      backTo      – vue-router `to` object or string; if omitted uses $router.back()
      backLabel   – accessible label for back button (default 'Back')

    Slots:
      #action     – optional right-side content (refresh button, etc.)
                    If unused, an invisible spacer mirrors the back button width.
  -->
  <div class="flex items-center gap-3 mb-5 sm:mb-6">
    <!-- Back button (or invisible spacer when hideBack) -->
    <div class="shrink-0">
      <template v-if="!hideBack">
        <RouterLink
          v-if="backTo"
          :to="backTo"
          class="page-back-btn"
          :aria-label="backLabel"
        >
          <ChevronLeftIcon class="h-4 w-4" />
          <span>{{ backLabel }}</span>
        </RouterLink>
        <button
          v-else
          @click="backFn ? backFn() : $router.back()"
          class="page-back-btn"
          :aria-label="backLabel"
        >
          <ChevronLeftIcon class="h-4 w-4" />
          <span>{{ backLabel }}</span>
        </button>
      </template>
      <div v-else style="min-width: 2.5rem;"></div>
    </div>

    <!-- Title -->
    <h1 class="flex-1 text-center text-xl sm:text-2xl font-heading font-bold text-slate-800 dark:text-slate-100 truncate">
      {{ title }}
    </h1>

    <!-- Right action slot — mirrors back button width for perfect centering -->
    <div class="shrink-0 flex justify-end" style="min-width: 2.5rem;">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

const { backLabel = 'Zurück', hideBack = false } = defineProps<{
  title: string;
  backTo?: RouteLocationRaw;
  backLabel?: string;
  backFn?: () => void;
  hideBack?: boolean;
}>();
</script>
