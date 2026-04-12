<template>
    <CollapsibleSection :title="$t('userSettings.tabs.audio')">
      <div class="space-y-6 pt-3">
         <div class="setting-item toggle-item">
             <label for="playSoundToggle" class="toggle-label">
               <span class="setting-label-main">{{ $t('userSettings.playSoundLabel') }}</span>
               <div class="setting-description">
                   <p>{{ $t('userSettings.playSoundDescription_on') }}</p>
                   <p>{{ $t('userSettings.playSoundDescription_off') }}</p>
               </div>
             </label>
             <button id="playSoundToggle" @click="togglePlaySoundOnTap" role="switch" :aria-checked="playSoundSetting.toString()" :class="playSoundSetting ? 'bg-blue-600' : 'bg-gray-300'" class="toggle-switch" ><span class="sr-only">{{ $t('userSettings.playSoundLabel') }}</span><span aria-hidden="true" :class="playSoundSetting ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span></button>
         </div>
         <div class="setting-item toggle-item">
             <label for="preferUserAudioToggle" class="toggle-label">
               <span class="setting-label-main">{{ $t('userSettings.preferUserAudioLabel') }}</span>
               <div class="setting-description">
                   <p>{{ $t('userSettings.preferUserAudioDescription_on') }}</p>
                   <p>{{ $t('userSettings.preferUserAudioDescription_off') }}</p>
               </div>
             </label>
             <button id="preferUserAudioToggle" @click="togglePreferUserAudio" role="switch" :aria-checked="preferUserAudioSetting.toString()" :class="preferUserAudioSetting ? 'bg-blue-600' : 'bg-gray-300'" class="toggle-switch" ><span class="sr-only">{{ $t('userSettings.preferUserAudioLabel') }}</span><span aria-hidden="true" :class="preferUserAudioSetting ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span></button>
         </div>
         <div class="setting-item toggle-item">
             <label for="disableTtsToggle" class="toggle-label">
               <span class="setting-label-main">{{ $t('userSettings.disableTTSLabel') }}</span>
               <div class="setting-description">
                   <p>{{ $t('userSettings.disableTTSDescription_on') }}</p>
                   <p>{{ $t('userSettings.disableTTSDescription_off') }}</p>
               </div>
             </label>
             <button id="disableTtsToggle" @click="toggleDisableTTSFallback" role="switch" :aria-checked="disableTTSFallbackSetting.toString()" :class="disableTTSFallbackSetting ? 'bg-blue-600' : 'bg-gray-300'" class="toggle-switch" ><span class="sr-only">{{ $t('userSettings.disableTTSLabel') }}</span><span aria-hidden="true" :class="disableTTSFallbackSetting ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span></button>
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

const playSoundSetting = computed(() => settingsStore.settings?.playSoundOnTap ?? true);
const preferUserAudioSetting = computed(() => settingsStore.settings?.preferUserAudio ?? false);
const disableTTSFallbackSetting = computed(() => settingsStore.settings?.disableTTSFallback ?? false);
function togglePlaySoundOnTap() { settingsStore.setPlaySoundOnTap(!playSoundSetting.value); }
function togglePreferUserAudio() { settingsStore.setPreferUserAudio(!preferUserAudioSetting.value); }
function toggleDisableTTSFallback() { settingsStore.setDisableTTSFallback(!disableTTSFallbackSetting.value); }
</script>

<style scoped>
</style>