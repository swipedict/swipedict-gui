<template>
  <div v-if="items && items.length > 0" class="space-y-2 text-sm">
    <div v-for="(item, index) in items" :key="index"
         class="border-b border-gray-100 dark:border-slate-700/50 pb-2 last:border-b-0">

      <template v-if="type === 'example'">
         <p v-if="(item as Example).label" class="text-xs text-gray-500 dark:text-slate-400 italic mb-1">{{ (item as Example).label }}</p>
         <TextPairDisplay
            :source-text="(item as Example).sourceText"
            :target-text="(item as Example).targetText"
            source-lang-label="S"
            target-lang-label="T"
            :source-lang-code="wordDetail?.sourceLanguage || 'src'"
            :target-lang-code="wordDetail?.targetLanguage || 'tgt'"
            :audio-identifier="`example-${wordId}-${index}`"
            :audio-context="{ dictionaryPath: props.dictionaryPath, wordId: props.wordId }"
            :audio-manifest="wordDetail?.media?.audio || []"
            :audio-path-prefix="`examples.${index}`"
            layout="block"
            :initial-display="'both'"
            :enable-reveal="false"
         />
      </template>

      <template v-else-if="type === 'learningTip'">
         <p><strong class="text-purple-600 dark:text-purple-400 font-medium">Tip ({{ (item as LearningTip).lang }}):</strong> {{ (item as LearningTip).text }}</p>
      </template>

       <template v-else-if="type === 'related' || type === 'antonym'">
         <p v-if="(item as RelatedAntonym).whyRelated && type === 'related'" class="text-xs text-gray-500 dark:text-slate-400 italic mb-1"> {{ (item as RelatedAntonym).whyRelated }} </p>
         <p v-if="(item as RelatedAntonym).sourceText"><strong class="text-blue-600 dark:text-blue-400 font-medium">S:</strong> {{ (item as RelatedAntonym).sourceText }}</p>
         <p v-if="(item as RelatedAntonym).targetText"><strong class="text-green-600 dark:text-green-400 font-medium">T:</strong> {{ (item as RelatedAntonym).targetText }}</p>
       </template>

       <template v-if="!itemHasContent(item)">
           <p class="text-xs text-red-500 italic">(Invalid {{ type }} data)</p>
       </template>

    </div>
  </div>
  <p v-else class="text-sm text-gray-500 dark:text-slate-400 italic">No {{ typeLabel }} available for this word.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import type { Example, LearningTip, RelatedAntonym, WordDetail } from '@/types';
import { useI18n } from 'vue-i18n';
import TextPairDisplay from './TextPairDisplay.vue';

type InfoItem = Example | LearningTip | RelatedAntonym;
type InfoType = 'example' | 'learningTip' | 'related' | 'antonym';

const props = defineProps({
  items: { type: Array as PropType<InfoItem[]>, default: () => [] },
  type: { type: String as PropType<InfoType>, required: true },
  wordId: { type: String, required: true },
  dictionaryPath: { type: String, required: true },
  wordDetail: { type: Object as PropType<WordDetail | null>, default: null }
});

const { t } = useI18n();

const typeLabel = computed(() => {
    switch (props.type) {
        case 'example': return 'examples';
        case 'learningTip': return 'learning tips';
        case 'related': return 'related words';
        case 'antonym': return 'antonyms';
        default: return 'items';
    }
});

function itemHasContent(item: InfoItem): boolean {
    if (props.type === 'example') { return !!(item as Example).sourceText || !!(item as Example).targetText; }
    if (props.type === 'learningTip') { return !!(item as LearningTip).text; }
    if (props.type === 'related' || props.type === 'antonym') { return !!(item as RelatedAntonym).sourceText || !!(item as RelatedAntonym).targetText; }
    return false;
}
</script>