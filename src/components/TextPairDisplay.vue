<template>
  <component :is="rootElement" :class="containerClasses">
    <!-- Source Part -->
    <div :class="partClasses">
      <button v-if="!showSource" @click.stop="reveal" :class="revealButtonClasses" :title="t('textPair.reveal')">
        {{ $t('textPair.reveal') }}
      </button>
      
      <p v-if="showSource" class="flex-grow">
        <strong class="font-medium text-blue-600 dark:text-blue-400">{{ sourceLangLabel }}:</strong>
        <span class="text-gray-800 dark:text-slate-200 ml-1">{{ sourceText }}</span>
      </p>
      
      <div class="flex-grow" v-if="!showSource"></div>

      <button v-if="sourceAudioType !== 'none'" @click.stop="playAudio('source')" :class="sourceButtonClasses" :title="getAudioTooltip('source')">
        <SpeakerWaveIcon v-if="sourceAudioType === 'opus'" class="h-4 w-4" />
        <CpuChipIcon v-else-if="sourceAudioType === 'tts'" class="h-4 w-4" />
      </button>
    </div>
    
    <span v-if="layout === 'inline' && showSource && showTarget" class="text-gray-400 dark:text-slate-500 mx-1.5">|</span>
    
    <!-- Target Part -->
    <div :class="partClasses">
       <button v-if="!showTarget" @click.stop="reveal" :class="revealButtonClasses" :title="$t('textPair.reveal')">
        {{ $t('textPair.reveal') }}
       </button>

       <p v-if="showTarget" class="flex-grow">
        <strong class="font-medium text-green-600 dark:text-green-400">{{ targetLangLabel }}:</strong>
        <span class="text-gray-800 dark:text-slate-200 ml-1">{{ targetText }}</span>
       </p>

       <div class="flex-grow" v-if="!showTarget"></div>

      <button v-if="targetAudioType !== 'none'" @click.stop="playAudio('target')" :class="targetButtonClasses" :title="getAudioTooltip('target')">
        <SpeakerWaveIcon v-if="targetAudioType === 'opus'" class="h-4 w-4" />
        <CpuChipIcon v-else-if="targetAudioType === 'tts'" class="h-4 w-4" />
      </button>
    </div>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settingsStore';
import { playAudio as playAudioFromComposable } from '@/composables/useAudioPlayer';
import type { AudioManifestItem } from '@/types';
import { SpeakerWaveIcon, CpuChipIcon } from '@heroicons/vue/24/solid';

type AudioAvailability = 'opus' | 'tts' | 'none';
type VisibilityMode = 'all' | 'sourceOnly' | 'targetOnly';

const {
  sourceText,
  targetText,
  sourceLangLabel,
  targetLangLabel,
  sourceLangCode,
  targetLangCode,
  audioIdentifier,
  audioContext,
  audioManifest = [],
  audioPathPrefix = null,
  layout = 'block',
  visibilityControl = 'all'
} = defineProps<{
  sourceText: string;
  targetText: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  sourceLangCode: string;
  targetLangCode: string;
  audioIdentifier: string;
  audioContext: { dictionaryPath: string; wordId: string; };
  audioManifest?: AudioManifestItem[];
  audioPathPrefix?: string | null;
  layout?: 'block' | 'inline';
  visibilityControl?: VisibilityMode;
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

const isManuallyRevealed = ref(false);

watch(() => visibilityControl, () => {
  isManuallyRevealed.value = false;
});

const rootElement = computed(() => (layout === 'inline' ? 'span' : 'div'));
const containerClasses = computed(() => ({
  'inline-flex items-baseline bg-gray-100 dark:bg-slate-800 rounded-md px-2 py-0.5 border border-gray-200 dark:border-slate-600 text-xs shadow-sm': layout === 'inline',
  'space-y-1': layout === 'block'
}));
const partClasses = computed(() => ({
  'flex items-center gap-2 group w-full': layout === 'block',
  'inline-flex items-center gap-2 group': layout === 'inline'
}));
const sourceButtonClasses = 'text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-300 transition-colors flex-shrink-0';
const targetButtonClasses = 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-300 transition-colors flex-shrink-0';
const revealButtonClasses = 'text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-3 py-1 rounded-md shadow-sm transition-colors';

const showSource = computed(() => {
    return visibilityControl === 'all' || visibilityControl === 'sourceOnly' || isManuallyRevealed.value;
});

const showTarget = computed(() => {
    return visibilityControl === 'all' || visibilityControl === 'targetOnly' || isManuallyRevealed.value;
});

function reveal() {
  if (!isManuallyRevealed.value) {
    isManuallyRevealed.value = true;
    
    if (visibilityControl === 'sourceOnly' && targetAudioType.value === 'opus') {
      playAudio('target');
    } else if (visibilityControl === 'targetOnly' && sourceAudioType.value === 'opus') {
      playAudio('source');
    }
  }
}

const getAudioManifestEntry = (side: 'source' | 'target'): AudioManifestItem | undefined => {
  if (!audioManifest || !audioPathPrefix) return undefined;
  const path = `${audioPathPrefix}.${side}Text`;
  return audioManifest.find(a => a.path === path);
};

const sourceAudioType = computed<AudioAvailability>(() => getAudioManifestEntry('source') ? 'opus' : (!settingsStore.settings.disableTTSFallback && sourceText ? 'tts' : 'none'));
const targetAudioType = computed<AudioAvailability>(() => getAudioManifestEntry('target') ? 'opus' : (!settingsStore.settings.disableTTSFallback && targetText ? 'tts' : 'none'));

function getAudioTooltip(side: 'source' | 'target'): string {
    const audioType = side === 'source' ? sourceAudioType.value : targetAudioType.value;
    if (audioType === 'opus') return t('detailView.tooltips.playOfficialAudio');
    if (audioType === 'tts') return t('detailView.tooltips.playTtsAudio');
    return '';
}

function playAudio(side: 'source' | 'target') {
  const audioType = side === 'source' ? sourceAudioType.value : targetAudioType.value;
  if (audioType === 'none') return;

  const manifestEntry = getAudioManifestEntry(side);
  const langCode = side === 'source' ? sourceLangCode : targetLangCode;
  const textToPlay = side === 'source' ? sourceText : targetText;
  
  // --- THIS IS THE FIX ---
  // We pass the root-relative URL from the manifest directly to the audio service.
  // The audio service is now responsible for creating the full URL.
  const specificAudioUrl = manifestEntry?.url;
  // --- END FIX ---

  playAudioFromComposable('example', {
    sourceUrl: specificAudioUrl,
    identifier: `${audioIdentifier}-${side}`,
    textToSpeak: textToPlay,
    dictionaryPath: audioContext.dictionaryPath,
    wordId: audioContext.wordId,
    disableTTSFallback: settingsStore.settings.disableTTSFallback,
    langCode: langCode,
  });
}
</script>