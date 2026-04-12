<template>
  <CollapsibleSection :title="title" :start-open="!!initialContent">
    <!-- The main interactive component (e.g., textarea, canvas) goes here -->
    <slot :current-content="currentContent" :is-saving="customMediaStore.isSavingMediaGlobally"></slot>
    
    <MediaActionButtons
      :is-saving="customMediaStore.isSavingMediaGlobally"
      :has-content="!!currentContent"
      :save-button-text="saveButtonText"
      :clear-button-text="clearButtonText"
      :saving-button-text="$t('general.saving')"
      @save="$emit('save')"
      @clear="$emit('clear')"
    />
  </CollapsibleSection>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import MediaActionButtons from './MediaActionButtons.vue';

const props = defineProps<{
  title: string;
  initialContent: string | null | undefined;
  saveButtonText: string;
  clearButtonText: string;
}>();

const emit = defineEmits(['save', 'clear']);

const customMediaStore = useCustomMediaStore();
const currentContent = ref(props.initialContent);

watch(() => props.initialContent, (newVal) => {
  currentContent.value = newVal;
});
</script>