<template>
    <div class="border-t pt-4">
       <h3 class="text-lg font-semibold mb-2">
         <!-- Dynamically display label, e.g., "My Source Pronunciation" -->
         {{ languageLabel }}:
         <span :class="languageLabel.toLowerCase().includes('source') ? 'text-blue-700' : 'text-green-700'" class="font-bold">{{ headword }}</span>
       </h3>
       <!-- The actual recorder component -->
       <AudioRecorder ref="recorderRef" :initial-audio-data-url="initialAudioUrl" />
       <div class="mt-3 flex justify-end space-x-2">
           <!-- Emit event to parent (DetailView) to clear STORED audio -->
           <button @click="$emit('clear-audio')" :disabled="isSaving || !initialAudioUrl"
                   class="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded shadow hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed">
               {{ $t('audioPractice.clearSavedAudio') }}
           </button>
           <!-- Emit event to parent (DetailView) to save audio FROM recorder -->
           <button @click="handleSave" :disabled="isSaving"
                   class="px-4 py-1.5 bg-blue-500 text-white text-xs rounded shadow hover:bg-blue-600 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle> <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
               {{ isSaving ? $t('general.saving') : $t('audioPractice.saveRecording') }}
           </button>
       </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import AudioRecorder from '@/components/AudioRecorder.vue';
  import type { AudioRecorderInstance } from '@/types';
  import emitter from '@/services/emitter';
  
  const { languageLabel, headword, initialAudioUrl = null, isSaving = false } = defineProps<{
    languageLabel: string;
    headword: string;
    initialAudioUrl?: string | null;
    isSaving?: boolean;
  }>();
  
  const emit = defineEmits<{
    (e: 'save-audio', dataUrl: string | null): void
    (e: 'clear-audio'): void
  }>();
  
  const { t } = useI18n();
  const recorderRef = ref<AudioRecorderInstance | null>(null);
  
  async function handleSave() {
    if (!recorderRef.value) {
        console.error(`AudioPracticeSection (${languageLabel}): recorderRef not available.`);
        return;
    }
    try {
      const audioDataUrl = await recorderRef.value.getAudioDataUrl();
      if (audioDataUrl) {
        emit('save-audio', audioDataUrl);
      } else {
        emitter.emit('show-notification', { message: t('audioPractice.noNewRecording'), type: 'error', duration: 2000 });
      }
    } catch (error: any) {
      console.error(`Error getting audio data URL for ${languageLabel}:`, error);
      emitter.emit('show-notification', { message: `Fehler beim Abrufen der Aufnahme: ${error.message}`, type: 'error' });
    }
  }
  </script>