<template>
  <InteractiveCardShell
    :ref="interactiveCardShellRef"
    :card-id="props.wordItem.id"
    :active-face-config="activeCardFaceConfigForShell"
    :interactions-for-active-face="currentFaceInteractions"
    :enableVisualSwipeFeedback="true"
    :class="uiState.isPhysicallyFlipped ? 'perspective-container' : ''"
    @interaction-request="handleInteractionRequestFromShell"
  >
    <template #face="{ faceConfig, isInteracting, diffX }">
      <Transition :name="faceTransitionName" mode="out-in">
        <div :key="faceConfig.faceType" class="w-full h-full">
          <component
            :is="currentComponentToRender"
            v-if="currentComponentToRender"
            :key="activeCardFaceConfigForShell.id"
            v-bind="activeCardFaceConfigForShell.props"
            :isCardDragging="isInteracting"
            :diffXWhileDragging="diffX"
            @card-action="(actionNameFromFace: string, details?: any) => emitCardAction(actionNameFromFace, details, undefined)"
       
            @play-audio="(side: 'source' | 'target') => {
              if (activeCardFaceConfigForShell.faceType === FaceType.SRS_ANSWER && currentComponentToRender) {
                emitCardAction(side === 'source' ? SrsActions.PLAY_SOUND_ANSWER_SOURCE : SrsActions.PLAY_SOUND_ANSWER_TARGET, undefined, undefined);
              }
            }"
            @rate="(rating: SrsRating) => {
              if (activeCardFaceConfigForShell.faceType === FaceType.SRS_ANSWER && currentComponentToRender) {
                emitCardAction(SrsActions.RATE_CARD, rating, undefined);
              }
            }"
          />
          <div v-else class="p-4 text-red-600 card-content-face">
              Unbekannter oder nicht zugeordneter FaceType: {{ activeCardFaceConfigForShell.faceType }}
          </div>
        </div>
      </Transition>
    </template>
  </InteractiveCardShell>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick, onMounted, provide } from 'vue';
import type { PropType, Component } from 'vue';
import InteractiveCardShell from '@/components/InteractiveCardShell.vue';
import DefaultDisplayFace from '@/components/cardFaces/DefaultDisplayFace.vue';
import SrsQuestionFace from '@/components/cardFaces/SrsQuestionFace.vue';
import SrsAnswerFace from '@/components/cardFaces/SrsAnswerFace.vue';
import HintFace from '@/components/cardFaces/HintFace.vue';

import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCustomMediaStore } from '@/stores/customMediaStore'; 
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useThumbnailStore } from '@/stores/thumbnailStore';
import type { WordEntry, SrsRating, WordMediaData } from '@/types';
import type {
  ManagedCardProps,
  CardFaceConfig,
  BaseFaceComponentProps,
  InteractionRequestPayload,
  FaceInteractionConfig,
  CardActionEventPayload,
  CardHintRequestPayload,
  InternalCardUiState,
  FaceTypeKey,
  CardInteractionType
} from '@/types/interactiveCard';
import { WordItemInjectionKey, IsInSrsInjectionKey } from '@/types/interactiveCard';
import { FaceType, WordListActions, SrsActions } from '@/types/cardConstants';
import emitter from '@/services/emitter';
import i18n from '@/i18n';

const props = defineProps<ManagedCardProps & {
  wordItem: WordEntry; 
}>();

const emit = defineEmits<{
  (e: 'card-action', payload: CardActionEventPayload): void;
  (e: 'request-hint', payload: CardHintRequestPayload): void; 
}>();

const appStore = useAppStore();
const settingsStore = useSettingsStore();
const customMediaStore = useCustomMediaStore(); 
const dictionaryStore = useDictionaryStore();
const thumbnailStore = useThumbnailStore();
const interactiveCardShellRef = ref<InstanceType<typeof InteractiveCardShell> | null>(null);

const computedWordItem = computed(() => {
  const media = props.wordItem.metadata.dictionaryPath 
    ? customMediaStore.getMedia(props.wordItem.metadata.dictionaryPath, props.wordItem.id) 
    : undefined;
  return {
    ...props.wordItem,
    mediaData: media 
  };
});

const isInSrs = computed(() => {
    return dictionaryStore.srsWordIds.has(props.wordItem.id);
});

// Provide the word item and SRS status to all child components.
provide(WordItemInjectionKey, computedWordItem);
provide(IsInSrsInjectionKey, isInSrs);

