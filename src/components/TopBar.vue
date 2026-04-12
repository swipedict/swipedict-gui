<template>
  <!--
    Glassmorphism Header — mobile-first responsive
    · Mobile  (<640px): icon + "SD" + truncated dict name
    · Tablet  (640-1023px): icon + "SwipeDict" + dict name
    · Desktop (1024px+): full layout with divider + type badge
    Supports iPhone safe-area (Dynamic Island / notch / home indicator).
  -->
  <header
    class="sticky top-0 z-30 overflow-hidden transition-all duration-300
           bg-white/70 dark:bg-[#06061a]/85 backdrop-blur-xl
           border-b border-white/20 dark:border-white/6
           shadow-sm dark:shadow-none
           supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#06061a]/75"
    :style="{ paddingTop: 'env(safe-area-inset-top, 0px)' }"
  >
    <!-- Inner flex row — fixed height below safe area -->
    <div class="flex items-center justify-between w-full h-12 sm:h-14 px-3 sm:px-4 min-w-0 overflow-hidden">

      <!-- ── Left: Brand + Dictionary ── -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <!-- Logo link -->
        <router-link
          :to="homeLinkTarget"
          class="flex items-center gap-1.5 group select-none shrink-0"
          :title="$t('topBar.toHomepage')"
        >
          <!-- Icon -->
          <span class="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 shadow-md shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow">
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="4" y="2" width="10" height="7" rx="1.5" fill="white" fill-opacity="0.35" transform="rotate(6 4 2)"/>
              <rect x="2" y="5" width="10" height="7" rx="1.5" fill="white" fill-opacity="0.9"/>
              <path d="M5 8.5h4m0 0-1.5-1.5M9 8.5 7.5 10" stroke="white" stroke-opacity="0.6" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>

          <!-- Wordmark: "SD" on mobile, "SwipeDict" on sm+ -->
          <span class="font-heading font-bold tracking-tight leading-none text-base sm:text-lg">
            <!-- Mobile: compact "SD" -->
            <span class="sm:hidden">
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-violet-500 dark:from-primary-400 dark:to-violet-400">S</span><span class="text-slate-700 dark:text-slate-200">D</span>
            </span>
            <!-- Desktop: full "SwipeDict" -->
            <span class="hidden sm:inline">
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-violet-500 dark:from-primary-400 dark:to-violet-400">Swipe</span><span class="text-slate-700 dark:text-slate-200 font-semibold">Dict</span>
            </span>
          </span>
        </router-link>

        <!-- Divider — tablet+ only -->
        <div v-if="props.selectedDictionary" class="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0"></div>

        <!-- Dictionary name — truncated on mobile, expanded on desktop -->
        <router-link
          v-if="props.selectedDictionary"
          :to="dictionaryLinkTarget"
          class="group min-w-0 flex items-center gap-1.5 overflow-hidden"
          :title="dictionaryLinkTitle"
        >
          <span class="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
            {{ props.selectedDictionary.message }}
          </span>
          <!-- Type badge — desktop only -->
          <span class="hidden lg:inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-surface-800 px-1.5 py-0.5 rounded shrink-0">
            {{ props.selectedDictionary.type }}
          </span>
        </router-link>
        <router-link
          v-else
          :to="{ name: 'dictionarySelection' }"
          class="text-xs sm:text-sm italic text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors truncate"
        >
          {{ $t('topBar.selectDictionary') }}
        </router-link>
      </div>

      <!-- ── Right: Actions ── -->
      <div class="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-2">
        <button @click="toggleDarkMode" class="btn-icon" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <SunIcon  v-if="isDark"  class="h-5 w-5" />
          <MoonIcon v-else         class="h-5 w-5" />
        </button>

        <RouterLink
          v-if="appStore.isUserRegistered"
          :to="{ name: 'profile' }"
          class="flex items-center p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-800 rounded-full transition-colors group"
          :title="$t('topBar.userProfile', { name: appStore.userName })"
        >
          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-[11px] ring-2 ring-transparent group-hover:ring-primary-200 dark:group-hover:ring-primary-700 transition-all">
            {{ userInitials }}
          </div>
        </RouterLink>
        <RouterLink v-else :to="{ name: 'register' }" class="btn-icon" :title="$t('topBar.registerLogin')">
          <UserIcon class="h-5 w-5" />
        </RouterLink>
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PropType } from 'vue';
import { RouterLink } from 'vue-router';
import { UserIcon, SunIcon, MoonIcon } from '@heroicons/vue/24/outline';
import { useAppStore } from '@/stores/appStore';
import type { DictionaryMeta } from '@/types';
import { useTheme } from '@/composables/useTheme';

const props = defineProps({
    selectedDictionary: {
      type: Object as PropType<DictionaryMeta | undefined>,
      default: undefined
    },
    topicTitle: {
      type: String as PropType<string | null>,
      default: null
    }
});

const { t } = useI18n();
const appStore = useAppStore();
const { isDark, toggleDarkMode } = useTheme();

const userInitials = computed(() => {
    const name = appStore.userName || '?';
    return name.slice(0, 2).toUpperCase();
});

const homeLinkTarget = computed(() => appStore.isUserRegistered ? { name: 'welcome' } : { name: 'root' });

const dictionaryLinkTarget = computed(() => {
    if (props.selectedDictionary?.path) {
      return { name: 'dictionaryBrowser', params: { dictionaryPath: props.selectedDictionary.path } };
    } else {
      return { name: 'dictionarySelection' };
    }
});

const dictionaryLinkTitle = computed(() => {
 if (props.selectedDictionary) {
   return t('topBar.searchDictionary', { dict: props.selectedDictionary.message });
 } else {
   return t('topBar.selectDictionary');
 }
});
</script>