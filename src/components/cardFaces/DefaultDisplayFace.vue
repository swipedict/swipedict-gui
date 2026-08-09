<template>
  <div class="default-display-face-root w-full h-full flex flex-col relative">

    <!-- Thumbnail Display as a separate, visible element -->
    <div
      v-if="props.thumbnailUrl"
      class="absolute top-2 left-2 w-24 h-[72px] rounded-lg shadow-md pointer-events-none z-10"
      aria-hidden="true"
    >
        <div 
            class="w-full h-full bg-cover bg-center bg-no-repeat opacity-90 rounded-lg border-2 border-white"
            :style="{ backgroundImage: `url(${props.thumbnailUrl})` }">
        </div>
    </div>

    <!-- TOP HALF CONTAINER (Source) -->
    <div
      class="source-section-wrapper flex-1 basis-0 min-h-0 w-full overflow-hidden"
      :class="getSourceSectionBgClass"
    >
      <div
        class="h-full flex flex-col justify-center items-center px-4 py-3 text-center relative"
        :style="{ opacity: getOpacityForFace('source') }"
        :aria-hidden="!(shouldShowSourceContent && getOpacityForFace('source') > 0.05)"
      >
        <template v-if="wordItem?.source && shouldShowSourceContent">
          <!-- ... source content ... -->
          <h2 class="headword source-headword-text" :class="getSourceHeadwordColor">
            {{ wordItem.source.headword }}
            <span v-if="wordItem.type === 'noun' && wordItem.source.genus"
                  class="genus-tag-display"
                  :class="getSourceGenusTagColor">
              ({{ getGenusAbbreviation(wordItem.source.genus) }})
            </span>
          </h2>
          <p v-if="wordItem.source.pronunciation" class="pronunciation-text" :class="getSourcePronunciationColor">
            {{ wordItem.source.pronunciation }}
          </p>
        </template>
      </div>
    </div>

    <!-- Optional Divider -->
    <div v-if="shouldShowSourceContent && shouldShowTargetContent && effectiveDisplayMode === 'all'" class="divider-line h-px bg-gray-300 dark:bg-slate-600 w-full shrink-0 z-0"></div>

    <!-- BOTTOM HALF CONTAINER (Target) -->
    <div
      class="target-section-wrapper flex-1 basis-0 min-h-0 w-full overflow-hidden"
      :class="getTargetSectionBgClass"
    >
      <div
        class="h-full flex flex-col justify-center items-center px-4 py-3 text-center relative"
        :style="{ opacity: getOpacityForFace('target') }"
        :aria-hidden="!(shouldShowTargetContent && getOpacityForFace('target') > 0.05)"
      >
        <template v-if="wordItem?.target && shouldShowTargetContent">
          <!-- ... target content ... -->
          <p
            data-interactive-slot-item="true"
            @click.stop="emit('card-action', WordListActions.PLAY_SOUND_TARGET)"
            class="headword target-headword-text cursor-pointer"
            :class="[getTargetHeadwordColor, effectiveDisplayMode !== 'targetOnly' ? '' : 'text-xl md:text-2xl']"
          >
            {{ wordItem.target.headword }}
          </p>
          <span v-if="wordItem.target.headword_definite" class="definite-form block" :class="getTargetDefiniteFormColor">
            ({{ wordItem.target.headword_definite }})
          </span>
          <span v-if="wordItem.type === 'noun' && wordItem.target.genus"
                class="genus-tag-display"
                :class="getTargetGenusTagColor">
            [{{ getGenusAbbreviation(wordItem.target.genus) }}]
          </span>
          <p v-if="wordItem.target.pronunciation" class="pronunciation-text" :class="getTargetPronunciationColor">
            {{ wordItem.target.pronunciation }}
          </p>
        </template>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ComputedRef } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import type { BaseFaceComponentProps } from '@/types/interactiveCard';
import { WordItemInjectionKey } from '@/types/interactiveCard';
import { WordListActions } from '@/types/cardConstants';
import type { GrammaticalGenus, WordEntry } from '@/types';

const props = defineProps<BaseFaceComponentProps>();

// --- INJECTED DATA ---
const wordItem = inject<ComputedRef<WordEntry>>(WordItemInjectionKey);
if (!wordItem) {
  throw new Error("DefaultDisplayFace must be a descendant of a component that provides 'wordItem'");
}
// --- END INJECTED DATA ---

const emit = defineEmits<{
  (e: 'card-action', actionName: string, details?: any): void;
}>();

const settingsStore = useSettingsStore();

// --- Visibility Logic ---
const effectiveDisplayMode = computed(() => props.displayMode || settingsStore.settings.initialListDisplay);
const isRevealOnTapEnabledBySetting = computed(() => settingsStore.settings.revealOnTap);
const isRevealOnSwipeEnabledBySetting = computed(() => settingsStore.settings.revealOnSwipe);
const justTapped = computed(() => props.justTappedCard || false);
const isInteractingLive = computed(() => props.isCardDragging || false);
const diffXLive = computed(() => props.diffXWhileDragging || 0);

const isDraggingToReveal = computed(() =>
    isInteractingLive.value &&
    isRevealOnSwipeEnabledBySetting.value &&
    Math.abs(diffXLive.value) > 10
);

const shouldShowSourceContent = computed(() => {
  if (!wordItem.value?.source) return false;
  if (effectiveDisplayMode.value === 'all' || effectiveDisplayMode.value === 'sourceOnly') return true;
  if (effectiveDisplayMode.value === 'targetOnly' &&
      ((justTapped.value && isRevealOnTapEnabledBySetting.value) || isDraggingToReveal.value)
     ) return true;
  return false;
});

