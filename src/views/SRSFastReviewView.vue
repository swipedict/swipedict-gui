<template>
    <GenericWordListView
        ref="genericListRef"
        :list-items="srsWordEntriesForGenericList"
        :load-more-function="() => {}" 
        :is-loading-more="false"
        :is-loading-initial="isLoadingInitialData"
        :all-loaded="true" 
        :face-behavior-config="srsFaceBehaviorConfig"
        :initial-face-type="FaceType.SRS_QUESTION"
        :list-key-prefix="`srsList-${currentDictionaryPath}`"
        :grid-class-name="'srs-card-grid'"
        :item-height="'150px'" 
        :get-srs-data-for-item="getSrsDataForCard"
        :empty-list-message="srsCompletionMessage"
        @card-action="handleCardActionFromManagedCardDirect"
        @request-hint="handleHintRequestFromManagedCard"
    >
        <template #header>
            <div class="w-full px-3 sm:px-4 pt-2 pb-2 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700
                        bg-white/80 dark:bg-surface-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
                <div class="flex items-center justify-between">
                    <h1 class="text-lg sm:text-xl font-heading font-bold text-slate-800 dark:text-slate-100 truncate pr-2">
                        {{ $t('srsFastReview.title') }}: {{ dictionaryTitle }}
                    </h1>
                    <RouterLink :to="{ name: 'topicSelection', params: { dictionaryPath: currentDictionaryPath } }" class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap">
                        {{ $t('srsFastReview.toTopicsLink') }}
                    </RouterLink>
                </div>
                <p class="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">
                {{ $t('srsFastReview.remainingCardsOfInitial', { count: displayedCardsSrs.length, initialCount: initialCardCount }) }}
                <span v-if="newCardsShownInSession > 0"> | {{ $t('srsFastReview.newCardsInSession', { count: newCardsShownInSession }) }}</span>
                </p>
            </div>
        </template>
        <template #empty-actions>
             <div class="mt-4 space-y-2" v-if="!isLoadingInitialData && !loadError">
                <RouterLink :to="{ name: 'learningSummary', params: { dictionaryPath: currentDictionaryPath } }" class="block text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    {{ $t('srsFastReview.toLearningSummary') }}
                </RouterLink>
                <button @click="goBack" class="block text-sm text-primary-600 dark:text-primary-400 hover:underline">{{ $t('srsFastReview.toTopicsLink') }}</button>
             </div>
             <div v-if="loadError" class="mt-2 text-sm text-red-600">
                {{ $t('srsFastReview.errorLoadingSession', { error: loadError }) }}
             </div>
        </template>
    </GenericWordListView>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick, watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import GenericWordListView from '@/components/GenericWordListView.vue';
import { FaceType, SrsActions } from '@/types/cardConstants';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import { getDueSrsCardsForSession } from '@/services/db';
import * as srsService from '@/services/srsService';
import { playSoundForItem } from '@/composables/useWordAudio';
import type { WordEntry, SrsRating, SrsData } from '@/types';
import type { FaceInteractionConfig, CardActionEventPayload, CardHintRequestPayload, FaceTypeKey } from '@/types/interactiveCard';
import emitter from '@/services/emitter';

defineOptions({
  name: 'SRSFastReviewView'
});

interface SrsCardDisplayItem { srsInfo: SrsData; wordEntry: WordEntry; }

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dictionaryStore = useDictionaryStore();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const customMediaStore = useCustomMediaStore();

const isLoadingInitialData = ref(true);
const loadError = ref<string | null>(null);
const currentDictionaryPath = ref(route.params.dictionaryPath as string || appStore.selectedDictionaryPath || '');
const dictionaryTitle = computed(() => appStore.availableDictionaries.find(d => d.path === currentDictionaryPath.value)?.message || currentDictionaryPath.value);

