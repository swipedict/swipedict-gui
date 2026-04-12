<template>
    <CollapsibleSection :title="$t('userSettings.tabs.display')">
      <div class="space-y-6 pt-3">
         <div class="setting-item">
             <span class="setting-label-main">{{ $t('userSettings.initialListDisplayLabel') }}</span>
             <span class="setting-description mb-3">{{ $t('userSettings.initialListDisplayDescription') }}</span>
             <fieldset class="mt-2">
               <legend class="sr-only">{{ $t('userSettings.initialListDisplayLabel') }}</legend>
               <div class="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-6">
                 <div v-for="option in initialDisplayOptions" :key="option.value" class="flex items-center">
                   <input :id="`display-${option.value}`" name="initial-display" type="radio" :value="option.value" v-model="initialDisplaySetting" @change="updateInitialDisplaySetting" class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"/>
                   <label :for="`display-${option.value}`" class="ml-2 block text-sm font-medium text-gray-700">{{ option.label }}</label>
                 </div>
               </div>
             </fieldset>
         </div>
         
         <div class="setting-item">
             <span class="setting-label-main">{{ $t('userSettings.detailViewDefaultVisibilityLabel') }}</span>
             <span class="setting-description mb-3">{{ $t('userSettings.detailViewDefaultVisibilityDescription') }}</span>
             <fieldset class="mt-2">
               <legend class="sr-only">{{ $t('userSettings.detailViewDefaultVisibilityLabel') }}</legend>
               <div class="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-6">
                 <div v-for="option in detailViewDisplayOptions" :key="option.value" class="flex items-center">
                   <input :id="`detail-display-${option.value}`" name="detail-initial-display" type="radio" :value="option.value" :checked="settingsStore.settings.detailViewDefaultVisibility === option.value" @change="settingsStore.setDetailViewDefaultVisibility(option.value)" class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"/>
                   <label :for="`detail-display-${option.value}`" class="ml-2 block text-sm font-medium text-gray-700">{{ option.label }}</label>
                 </div>
               </div>
             </fieldset>
         </div>
         
         <div class="setting-item toggle-item">
             <label for="revealTapToggle" class="toggle-label">
               <span class="setting-label-main">{{ $t('userSettings.revealOnTapLabel') }}</span>
               <div class="setting-description">
                   <p>{{ $t('userSettings.revealOnTapDescription_on') }}</p>
                   <p>{{ $t('userSettings.revealOnTapDescription_off') }}</p>
               </div>
             </label>
             <button id="revealTapToggle" @click="toggleRevealOnTap" role="switch" :aria-checked="revealOnTapSetting.toString()" :class="revealOnTapSetting ? 'bg-blue-600' : 'bg-gray-300'" class="toggle-switch" ><span class="sr-only">{{ $t('userSettings.revealOnTapLabel') }}</span><span aria-hidden="true" :class="revealOnTapSetting ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span></button>
         </div>

         <div class="setting-item toggle-item">
             <label for="revealSwipeToggle" class="toggle-label">
               <span class="setting-label-main">{{ $t('userSettings.revealOnSwipeLabel') }}</span>
               <div class="setting-description">
                   <p>{{ $t('userSettings.revealOnSwipeDescription_on') }}</p>
                   <p>{{ $t('userSettings.revealOnSwipeDescription_off') }}</p>
               </div>
             </label>
             <button id="revealSwipeToggle" @click="toggleRevealOnSwipe" role="switch" :aria-checked="revealOnSwipeSetting.toString()" :class="revealOnSwipeSetting ? 'bg-blue-600' : 'bg-gray-300'" class="toggle-switch" ><span class="sr-only">{{ $t('userSettings.revealOnSwipeLabel') }}</span><span aria-hidden="true" :class="revealOnSwipeSetting ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span></button>
         </div>
      </div>
    </CollapsibleSection>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AppSettings } from '@/types';
import CollapsibleSection from '@/components/CollapsibleSection.vue';

const { t } = useI18n();
const settingsStore = useSettingsStore();

const initialDisplaySetting = ref<AppSettings['initialListDisplay']>(settingsStore.settings.initialListDisplay ?? 'all');

const initialDisplayOptions = computed(() => [
  { value: 'all', label: t('userSettings.initialListDisplayOptions.all') },
  { value: 'sourceOnly', label: t('userSettings.initialListDisplayOptions.source') },
  { value: 'targetOnly', label: t('userSettings.initialListDisplayOptions.target') },
]);
const detailViewDisplayOptions = computed(() => [
  { value: 'all', label: t('userSettings.initialListDisplayOptions.all') },
  { value: 'sourceOnly', label: t('userSettings.initialListDisplayOptions.source') },
  { value: 'targetOnly', label: t('userSettings.initialListDisplayOptions.target') },
]);

watch(() => settingsStore.settings.initialListDisplay, (newVal) => { initialDisplaySetting.value = newVal ?? 'all'; });
function updateInitialDisplaySetting() { settingsStore.setInitialListDisplay(initialDisplaySetting.value); }

const revealOnTapSetting = computed(() => settingsStore.settings?.revealOnTap ?? true);
function toggleRevealOnTap() { settingsStore.setRevealOnTap(!revealOnTapSetting.value); }

const revealOnSwipeSetting = computed(() => settingsStore.settings?.revealOnSwipe ?? true);
function toggleRevealOnSwipe() { settingsStore.setRevealOnSwipe(!revealOnSwipeSetting.value); }
</script>

<style scoped>
</style>