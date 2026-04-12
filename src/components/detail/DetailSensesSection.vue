<template>
  <div v-if="senses && senses.length > 0" class="border-b border-gray-200 dark:border-slate-700 pb-4">
    <h3 class="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-3">{{ $t('detailView.sections.nuancesOf') }} <span class="text-green-700 dark:text-green-400">{{ wordDetail?.target?.headword || '?' }}</span></h3>
    <div class="space-y-4 pl-2">
      <div v-for="(sense, sIndex) in senses" :key="`sense-${sIndex}`" class="border-l-2 border-blue-200 dark:border-blue-700/60 pl-3 pb-3 last:pb-0">
        <h4 class="text-md font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ sense.gloss }}</h4>
        <TextPairDisplay
            v-if="sense.explanation?.sourceText && wordDetail"
            class="text-sm my-2 bg-gray-50 dark:bg-slate-800/60 p-2 rounded-md"
            :source-text="sense.explanation.sourceText"
            :target-text="sense.explanation.targetText"
            :source-lang-label="wordDetail.sourceLanguage.toUpperCase()"
            :target-lang-label="wordDetail.targetLanguage.toUpperCase()"
            :source-lang-code="wordDetail.sourceLanguage"
            :target-lang-code="wordDetail.targetLanguage"
            :audio-identifier="`sense-expl-${wordId}-${sIndex}`"
            :audio-context="{ dictionaryPath: dictionaryPath, wordId: wordId }"
            :audio-manifest="wordDetail.media?.audio || []"
            :audio-path-prefix="`senses.${sIndex}.explanation`"
            layout="block"
            :visibility-control="visibilityControl"
        />
        
        <ul v-if="sense.examples && sense.examples.length > 0 && wordDetail" class="list-none pl-2 space-y-2 mt-2">
          <li v-for="(ex, eIndex) in sense.examples" :key="`sense-${sIndex}-ex-${eIndex}`">
            <TextPairDisplay
                :source-text="ex.sourceText"
                :target-text="ex.targetText"
                :source-lang-label="wordDetail.sourceLanguage.toUpperCase()"
                :target-lang-label="wordDetail.targetLanguage.toUpperCase()"
                :source-lang-code="wordDetail.sourceLanguage"
                :target-lang-code="wordDetail.targetLanguage"
                :audio-identifier="`sense-example-${wordId}-${sIndex}-${eIndex}`"
                :audio-context="{ dictionaryPath: dictionaryPath, wordId: wordId }"
                :audio-manifest="wordDetail.media?.audio || []"
                :audio-path-prefix="`senses.${sIndex}.examples.${eIndex}`"
                layout="block"
                :visibility-control="visibilityControl"
            />
          </li>
        </ul>
        <p v-else class="text-xs text-gray-400 dark:text-slate-500 italic pl-2">{{ $t('detailView.senses.noExamples') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { Sense, WordDetail } from '@/types';
import TextPairDisplay from '@/components/TextPairDisplay.vue';

type VisibilityMode = 'all' | 'sourceOnly' | 'targetOnly';

defineProps({
  senses: {
    type: Array as PropType<Sense[]>,
    default: () => []
  },
  wordDetail: {
    type: Object as PropType<WordDetail | null>,
    required: true
  },
  wordId: {
    type: String,
    required: true
  },
  dictionaryPath: {
    type: String,
    required: true
  },
  visibilityControl: {
    type: String as PropType<VisibilityMode>,
    default: 'all'
  }
});
</script>