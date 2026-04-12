<template>
    <CollapsibleSection :title="$t('userSettings.tabs.srs')">
      <div class="space-y-6 pt-3">
         <h2 class="text-lg font-medium text-gray-800 mb-1">{{ $t('userSettings.srsSettingsTitle') }}</h2>
         <div class="setting-item">
             <label for="newCardsPerDay" class="setting-label-block">
               <span class="setting-label-main">{{ $t('userSettings.newCardsPerDayLabel') }}</span>
               <span class="setting-description">{{ $t('userSettings.newCardsPerDayDescription') }}</span>
             </label>
             <input type="number" id="newCardsPerDay" min="0" :value="settingsStore.settings.newCardsPerDay" @input="updateNewCardsPerDay(($event.target as HTMLInputElement).value)" class="setting-input mt-2 sm:w-1/3 max-w-[120px]" />
         </div>
         <div class="setting-item">
             <span class="setting-label-main">{{ $t('userSettings.srsQuestionSideLabel') }}</span>
             <span class="setting-description mb-3">{{ $t('userSettings.srsQuestionSideDescription') }}</span>
             <div class="filter-pill-group-drawer w-full sm:w-auto">
                 <button v-for="option in srsQuestionSideOptions" :key="option.value" @click="settingsStore.setSrsQuestionSide(option.value)" :class="['filter-pill-drawer', settingsStore.settings.srsQuestionSide === option.value ? 'filter-pill-active-drawer' : 'filter-pill-inactive-drawer']">{{ option.label }}</button>
             </div>
         </div>
      </div>
    </CollapsibleSection>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settingsStore';
import CollapsibleSection from '@/components/CollapsibleSection.vue';

const { t } = useI18n();
const settingsStore = useSettingsStore();

function updateNewCardsPerDay(value: string) {
  const numValue = parseInt(value, 10);
  if (!isNaN(numValue) && numValue >= 0) settingsStore.setNewCardsPerDay(numValue);
  else if (value === '') settingsStore.setNewCardsPerDay(0);
  else (document.getElementById('newCardsPerDay') as HTMLInputElement).value = String(settingsStore.settings.newCardsPerDay);
}

const srsQuestionSideOptions = computed(() => [
    { value: 'mixed', label: t('userSettings.srsQuestionSideOptions.mixed') },
    { value: 'source', label: t('userSettings.srsQuestionSideOptions.source') },
    { value: 'target', label: t('userSettings.srsQuestionSideOptions.target') },
]);
</script>

<style scoped>
</style>