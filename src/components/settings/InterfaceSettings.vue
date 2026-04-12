<template>
    <CollapsibleSection :title="$t('userSettings.tabs.interface')" :start-open="true">
      <div class="space-y-6 pt-3">
        <!-- Language Select -->
        <div class="setting-item">
             <label for="language-select" class="setting-label-block">
               <span class="setting-label-main">{{ $t('userSettings.languageSelectLabel') }}</span>
               <span class="setting-description">{{ $t('userSettings.languageSelectDescription') }}</span>
             </label>
             <select id="language-select" v-model="appStore.currentLocale" class="setting-select mt-2">
               <option v-for="locale in SUPPORT_LOCALES" :key="locale" :value="locale">
                 {{ $t(`languages.${locale}`) }}
               </option>
             </select>
         </div>

         <!-- NEW: Dark Mode Toggle -->
         <div class="setting-item toggle-item">
             <label for="darkModeToggle" class="toggle-label">
               <span class="setting-label-main flex items-center gap-2">
                   <MoonIcon v-if="isDark" class="h-4 w-4" />
                   <SunIcon v-else class="h-4 w-4" />
                   Dark Mode
               </span>
               <div class="setting-description">
                   {{ isDark ? 'Dark mode is active' : 'Light mode is active' }}
               </div>
             </label>
             <button id="darkModeToggle" @click="toggleDarkMode" role="switch" :aria-checked="isDark.toString()" :class="isDark ? 'bg-indigo-600' : 'bg-gray-300'" class="toggle-switch" >
                 <span class="sr-only">Toggle Dark Mode</span>
                 <span aria-hidden="true" :class="isDark ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span>
             </button>
         </div>
      </div>
    </CollapsibleSection>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/appStore';
import { SUPPORT_LOCALES } from '@/i18n';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import { SunIcon, MoonIcon } from '@heroicons/vue/24/solid';
import { useTheme } from '@/composables/useTheme';

const { t } = useI18n();
const appStore = useAppStore();
const { isDark, toggleDarkMode } = useTheme();
</script>