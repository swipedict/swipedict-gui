<template>
  <div v-if="content" class="flex-1 space-y-2" :class="{ 'md:text-right': lang === targetLanguage }">
    <!-- Headword with Gender -->
    <div
      @click="handleHeadwordClick"
      :class="{ 'cursor-pointer hover:opacity-80 transition-opacity': audioAvailability !== 'none', 'md:justify-end': lang === targetLanguage }"
      :title="audioAvailability !== 'none' ? $t('detailView.tooltips.playAudio', { lang: content.lang }) : ''"
      class="flex items-baseline gap-2"
    >
       <span v-if="content.genus"
            class="text-sm font-semibold order-first mr-1 pointer-events-none"
            :class="lang === sourceLanguage ? genusAbbreviationColor(content.genus) : 'text-gray-500'">
            ({{ getGenusAbbreviation(content.genus) }})
       </span>

        <h2 class="text-3xl font-bold pointer-events-none"
            :class="genusHeadwordColor(content.genus, lang)">
          {{ content.headword }}
        </h2>
    </div>

    <!-- Pronunciation & Smart Audio Icon -->
    <div class="flex items-center gap-2" :class="{ 'md:justify-end': lang === targetLanguage }">
        <p v-if="content.pronunciation" class="text-gray-600 dark:text-slate-400 italic text-sm">
            {{ content.pronunciation }}
        </p>
        <button
            v-if="audioAvailability !== 'none'"
            @click.stop="handleIconClick"
            :class="lang === sourceLanguage ? 'text-blue-500 hover:text-blue-700' : 'text-green-500 hover:text-green-700'"
            :title="audioAvailability === 'opus' ? $t('detailView.tooltips.playOfficialAudio') : $t('detailView.tooltips.playTtsAudio')"
        >
             <SpeakerWaveIcon v-if="audioAvailability === 'opus'" class="h-5 w-5" />
             <CpuChipIcon v-else-if="audioAvailability === 'tts'" class="h-5 w-5" />
        </button>
    </div>

     <!-- Etymology (from content prop), now toggleable -->
     <div v-if="content.etymology?.explanation" class="text-xs text-gray-500 dark:text-slate-400 mt-2" :class="{ 'md:text-right': lang === targetLanguage }">
        <div class="flex items-start gap-2" :class="{ 'md:flex-row-reverse': lang === targetLanguage }">
            <div class="flex items-center gap-0.5 flex-shrink-0 mt-px">
                <button @click="toggleEtymology" class="p-1 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700" :title="$t('detailView.tooltips.toggleEtymology')">
                    <ArrowsRightLeftIcon class="w-3.5 h-3.5" />
                </button>
                <button
                    v-if="etymologyAudioAvailability !== 'none'"
                    @click.stop="emit('playEtymologyAudio', lang)"
                    class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                    :class="lang === sourceLanguage ? 'text-blue-500 hover:text-blue-700' : 'text-green-500 hover:text-green-700'"
                    :title="etymologyAudioAvailability === 'opus' ? $t('detailView.tooltips.playOfficialAudio') : $t('detailView.tooltips.playTtsAudio')"
                >
                    <SpeakerWaveIcon v-if="etymologyAudioAvailability === 'opus'" class="h-3.5 w-3.5" />
                    <CpuChipIcon v-else-if="etymologyAudioAvailability === 'tts'" class="h-3.5 w-3.5" />
                </button>
            </div>
            <div class="italic flex-grow">
                <div v-if="showSourceEtymology">
                    <span class="font-semibold not-italic text-gray-600 dark:text-slate-300">{{ $t('detailView.etymologyLabel', { lang: sourceLanguage.toUpperCase() }) }}</span>
                    {{ content.etymology.explanation.sourceText }}
                </div>
                <div v-else>
                    <span class="font-semibold not-italic text-gray-600 dark:text-slate-300">{{ $t('detailView.etymologyLabel', { lang: targetLanguage.toUpperCase() }) }}</span>
                    {{ content.etymology.explanation.targetText }}
                </div>
            </div>
        </div>
     </div>
     <!-- Additional Notes -->
     <p v-if="content.additional" class="text-sm text-gray-600 dark:text-slate-300 mt-1" :class="{ 'md:text-right': lang === targetLanguage }">
         <strong class="font-semibold text-gray-700 dark:text-slate-200">{{ $t('detailView.noteLabel') }}</strong> {{ content.additional }}
     </p>

  </div>
  <div v-else class="flex-1 text-gray-400 dark:text-slate-500 italic">
      Content for language '{{ lang }}' is missing.
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WordSideContent, GrammaticalGenus } from '@/types';
import { SpeakerWaveIcon, CpuChipIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline';

type AudioAvailability = 'opus' | 'tts' | 'none';

const props = defineProps({
    content: {
      type: Object as PropType<WordSideContent | undefined>,
      required: false
    },
    lang: {
      type: String,
      required: true
    },
    audioAvailability: {
        type: String as PropType<AudioAvailability>,
        required: true,
        default: 'none'
    },
    etymologyAudioAvailability: {
        type: String as PropType<AudioAvailability>,
        required: false,
        default: 'none'
    },
    sourceLanguage: {
      type: String,
      required: true
    },
    targetLanguage: {
      type: String,
      required: true
    }
});

const emit = defineEmits<{
    (e: 'playAudio', lang: string): void
    (e: 'playEtymologyAudio', lang: string): void
}>();

const { t } = useI18n();
const showSourceEtymology = ref(false);

function toggleEtymology() { showSourceEtymology.value = !showSourceEtymology.value; }
function handleHeadwordClick() { if (props.audioAvailability !== 'none') emit('playAudio', props.lang); }
function handleIconClick() { emit('playAudio', props.lang); }

function getGenusAbbreviation(genus?: GrammaticalGenus): string { if (!genus) return ''; switch (genus?.toLowerCase()) { case 'masculine': return 'm'; case 'feminine': return 'f'; case 'neuter': return 'n'; default: return genus.substring(0,1).toLowerCase(); } }

function genusHeadwordColor(genus: GrammaticalGenus | undefined, currentLang: string): string {
    if (currentLang === props.targetLanguage) return 'text-green-700 dark:text-green-400';
    if (currentLang === props.sourceLanguage) {
        switch (genus?.toLowerCase()) {
            case 'masculine': return 'text-blue-700 dark:text-blue-400';
            case 'feminine': return 'text-pink-600 dark:text-pink-400';
            case 'neuter': return 'text-purple-700 dark:text-purple-400';
            default: return 'text-gray-800 dark:text-slate-100';
        }
    }
    return 'text-gray-800 dark:text-slate-100';
}

function genusAbbreviationColor(genus?: GrammaticalGenus): string {
    switch (genus?.toLowerCase()) {
        case 'masculine': return 'text-blue-600 dark:text-blue-400';
        case 'feminine': return 'text-pink-500 dark:text-pink-400';
        case 'neuter': return 'text-purple-600 dark:text-purple-400';
        default: return 'text-gray-500 dark:text-slate-400';
    }
}
</script>