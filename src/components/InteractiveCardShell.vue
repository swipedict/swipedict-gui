<template>
  <div
    ref="shellSurfaceEl"
    class="interactive-card-shell w-full h-full bg-white rounded-lg shadow-lg touch-manipulation select-none flex flex-col justify-start overflow-hidden relative border-2"
    :class="[borderColorClass]"
    :style="{
      cursor: currentSurfaceIsDragging ? 'grabbing' : (interactionsForActiveFace ? 'grab' : 'default'),
      transform: enableVisualSwipeFeedback ? swipeTransformStyleFromHook : 'none',
      transition: enableVisualSwipeFeedback ? swipeTransitionStyleFromHook : 'none'
    }"
    @pointerdown="onSurfacePointerDown"
    @contextmenu.prevent="handleContextMenu"
  >
    <CardShellOverlays
      :show-details-icon="effectiveShowDetailsIcon"
      :has-user-drawing="hasUserDrawingData"
      :has-user-image="hasUserImageData"
      :show-action-buttons="showActionButtons"
      @overlay-action="handleOverlayAction"
    />

    <div class="flex-grow w-full h-full relative">
      <slot name="face" :faceConfig="activeFaceConfig" :isInteracting="currentSurfaceIsDragging" :diffX="currentSurfaceDiffX"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, inject, useTemplateRef } from 'vue';
import type { ComputedRef } from 'vue';
import { useSwipeInteraction } from '@/composables/useSwipeInteraction';
import type { CardFaceConfig, FaceInteractionConfig, InteractionRequestPayload } from '@/types/interactiveCard';
import { WordItemInjectionKey } from '@/types/interactiveCard';
import { WordListActions, FaceType } from '@/types/cardConstants';
import type { WordEntry, WordMediaData } from '@/types';
import CardShellOverlays from './CardShellOverlays.vue';
import { useCustomMediaStore } from '@/stores/customMediaStore';

const { cardId, activeFaceConfig, interactionsForActiveFace = null, enableVisualSwipeFeedback = false, swipeThreshold = 80, swipeMaxRotation = 5, longPressDelay = 700 } = defineProps<{
  cardId: string;
  activeFaceConfig: CardFaceConfig;
  interactionsForActiveFace?: FaceInteractionConfig | null;
  enableVisualSwipeFeedback?: boolean;
  swipeThreshold?: number;
  swipeMaxRotation?: number;
  longPressDelay?: number;
}>();

const emit = defineEmits<{
  (e: 'interaction-request', payload: InteractionRequestPayload): void;
}>();

// --- INJECTED DATA ---
const wordItem = inject<ComputedRef<WordEntry>>(WordItemInjectionKey);
if (!wordItem) {
    throw new Error("InteractiveCardShell must be a descendant of a component that provides 'wordItem'");
}
// --- END INJECTED DATA ---

const shellSurfaceEl = useTemplateRef('shellSurfaceEl');
const customMediaStore = useCustomMediaStore();

const hasUserDrawingData = computed(() => {
    if (activeFaceConfig.faceType === FaceType.SRS_ANSWER) {
        return false;
    }
    if (wordItem.value.mediaData?.drawingDataUrl) {
        return true;
    }
    if (wordItem.value.metadata.dictionaryPath) {
        return !!customMediaStore.getMedia(wordItem.value.metadata.dictionaryPath, wordItem.value.id)?.drawingDataUrl;
    }
    return false;
});

const hasUserImageData = computed(() => {
    if (activeFaceConfig.faceType === FaceType.SRS_ANSWER) {
        return false;
    }
    if (wordItem.value.mediaData?.imageDataUrl) {
        return true;
    }
    if (wordItem.value.metadata.dictionaryPath) {
        return !!customMediaStore.getMedia(wordItem.value.metadata.dictionaryPath, wordItem.value.id)?.imageDataUrl;
    }
    return false;
});

const effectiveShowDetailsIcon = computed(() => {
  const baseVisibility = !!interactionsForActiveFace;
  if (!baseVisibility) return false;
  if (activeFaceConfig.faceType === FaceType.SRS_QUESTION) {
    return false;
  }
  return true;
});

// New computed property to decide when to show the Keep/Ignore buttons
const showActionButtons = computed(() => {
    // Only show for these specific face types, which are the main list views.
    return activeFaceConfig.faceType === FaceType.WORD_LIST_DEFAULT ||
           activeFaceConfig.faceType === FaceType.EXPLORE_DEFAULT;
});