const shouldShowTargetContent = computed(() => {
  if (!wordItem.value?.target) return false;
  if (effectiveDisplayMode.value === 'all' || effectiveDisplayMode.value === 'targetOnly') return true;
  if (effectiveDisplayMode.value === 'sourceOnly' &&
      ((justTapped.value && isRevealOnTapEnabledBySetting.value) || isDraggingToReveal.value)
     ) return true;
  return false;
});

const getOpacityForFace = (part: 'source' | 'target'): number => {
  const REVEAL_DRAG_THRESHOLD_PX = 40;

  if (effectiveDisplayMode.value === 'all') {
    return 1;
  }

  const isPrimaryDisplayPart =
    (part === 'source' && effectiveDisplayMode.value === 'sourceOnly') ||
    (part === 'target' && effectiveDisplayMode.value === 'targetOnly');

  if (isPrimaryDisplayPart) {
    return 1;
  }

  if (justTapped.value && isRevealOnTapEnabledBySetting.value) {
    return 1;
  }

  if (isDraggingToReveal.value) {
    return Math.min(1, Math.abs(diffXLive.value) / REVEAL_DRAG_THRESHOLD_PX);
  }

  return 0.01;
};
// --- End Visibility Logic ---

function getGenusAbbreviation(genus?: GrammaticalGenus): string {
    if (!genus) return '';
    switch (genus.toLowerCase()) {
        case 'masculine': return 'm';
        case 'feminine': return 'f';
        case 'neuter': return 'n';
        default: return genus.substring(0,1).toLowerCase();
    }
}

interface GenusStyleSet {
  background: string;
  headwordText: string;
  tagText: string;
  pronunciationText: string;
  definiteFormText: string;
}

function getGenusStylingClasses(genus?: GrammaticalGenus): GenusStyleSet {
  const genusLower = genus?.toLowerCase();
  switch (genusLower) {
    case 'masculine':
      return { background: 'bg-blue-100 dark:bg-blue-950/60', headwordText: 'text-blue-800 dark:text-blue-200', tagText: 'text-blue-700 dark:text-blue-300', pronunciationText: 'text-blue-600 dark:text-blue-300', definiteFormText: 'text-blue-700 dark:text-blue-300' };
    case 'feminine':
      return { background: 'bg-pink-100 dark:bg-pink-950/60', headwordText: 'text-pink-800 dark:text-pink-200', tagText: 'text-pink-700 dark:text-pink-300', pronunciationText: 'text-pink-600 dark:text-pink-300', definiteFormText: 'text-pink-700 dark:text-pink-300' };
    case 'neuter':
      return { background: 'bg-teal-100 dark:bg-teal-950/60', headwordText: 'text-teal-800 dark:text-teal-200', tagText: 'text-teal-700 dark:text-teal-300', pronunciationText: 'text-teal-600 dark:text-teal-300', definiteFormText: 'text-teal-700 dark:text-teal-300' };
    default:
      return { background: 'bg-white dark:bg-slate-800/80', headwordText: 'text-gray-800 dark:text-slate-100', tagText: 'text-gray-500 dark:text-slate-400', pronunciationText: 'text-gray-500 dark:text-slate-400', definiteFormText: 'text-gray-700 dark:text-slate-300' };
  }
}

const getSourceSectionBgClass = computed(() => {
  // MODIFIED: Apply gender background only if section is sufficiently visible
  if (shouldShowSourceContent.value && getOpacityForFace('source') > 0.05) {
    return getGenusStylingClasses(wordItem.value?.source?.genus).background;
  }
  return 'bg-white dark:bg-slate-800/80'; // Default background
});
const getSourceHeadwordColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.source?.genus).headwordText;
});
const getSourceGenusTagColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.source?.genus).tagText;
});
const getSourcePronunciationColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.source?.genus).pronunciationText;
});

const getTargetSectionBgClass = computed(() => {
  // MODIFIED: Apply gender background only if section is sufficiently visible
  if (shouldShowTargetContent.value && getOpacityForFace('target') > 0.05) {
    return getGenusStylingClasses(wordItem.value?.target?.genus).background;
  }
  return 'bg-white dark:bg-slate-800/80'; // Default background
});
const getTargetHeadwordColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.target?.genus).headwordText;
});
const getTargetGenusTagColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.target?.genus).tagText;
});
const getTargetPronunciationColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.target?.genus).pronunciationText;
});
const getTargetDefiniteFormColor = computed(() => {
  return getGenusStylingClasses(wordItem.value?.target?.genus).definiteFormText;
});
</script>

<style scoped>
/* Styles remain the same as the previous full version */
.default-display-face-root {}

.source-section-wrapper,
.target-section-wrapper {
  /* `flex-1 basis-0 w-full` applied in template */
}

.source-section-wrapper > div,
.target-section-wrapper > div {
  /* `h-full flex flex-col justify-center items-center px-4 py-2 text-center` from template */
  transition: opacity 0.2s ease-in-out;
}

.headword { font-weight: 600; }
.source-headword-text { font-size: 1.25rem; }
@media (min-width: 768px) { .source-headword-text { font-size: 1.5rem; } }
.target-headword-text { font-size: 1.125rem; }
@media (min-width: 768px) { .target-headword-text { font-size: 1.25rem; } }
.genus-tag-display { font-size: 0.75rem; font-weight: 600; margin-left: 0.25rem; display: inline; }
.definite-form { font-size: 1rem; font-weight: 500; }
.pronunciation-text { font-size: 0.875rem; font-style: italic; margin-top: 0.125rem; }
.divider-line { flex-shrink: 0; }
</style>