const uiState = reactive<InternalCardUiState>({
  currentFaceType: props.initialFaceType || FaceType.WORD_LIST_DEFAULT,
  isLoadingHint: false,
  hintUrl: null,
  thumbnailUrl: null,
  justTappedForReveal: false,
  isPhysicallyFlipped: false,
  isShellDragging: false,
  shellDiffX: 0,
});

const faceTransitionName = ref('face-fade'); 

const faceComponentMap: Record<string, Component | null> = {
  [FaceType.WORD_LIST_DEFAULT]: DefaultDisplayFace,
  [FaceType.EXPLORE_DEFAULT]: DefaultDisplayFace,
  [FaceType.HINT_DRAWING]: HintFace,
  [FaceType.HINT_IMAGE]: HintFace,
  [FaceType.SRS_QUESTION]: SrsQuestionFace,
  [FaceType.SRS_ANSWER]: SrsAnswerFace,
};

const currentComponentToRender = computed(() => {
  const faceTypeToRender = uiState.currentFaceType;
  if (!faceTypeToRender || !faceComponentMap.hasOwnProperty(faceTypeToRender)) {
    return null;
  }
  return faceComponentMap[faceTypeToRender];
});

const activeCardFaceConfigForShell = computed((): CardFaceConfig => {
  // Determine question side based on new app setting
  let determinedQuestionSide: 'sourceOnly' | 'targetOnly' | undefined = undefined;
  const srsSetting = settingsStore.settings.srsQuestionSide;

  if ((uiState.currentFaceType === FaceType.SRS_QUESTION || uiState.currentFaceType === FaceType.SRS_ANSWER) && props.srsData) {
      if (srsSetting === 'source') {
          determinedQuestionSide = 'sourceOnly';
      } else if (srsSetting === 'target') {
          determinedQuestionSide = 'targetOnly';
      } else { // 'mixed' or default
          determinedQuestionSide = ((props.srsData.lapses || 0) + (props.srsData.learningStep || 0)) % 2 === 0 ? 'sourceOnly' : 'targetOnly';
      }
  }

  const baseProps: BaseFaceComponentProps = {
    srsData: props.srsData,
    displayMode: settingsStore.settings.initialListDisplay,
    isCardDragging: uiState.isShellDragging,
    justTappedCard: uiState.justTappedForReveal,
    diffXWhileDragging: uiState.shellDiffX,
    isLoadingHint: uiState.isLoadingHint,
    hintUrl: uiState.hintUrl,
    thumbnailUrl: uiState.thumbnailUrl,
    questionSide: determinedQuestionSide,
  };
  return {
    id: `${props.wordItem.id}_${uiState.currentFaceType}`,
    faceType: uiState.currentFaceType,
    props: baseProps,
  };
});

const currentFaceInteractions = computed((): FaceInteractionConfig | undefined => {
  return props.faceBehaviorConfig[uiState.currentFaceType]?.interactions;
});

async function fetchThumbnail() {
    if (props.wordItem.metadata.dictionaryPath && computedWordItem.value.mediaData?.imageDataUrl) {
        const thumb = await thumbnailStore.getOrCreateThumbnail(props.wordItem.metadata.dictionaryPath, props.wordItem.id);
        uiState.thumbnailUrl = thumb;
    } else {
        uiState.thumbnailUrl = null;
    }
}

onMounted(() => {
    if (props.wordItem.metadata.dictionaryPath) {
        customMediaStore.getOrFetchMedia(props.wordItem.metadata.dictionaryPath, props.wordItem.id);
        fetchThumbnail();
    }
});

watch(() => props.wordItem.id, (newWordId, oldWordId) => {
    if (newWordId && newWordId !== oldWordId && props.wordItem.metadata.dictionaryPath) {
        customMediaStore.getOrFetchMedia(props.wordItem.metadata.dictionaryPath, newWordId);
        fetchThumbnail();
    }
}, { immediate: false });

watch(() => computedWordItem.value.mediaData?.imageDataUrl, () => {
    fetchThumbnail();
});

function emitCardAction(action: string, details?: any, interactionType?: CardInteractionType) {
  emit('card-action', {
    action,
    wordId: props.wordItem.id,
    srsUniqueId: props.srsData?.uniqueId,
    details,
    interactionType 
  });
}
function getActionNameFromConfig(interactionType: CardInteractionType): string | undefined {
    if (!currentFaceInteractions.value) return undefined;
    switch (interactionType) {
        case 'tap': return currentFaceInteractions.value.tap;
        case 'swipe-left': return currentFaceInteractions.value.swipeLeft;
        case 'swipe-right': return currentFaceInteractions.value.swipeRight;
        case 'long-press': return currentFaceInteractions.value.longPress;
        case 'context-menu': return currentFaceInteractions.value.contextMenu;
        default: return undefined;
    }
}