onMounted(() => {
    if (wordItem.value.metadata.dictionaryPath && !wordItem.value.mediaData?.drawingDataUrl) {
        customMediaStore.getOrFetchMedia(wordItem.value.metadata.dictionaryPath, wordItem.value.id);
    }
});
watch(() => wordItem.value.id, (newId, oldId) => {
    if (newId && newId !== oldId && wordItem.value.metadata.dictionaryPath && !wordItem.value.mediaData?.drawingDataUrl) {
        customMediaStore.getOrFetchMedia(wordItem.value.metadata.dictionaryPath, newId);
    }
}, { immediate: false });

const borderColorClass = computed(() => {
  if (!wordItem.value) return 'border-gray-200';
  switch (wordItem.value.metadata.state) {
    case 'KEEP':
      return 'border-green-400 dark:border-green-700';
    case 'IGNORED':
      return 'border-red-300 dark:border-red-800';
    default:
      return 'border-slate-200 dark:border-slate-700';
  }
});

const {
  isDragging: currentSurfaceIsDragging,
  diffX: currentSurfaceDiffX,
  transformStyle: swipeTransformStyleFromHook,
  transitionStyle: swipeTransitionStyleFromHook,
  handlePointerDown: surfaceSwipeHandlerPointerDown,
  resetSwipeState,
} = useSwipeInteraction(
  shellSurfaceEl,
  {
    threshold: swipeThreshold,
    maxRotation: swipeMaxRotation,
    longPressDelay: longPressDelay
  },
  (event, diffX) => { // onSwipeLeft
    const action = interactionsForActiveFace?.swipeLeft;
    if (action) {
      emit('interaction-request', {
        cardId: cardId,
        originatingFaceId: activeFaceConfig.id,
        interactionType: 'swipe-left',
        actionName: action,
        diffX: diffX
      });
    }
  },
  (event, diffX) => { // onSwipeRight
    const action = interactionsForActiveFace?.swipeRight;
    if (action) {
      emit('interaction-request', {
        cardId: cardId,
        originatingFaceId: activeFaceConfig.id,
        interactionType: 'swipe-right',
        actionName: action,
        diffX: diffX
      });
    }
  },
  (event) => { // onClick
    const action = interactionsForActiveFace?.tap;
    if (action) {
      emit('interaction-request', {
        cardId: cardId,
        originatingFaceId: activeFaceConfig.id,
        interactionType: 'tap',
        actionName: action,
      });
    }
  },
  (event) => { // onLongPress
    const action = interactionsForActiveFace?.longPress || interactionsForActiveFace?.tap;
    if (action) {
         emit('interaction-request', {
            cardId: cardId,
            originatingFaceId: activeFaceConfig.id,
            interactionType: 'long-press',
            actionName: action,
        });
    }
  }
);

function onSurfacePointerDown(event: PointerEvent) {
  if (!interactionsForActiveFace) return;
  const targetElement = event.target as HTMLElement;
  if (targetElement.closest('button, a, input, select, textarea, [data-interactive-slot-item="true"], .card-shell-overlays-container div[role="button"], .card-shell-overlays-container button')) {
      return;
  }
  surfaceSwipeHandlerPointerDown(event);
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  const action = interactionsForActiveFace?.contextMenu || interactionsForActiveFace?.tap;
  if (action) {
      emit('interaction-request', {
        cardId: cardId,
        originatingFaceId: activeFaceConfig.id,
        interactionType: 'context-menu',
        actionName: action,
    });
  }
}

function handleOverlayAction(payload: { type: string; details?: any }) {
  let actionToEmit: string | undefined = undefined;

  switch (payload.type) {
    case 'show-details':
        actionToEmit = WordListActions.GOTO_DETAILS;
        break;
    case 'show-drawing-hint':
        actionToEmit = WordListActions.TOGGLE_HINT_DRAWING;
        break;
    case 'show-image-hint':
        actionToEmit = WordListActions.TOGGLE_HINT_IMAGE;
        break;
    case 'mark-ignore':
        actionToEmit = WordListActions.MARK_IGNORED;
        break;
    case 'mark-keep':
        actionToEmit = WordListActions.MARK_KEEP;
        break;
  }

  if (actionToEmit) {
    // FIX: Add a guard to ensure activeFaceConfig exists before using it.
    // This can happen during rapid state transitions or component teardown.
    if (!activeFaceConfig) {
      console.warn("InteractiveCardShell: handleOverlayAction triggered but activeFaceConfig is not available. Aborting event emit.");
      return;
    }
    
    emit('interaction-request', {
      cardId: cardId,
      originatingFaceId: activeFaceConfig.id,
      interactionType: 'tap', // Treat button clicks like taps for consistency
      actionName: actionToEmit,
    });
  }
}

defineExpose({ resetSwipeState });

</script>

<style scoped>
.interactive-card-shell {
  padding: 0;
  box-sizing: border-box;
  transition-property: transform, border-color;
  transition-duration: 0.3s;
  transition-timing-function: ease-out;
}

.touch-manipulation {
  touch-action: pan-y;
}
</style>