const allDueSrsItems: Ref<SrsCardDisplayItem[]> = ref([]);
const displayedCardsSrs: Ref<SrsCardDisplayItem[]> = ref([]);
const srsWordEntriesForGenericList = computed(() => displayedCardsSrs.value.map(item => item.wordEntry));

const initialCardCount = ref(0);
const newCardsShownInSession = ref(0);

const genericListRef = ref<InstanceType<typeof GenericWordListView> | null>(null);

const srsCompletionMessage = computed(() => {
    if (isLoadingInitialData.value || loadError.value) return '';
    if (initialCardCount.value > 0 && displayedCardsSrs.value.length === 0) {
        return t('srsFastReview.allSessionCardsDone');
    }
    if (initialCardCount.value === 0 && displayedCardsSrs.value.length === 0) {
        return t('srsFastReview.noCardsDueOrNew');
    }
    return '';
});

const srsFaceBehaviorConfig = computed(() => {
  return {
    [FaceType.SRS_QUESTION]: {
      interactions: {
        tap: SrsActions.SHOW_ANSWER,
        swipeLeft: SrsActions.SHOW_HINT_DRAWING, 
        swipeRight: SrsActions.PLAY_SOUND_QUESTION_TARGET, 
      } as FaceInteractionConfig,
    },
    [FaceType.HINT_DRAWING]: {
      interactions: {
        tap: SrsActions.SHOW_ANSWER,
        swipeLeft: SrsActions.GOTO_QUESTION_INITIAL, 
        swipeRight: SrsActions.SHOW_HINT_IMAGE, 
      } as FaceInteractionConfig,
    },
    [FaceType.HINT_IMAGE]: {
      interactions: {
        tap: SrsActions.SHOW_ANSWER,
        swipeLeft: SrsActions.GOTO_QUESTION_INITIAL, 
        swipeRight: SrsActions.SHOW_HINT_DRAWING, 
      } as FaceInteractionConfig,
    },
    [FaceType.SRS_ANSWER]: {
      interactions: {
        tap: SrsActions.PLAY_SOUND_ANSWER_TARGET, 
        swipeLeft: SrsActions.GOTO_DETAILS_SRS, 
        swipeRight: SrsActions.FLIP_TO_QUESTION_INITIAL,
      } as FaceInteractionConfig,
    },
  };
});

function getSrsDataForCard(wordId: string): SrsData | undefined {
    return allDueSrsItems.value.find(item => item.wordEntry.id === wordId)?.srsInfo;
}

async function handleCardActionFromManagedCardDirect(payload: CardActionEventPayload) {
  const { action, wordId, srsUniqueId, details, interactionType } = payload;
  const cardRef = genericListRef.value?.getManagedCardRef(wordId);
  
  const cardItemContext = allDueSrsItems.value.find(item => item.srsInfo.uniqueId === srsUniqueId);
  if (!cardItemContext) {
    console.error(`SRSFastReviewView: Could not find card context for srsUniqueId ${srsUniqueId}`);
    return;
  }
  const srsInfo = cardItemContext.srsInfo;
  const wordEntry = cardItemContext.wordEntry;

  switch (action) {
    case SrsActions.RATE_CARD:
      if (srsInfo && details) {
        await handleRateSrsCard(srsInfo, details as SrsRating);
      }
      break;
    case SrsActions.PLAY_SOUND_QUESTION_TARGET:
      playSoundForItem(wordEntry, 'target', 'srs-question');
      break;
    case SrsActions.PLAY_SOUND_QUESTION_SOURCE:
      playSoundForItem(wordEntry, 'source', 'srs-question');
      break;
    case SrsActions.PLAY_SOUND_ANSWER_TARGET:
      playSoundForItem(wordEntry, 'target', 'srs-answer');
      break;
    case SrsActions.PLAY_SOUND_ANSWER_SOURCE:
      playSoundForItem(wordEntry, 'source', 'srs-answer');
      break;
    case SrsActions.GOTO_DETAILS_SRS: 
      if (document.activeElement instanceof HTMLElement && interactionType === 'tap') {
        document.activeElement.blur();
      }
      router.push({ name: 'detail', params: { dictionaryPath: srsInfo.dictionaryPath, wordId: srsInfo.wordId }});
      break;
  }
  if (cardRef && interactionType?.startsWith('swipe') && action !== SrsActions.RATE_CARD) {
      cardRef.resetSwipeState(true);
  }
}

