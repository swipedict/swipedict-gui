<template>
  <div class="card-content-face card-hint-face bg-gray-50">
    <p v-if="props.isLoadingHint" class="text-gray-500 text-sm">Lade Hinweis...</p>
    <img v-else-if="props.hintUrl" :src="props.hintUrl" :alt="hintAltText" />
    <p v-else class="text-gray-400 italic text-sm">Kein Hinweis vorhanden.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import type { BaseFaceComponentProps } from '@/types/interactiveCard';
// No specific actions emitted from here; interactions are handled by ManagedWordCard based on config.

const props = defineProps<BaseFaceComponentProps & {
  // We could add a prop to distinguish between drawing/image if needed for alt text,
  // but ManagedWordCard already knows this when it sets the faceType.
  // For now, the hintUrl prop is sufficient for this component.
}>();

const hintAltText = computed(() => {
  // This is a bit of a guess, ideally, ManagedWordCard would pass hintType
  if (props.hintUrl?.includes('_drawing.')) return 'Handzeichnung';
  if (props.hintUrl?.includes('_image.')) return 'Bildhinweis';
  return 'Hinweis';
});
</script>

<style scoped>
/* Styles for this face are inherited from global .card-hint-face in main.css */
</style>