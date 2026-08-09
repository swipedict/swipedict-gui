<template>
  <!-- Added explicit centering classes: flex, flex-col, justify-center, items-center, text-center -->
  <div class="card-content-face srs-question-face flex flex-col justify-center items-center text-center h-full w-full">
    <div v-if="wordItem?.source && props.questionSide === 'sourceOnly'" class="w-full flex flex-col items-center">
        <h2 class="text-2xl md:text-3xl font-heading font-bold text-blue-700 mb-2">
            {{ wordItem.source.headword }}
            <span v-if="wordItem.type === 'noun' && wordItem.source.genus" class="text-xs font-semibold ml-1 text-blue-600 align-top">
                ({{ wordItem.source.genus.substring(0,1) }})
            </span>
        </h2>
        <p v-if="wordItem.source.pronunciation" class="text-sm text-gray-500 italic font-mono">
            {{ wordItem.source.pronunciation }}
        </p>
    </div>
    <div v-else-if="wordItem?.target && props.questionSide === 'targetOnly'" class="w-full flex flex-col items-center">
        <p data-interactive-slot-item="true"
            @click.stop="emit('card-action', SrsActions.PLAY_SOUND_QUESTION_TARGET)"
            :title="$t('detailView.tooltips.playAudio', { lang: 'Target' })"
            class="text-xl md:text-2xl font-heading font-semibold text-green-700 cursor-pointer hover:text-green-800 transition-colors mb-2">
            {{ wordItem.target.headword }}
        </p>
          <div class="flex items-center gap-1">
            <span v-if="wordItem.target.headword_definite" class="text-lg text-green-600 font-medium">({{ wordItem.target.headword_definite }})</span>
            <span v-if="wordItem.target.genus" class="text-xs font-semibold text-green-600 bg-green-50 px-1 rounded">[{{ wordItem.target.genus.substring(0,1) }}]</span>
          </div>
        <p v-if="wordItem.target.pronunciation" class="text-sm text-gray-500 italic font-mono mt-1">
            {{ wordItem.target.pronunciation }}
        </p>
    </div>
      <div v-else class="italic text-gray-400">{{ $t('srsCard.questionMissing') }}</div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ComputedRef } from 'vue';
import type { BaseFaceComponentProps } from '@/types/interactiveCard';
import { WordItemInjectionKey } from '@/types/interactiveCard';
import { SrsActions } from '@/types/cardConstants';
import type { WordEntry } from '@/types';

const props = defineProps<BaseFaceComponentProps>();

const { t } = useI18n();

const wordItem = inject<ComputedRef<WordEntry>>(WordItemInjectionKey);
if (!wordItem) {
  throw new Error("SrsQuestionFace must be a descendant of a component that provides 'wordItem'");
}

const emit = defineEmits<{
  (e: 'card-action', actionName: string, details?: any): void;
}>();
</script>

<style scoped>
/* Scoped styles can supplement the utility classes */
</style>