async function handleHintRequestFromManagedCard(payload: CardHintRequestPayload) {
  const cardRef = genericListRef.value?.getManagedCardRef(payload.wordId);
  if (!cardRef) return;

  const wordEntry = allDueSrsItems.value.find(item => item.wordEntry.id === payload.wordId)?.wordEntry;
   if (!wordEntry || !wordEntry.metadata.dictionaryPath) {
    console.error(`SRSFastReviewView: Could not find dictionaryPath for wordId ${payload.wordId} for hint.`);
    cardRef.setHintData(payload.hintType, null);
    return;
  }

  try {
    const media = await customMediaStore.getOrFetchMedia(wordEntry.metadata.dictionaryPath, payload.wordId);
    let hintToShow: 'drawing' | 'image' | null = null;
    let urlToUse: string | null = null;
    
    const preferredHintType = payload.hintType;

    if (preferredHintType === 'drawing') {
        if (media?.drawingDataUrl) {
            hintToShow = 'drawing'; urlToUse = media.drawingDataUrl;
        } else if (media?.imageDataUrl) {
            hintToShow = 'image'; urlToUse = media.imageDataUrl;
            cardRef.commandFaceChange(FaceType.HINT_IMAGE, 'face-slide-horizontal');
        }
    } else if (preferredHintType === 'image') {
        if (media?.imageDataUrl) {
            hintToShow = 'image'; urlToUse = media.imageDataUrl;
        } else if (media?.drawingDataUrl) {
            hintToShow = 'drawing'; urlToUse = media.drawingDataUrl;
            cardRef.commandFaceChange(FaceType.HINT_DRAWING, 'face-slide-horizontal');
        }
    }

    if (hintToShow && urlToUse) {
        cardRef.setHintData(hintToShow, urlToUse);
    } else { 
        cardRef.setHintData(payload.hintType, null); 
        const cardItemForAnswer = allDueSrsItems.value.find(c => c.srsInfo.uniqueId === srsUniqueIdFromWordId(payload.wordId));
        if (cardItemForAnswer) {
             cardRef.commandFaceChange(FaceType.SRS_ANSWER, 'face-flip-3d');
             const questionSide = cardRef.activeCardFaceConfigForShell.props.questionSide;
             const audioSideToPlay = questionSide === 'sourceOnly' ? 'target' : 'source';
             playSoundForItem(cardItemForAnswer.wordEntry, audioSideToPlay, 'srs-answer');
        }
    }
  } catch (error) {
    console.error(`Error fetching ${payload.hintType} hint for ManagedWordCard in SRSView:`, error);
    cardRef.setHintData(payload.hintType, null);
  }
}

function srsUniqueIdFromWordId(wordId: string): string {
    return `${currentDictionaryPath.value}_${wordId}`;
}

