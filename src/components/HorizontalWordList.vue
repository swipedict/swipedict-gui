<template>
  <div class="flex flex-wrap gap-x-2 gap-y-1.5 pl-2">
    <TextPairDisplay
      v-for="(item, index) in items"
      :key="index"
      :source-text="item.sourceText"
      :target-text="item.targetText"
      :source-lang-label="sourceLangLabel"
      :target-lang-label="targetLangLabel"
      :source-lang-code="sourceLangCode"
      :target-lang-code="targetLangCode"
      :audio-identifier="`${itemType}-${wordId}-${index}`"
      :audio-context="{ dictionaryPath: props.dictionaryPath, wordId: props.wordId }"
      :audio-manifest="wordDetail?.media?.audio || []"
      :audio-path-prefix="`${itemType}s.${index}`"
      layout="inline"
      initial-display="both"
      :enable-reveal="false"
    />
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { RelatedAntonym, WordDetail } from '@/types';
import TextPairDisplay from './TextPairDisplay.vue';

type ItemType = 'related' | 'antonym';

const props = defineProps({
  items: {
    type: Array as PropType<RelatedAntonym[]>,
    required: true,
    default: () => []
  },
  itemType: {
    type: String as PropType<ItemType>,
    required: true,
    validator: (value: string) => ['related', 'antonym'].includes(value)
  },
  wordId: {
      type: String,
      required: true
  },
  dictionaryPath: {
      type: String,
      required: true
  },
  sourceLangCode: {
    type: String,
    required: true
  },
  targetLangCode: {
    type: String,
    required: true
  },
  sourceLangLabel: {
    type: String,
    required: true
  },
  targetLangLabel: {
    type: String,
    required: true
  },
  wordDetail: {
      type: Object as PropType<WordDetail | null>,
      default: null
  }
});
</script>