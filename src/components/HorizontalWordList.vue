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
      :audio-context="{ dictionaryPath: dictionaryPath, wordId: wordId }"
      :audio-manifest="wordDetail?.media?.audio || []"
      :audio-path-prefix="`${itemType}s.${index}`"
      layout="inline"
      initial-display="both"
      :enable-reveal="false"
    />
  </div>
</template>

<script setup lang="ts">
import type { RelatedAntonym, WordDetail } from '@/types';
import TextPairDisplay from './TextPairDisplay.vue';

type ItemType = 'related' | 'antonym';

const { items, itemType, wordId, dictionaryPath, sourceLangCode, targetLangCode, sourceLangLabel, targetLangLabel, wordDetail = null } = defineProps<{
  items: RelatedAntonym[];
  itemType: ItemType;
  wordId: string;
  dictionaryPath: string;
  sourceLangCode: string;
  targetLangCode: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  wordDetail?: WordDetail | null;
}>();
</script>