async function handleRateSrsCard(srsInfoToRate: SrsData, rating: SrsRating) {
    const cardUniqueId = srsInfoToRate.uniqueId;
    const cardRef = genericListRef.value?.getManagedCardRef(srsInfoToRate.wordId);

    if (cardRef) {
      cardRef.commandFaceChange(FaceType.SRS_QUESTION, 'list'); 
      await nextTick();
    }

    try {
        const updatedSrsData = await srsService.answerCard(srsInfoToRate.dictionaryPath, srsInfoToRate.wordId, rating);
        
        const itemIndexAll = allDueSrsItems.value.findIndex(c => c.srsInfo.uniqueId === cardUniqueId);
        if (itemIndexAll > -1) {
            allDueSrsItems.value[itemIndexAll].srsInfo = updatedSrsData;
        }

        const currentDisplayIndex = displayedCardsSrs.value.findIndex(c => c.srsInfo.uniqueId === cardUniqueId);

        if (rating === 'again') {
            emitter.emit('show-notification', { message: `"${srsInfoToRate.wordId.split(/[-_]/).pop()}" wird bald wiederholt.`, type: 'success', duration: 1500 });
            if (currentDisplayIndex > -1) {
                const cardToMove = displayedCardsSrs.value.splice(currentDisplayIndex, 1)[0];
                cardToMove.srsInfo = updatedSrsData; 
                displayedCardsSrs.value.push(cardToMove);
                
                await nextTick();
                const movedCardRef = genericListRef.value?.getManagedCardRef(srsInfoToRate.wordId);
                if (movedCardRef) {
                    movedCardRef.commandFaceChange(FaceType.SRS_QUESTION, 'none');
                }
            }
        } else {
            if (currentDisplayIndex > -1) {
                displayedCardsSrs.value.splice(currentDisplayIndex, 1);
            }
        }
    } catch (e: any) {
        emitter.emit('show-notification', { message: `Fehler beim Bewerten: ${e.message}`, type: 'error' });
        if (cardRef) cardRef.commandFaceChange(FaceType.SRS_ANSWER, 'face-flip-3d');
    }
}

async function loadSessionData() {
    isLoadingInitialData.value = true; loadError.value = null; allDueSrsItems.value = []; displayedCardsSrs.value = [];
    initialCardCount.value = 0; newCardsShownInSession.value = 0;

    const dictPath = currentDictionaryPath.value;
    if (!dictPath) { loadError.value = t("userProfile.noDictionarySelected"); isLoadingInitialData.value = false; return; }

    try {
        if (dictionaryStore.currentDictionaryPath !== dictPath || dictionaryStore.masterList.length === 0) {
            await dictionaryStore.loadDictionaryIndex(dictPath);
            if (dictionaryStore.dictionaryError) throw new Error(`Index konnte nicht geladen werden: ${dictionaryStore.dictionaryError}`);
        }
        const now = Date.now();
        const newCardsTodaySetting = settingsStore.settings.newCardsPerDay;
        const dueSrsDataFromDb = await getDueSrsCardsForSession(dictPath, now, newCardsTodaySetting);

        const srsItems: SrsCardDisplayItem[] = [];
        let tempNewCardsCount = 0;
        for (const srsInfo of dueSrsDataFromDb) {
            const wordEntry = dictionaryStore.masterList.find(w => w.id === srsInfo.wordId);
            if (wordEntry) {
                if (!wordEntry.metadata.srsUniqueId) {
                    wordEntry.metadata.srsUniqueId = srsInfo.uniqueId;
                }
                srsItems.push({ srsInfo, wordEntry });
                if (srsInfo.state === 'new') {
                    tempNewCardsCount++;
                }
            } else {
                console.warn(`SRSFastReviewView: WordEntry not found for wordId ${srsInfo.wordId}. Skipping.`);
            }
        }
        allDueSrsItems.value = srsItems;
        displayedCardsSrs.value = [...allDueSrsItems.value];
        initialCardCount.value = displayedCardsSrs.value.length;
        newCardsShownInSession.value = tempNewCardsCount;

    } catch (error: any) { loadError.value = error.message || t("general.error");
    } finally { isLoadingInitialData.value = false; }
}

function goBack() { if (currentDictionaryPath.value) router.push({ name: 'topicSelection', params: { dictionaryPath: currentDictionaryPath.value } }); else router.push({ name: 'welcome' }); }

onMounted(loadSessionData);

watch(() => currentDictionaryPath.value, (newPath, oldPath) => {
    if (newPath && newPath !== oldPath) loadSessionData();
});
</script>