// --- REFACTORED: Action Handler Map (Strategy Pattern) ---
const actionHandlers: Record<string, (payload: InteractionRequestPayload) => Promise<{ nextFace?: FaceTypeKey; transition?: string; resetSwipe?: boolean; }>> = {
    [WordListActions.GOTO_DETAILS]: async (payload) => {
        emitCardAction(WordListActions.GOTO_DETAILS, payload.interactionDetail, payload.interactionType);
        return { transition: 'none' };
    },
    [SrsActions.GOTO_DETAILS_SRS]: async (payload) => {
        emitCardAction(SrsActions.GOTO_DETAILS_SRS, payload.interactionDetail, payload.interactionType);
        return { transition: 'none' };
    },
    [WordListActions.TAP_REVEAL]: async (payload) => {
        uiState.justTappedForReveal = true;
        if (settingsStore.settings.playSoundOnTap && payload.interactionType === 'tap') {
            emitCardAction(WordListActions.PLAY_SOUND_TARGET, undefined, payload.interactionType);
        }
        await nextTick();
        setTimeout(() => { uiState.justTappedForReveal = false; }, 350);
        return { transition: 'none' };
    },
    [WordListActions.TOGGLE_HINT_DRAWING]: async () => {
        if (uiState.currentFaceType === FaceType.HINT_DRAWING) {
            uiState.isLoadingHint = false;
            uiState.hintUrl = null;
            return { nextFace: props.initialFaceType || (props.srsData ? FaceType.SRS_QUESTION : FaceType.WORD_LIST_DEFAULT), transition: 'face-flip-3d' };
        } else {
            uiState.isLoadingHint = true;
            uiState.hintUrl = null;
            emit('request-hint', { wordId: props.wordItem.id, hintType: 'drawing' });
            return { nextFace: FaceType.HINT_DRAWING, transition: 'face-flip-3d' };
        }
    },
    [WordListActions.TOGGLE_HINT_IMAGE]: async () => {
        if (uiState.currentFaceType === FaceType.HINT_IMAGE) {
            uiState.isLoadingHint = false;
            uiState.hintUrl = null;
            return { nextFace: props.initialFaceType || (props.srsData ? FaceType.SRS_QUESTION : FaceType.WORD_LIST_DEFAULT), transition: 'face-flip-3d' };
        } else {
            uiState.isLoadingHint = true;
            uiState.hintUrl = null;
            emit('request-hint', { wordId: props.wordItem.id, hintType: 'image' });
            return { nextFace: FaceType.HINT_IMAGE, transition: 'face-flip-3d' };
        }
    },
    [SrsActions.SHOW_ANSWER]: async (payload) => {
        // ALWAYS play the TARGET language audio on reveal, as this is the primary learning goal.
        emitCardAction(SrsActions.PLAY_SOUND_ANSWER_TARGET, undefined, payload.interactionType);
        return { nextFace: FaceType.SRS_ANSWER, transition: 'face-flip-3d' };
    },
    [SrsActions.FLIP_TO_QUESTION_INITIAL]: async () => {
        uiState.hintUrl = null;
        return { nextFace: props.initialFaceType || FaceType.SRS_QUESTION, transition: 'face-flip-3d' };
    },
    [SrsActions.GOTO_QUESTION_INITIAL]: async () => {
        uiState.hintUrl = null;
        return { nextFace: props.initialFaceType || FaceType.SRS_QUESTION, transition: 'face-slide-horizontal-prev' };
    },
    [SrsActions.SHOW_HINT_DRAWING]: async () => {
        uiState.isLoadingHint = true;
        emit('request-hint', { wordId: props.wordItem.id, hintType: 'drawing' });
        return { nextFace: FaceType.HINT_DRAWING, transition: 'face-flip-3d' };
    },
    [SrsActions.SHOW_HINT_IMAGE]: async () => {
        uiState.isLoadingHint = true;
        emit('request-hint', { wordId: props.wordItem.id, hintType: 'image' });
        return { nextFace: FaceType.HINT_IMAGE, transition: 'face-flip-3d' };
    },
    // Default handler for actions that just emit and maybe reset swipe
    default: async (payload, actionName) => {
        emitCardAction(actionName, payload.interactionDetail, payload.interactionType);
        return { resetSwipe: payload.interactionType.startsWith('swipe') };
    }
};

