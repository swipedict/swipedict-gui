<template>
    <div class="flex flex-col justify-between h-full w-full text-center p-3">
        <!-- Answer Area -->
        <div class="flex-grow flex flex-col justify-center mb-2">
             <!-- If question was SOURCE, answer is TARGET -->
             <div v-if="questionSide === 'sourceOnly' && wordItem?.target" class="min-h-[60px]">
                 <p
                    data-interactive-slot-item="true"
                    class="text-xl md:text-2xl font-semibold text-green-700 cursor-pointer hover:text-green-800 active:text-green-900 transition-colors"
                    @click.stop="$emit('play-audio', 'target')"
                    :title="$t('detailView.tooltips.playAudio', { lang: 'Target' })"
                  >
                    {{ wordItem.target.headword }}
                  </p>
                 <span v-if="wordItem.target.headword_definite" class="text-lg text-green-600 font-medium">({{ wordItem.target.headword_definite }})</span>
                 <span v-if="wordItem.target.genus" class="text-xs font-semibold ml-1">[{{ wordItem.target.genus.substring(0,1) }}]</span>
                 <p v-if="wordItem.target.pronunciation" class="text-sm text-gray-500 italic mt-1">{{ wordItem.target.pronunciation }}</p>
             </div>
             <!-- If question was TARGET, answer is SOURCE -->
             <div v-else-if="questionSide === 'targetOnly' && wordItem?.source" class="min-h-[60px]">
                 <h2
                    data-interactive-slot-item="true"
                    class="text-xl md:text-2xl font-bold text-blue-700 cursor-pointer hover:text-blue-800 active:text-blue-900 transition-colors"
                    @click.stop="$emit('play-audio', 'source')"
                    :title="$t('detailView.tooltips.playAudio', { lang: 'Source' })"
                  >
                   {{ wordItem.source.headword }}
                   <span v-if="wordItem.source.genus" class="text-xs font-semibold ml-1">({{ wordItem.source.genus.substring(0,1) }})</span>
                 </h2>
                 <p v-if="wordItem.source.pronunciation" class="text-sm text-gray-500 italic mt-1">{{ wordItem.source.pronunciation }}</p>
             </div>
             <!-- Fallback if data is missing -->
             <div v-else class="italic text-gray-400">{{ $t('srsCard.answerMissing') }}</div>
        </div>

        <!-- Rating Buttons Area -->
        <div class="flex-shrink-0 pt-2 mt-2 border-t border-gray-200 flex justify-around gap-1 sm:gap-2">
            <button @click="$emit('rate', 'again')" class="srs-button bg-red-100 text-red-700 hover:bg-red-200">{{ $t('srs.again') }}</button>
            <button @click="$emit('rate', 'hard')" class="srs-button bg-orange-100 text-orange-700 hover:bg-orange-200">{{ $t('srs.hard') }}</button>
            <button @click="$emit('rate', 'good')" class="srs-button bg-green-100 text-green-700 hover:bg-green-200">{{ $t('srs.good') }}</button>
            <button @click="$emit('rate', 'easy')" class="srs-button bg-blue-100 text-blue-700 hover:bg-blue-200">{{ $t('srs.easy') }}</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ComputedRef } from 'vue';
import type { WordEntry, SrsRating } from '@/types';
import type { BaseFaceComponentProps } from '@/types/interactiveCard';
import { WordItemInjectionKey } from '@/types/interactiveCard';

const props = defineProps<BaseFaceComponentProps>();

const { t } = useI18n();
const wordItem = inject<ComputedRef<WordEntry>>(WordItemInjectionKey);
if (!wordItem) {
  throw new Error("SrsAnswerFace must be a descendant of a component that provides 'wordItem'");
}

const emit = defineEmits<{
  (e: 'rate', rating: SrsRating): void
  (e: 'play-audio', side: 'source' | 'target'): void
}>();

const questionSide = computed(() => props.questionSide);
</script>

<style scoped>
@reference "../../assets/main.css";
.srs-button {
    @apply px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium rounded transition-colors flex-1 whitespace-nowrap;
    min-width: 50px;
}
</style>