async function handleInteractionRequestFromShell(payload: InteractionRequestPayload) {
    uiState.isShellDragging = (payload.interactionType === 'swipe-left' || payload.interactionType === 'swipe-right');
    uiState.shellDiffX = payload.diffX || 0;

    let actionName = payload.actionName || getActionNameFromConfig(payload.interactionType);
    if (!actionName) {
        if (payload.interactionType.startsWith('swipe')) interactiveCardShellRef.value?.resetSwipeState(true);
        return;
    }

    if (actionName === WordListActions.GOTO_DETAILS && props.srsData) {
        actionName = SrsActions.GOTO_DETAILS_SRS;
    }

    const handler = actionHandlers[actionName] || actionHandlers.default;
    const result = await handler(payload, actionName);

    if (result.nextFace && result.nextFace !== uiState.currentFaceType) {
        commandFaceChange(result.nextFace, result.transition);
    } else if (result.transition === 'face-flip-3d') {
        uiState.isPhysicallyFlipped = (
            result.nextFace === FaceType.HINT_DRAWING ||
            result.nextFace === FaceType.HINT_IMAGE ||
            result.nextFace === FaceType.SRS_ANSWER
        );
        faceTransitionName.value = result.transition;
    }
    
    if (result.resetSwipe) {
        interactiveCardShellRef.value?.resetSwipeState(true);
    }

    await nextTick();
    uiState.isShellDragging = false;
    uiState.shellDiffX = 0;
}
// --- END REFACTORED SECTION ---

function setHintData(type: 'drawing' | 'image', url: string | null) {
  const targetHintFace = type === 'drawing' ? FaceType.HINT_DRAWING : FaceType.HINT_IMAGE;
  
  if (uiState.currentFaceType === targetHintFace || 
      (uiState.isLoadingHint && 
        ( (type === 'drawing' && uiState.currentFaceType === FaceType.HINT_DRAWING) || 
          (type === 'image' && uiState.currentFaceType === FaceType.HINT_IMAGE) 
        ) 
      ) 
     ) {
    uiState.hintUrl = url;
    uiState.isLoadingHint = false; 
    if (!url) { 
        emitter.emit('show-notification', { message: i18n.global.t('cardOverlays.noHintAvailable'), type: 'info', duration: 1500 });
        if (uiState.currentFaceType === FaceType.HINT_DRAWING || uiState.currentFaceType === FaceType.HINT_IMAGE) {
            const fallbackFace = props.initialFaceType || (props.srsData ? FaceType.SRS_QUESTION : FaceType.WORD_LIST_DEFAULT);
            commandFaceChange(fallbackFace, 'face-flip-3d');
        }
    }
  } else {
    if (type === 'drawing' && uiState.currentFaceType !== FaceType.HINT_DRAWING && uiState.isLoadingHint) uiState.isLoadingHint = false;
    if (type === 'image' && uiState.currentFaceType !== FaceType.HINT_IMAGE && uiState.isLoadingHint) uiState.isLoadingHint = false;
  }
}

watch(() => [
  settingsStore.settings.initialListDisplay,
  settingsStore.settings.revealOnTap,
  settingsStore.settings.revealOnSwipe,
  settingsStore.settings.playSoundOnTap,
  props.wordItem.metadata.state,
  (props.srsData ? props.srsData.state : undefined),
  props.initialFaceType
], () => {
    const newInitialFace = props.initialFaceType || (props.srsData ? FaceType.SRS_QUESTION : FaceType.WORD_LIST_DEFAULT);
    if (newInitialFace !== uiState.currentFaceType && !uiState.isPhysicallyFlipped && !uiState.hintUrl && !uiState.isLoadingHint) {
        commandFaceChange(newInitialFace, 'face-fade');
    }
}, { deep: true, immediate: true });

function commandFaceChange(faceType: FaceTypeKey, transition?: string) {
    uiState.currentFaceType = faceType;
    uiState.isPhysicallyFlipped = (
        faceType === FaceType.HINT_DRAWING ||
        faceType === FaceType.HINT_IMAGE ||
        faceType === FaceType.SRS_ANSWER
    );
    faceTransitionName.value = transition || 'face-fade';
    if (faceType !== FaceType.HINT_DRAWING && faceType !== FaceType.HINT_IMAGE) {
        uiState.hintUrl = null;
        uiState.isLoadingHint = false;
    }
}

defineExpose({
  setHintData,
  getCurrentFaceType: () => uiState.currentFaceType,
  commandFaceChange, 
  resetSwipeState: (immediate = false) => {
      interactiveCardShellRef.value?.resetSwipeState(immediate);
  },
  activeCardFaceConfigForShell 
});

</script>
