<template>
  <div class="w-full h-full flex flex-col items-center overflow-hidden relative">
    <!-- Slot for custom header/filter controls provided by the parent -->
    <slot name="header"></slot>

    <!-- SKELETON LOADER STATE -->
    <div v-if="isLoadingInitial" class="flex-grow w-full overflow-hidden p-4">
        <!-- Replicate the grid layout used by the real list -->
        <ul :class="gridClassName">
            <li v-for="n in skeletonCount" :key="n" class="word-list-item" :style="{ height: itemHeight }">
                <CardSkeleton />
            </li>
        </ul>
        <div class="text-center text-slate-400 dark:text-slate-500 text-sm mt-4 animate-pulse">
            {{ loadingText }}
        </div>
    </div>

    <!-- REAL CONTENT STATE -->
    <!-- We hide this while loading initial data to prevent layout thrashing -->
    <InfiniteScroll
      v-else
      ref="infiniteScrollRef"
      class="flex-grow w-full"
      :items="listItems" 
      :load-more="loadMoreFunction"
      :is-loading-more="isLoadingMore"
      :is-loading-initial="false" 
      :all-loaded="allLoaded"
      :loading-text="loadingText"
      :end-of-list-text="endOfListText"
      :empty-text="emptyListMessage"
      :min-items-to-display-message="minItemsForEmptyMessage"
      :target-item-id-to-scroll-to="targetItemIdToScrollTo"
      :list-key-prefix="listKeyPrefixForScroll"
      :debug="debugScroll"
    >
      <template #items="{ items: currentRenderedBatch }">
        <TransitionGroup
          v-if="currentRenderedBatch.length > 0"
          :name="enableListAnimation ? 'list' : 'list-no-anim'"
          tag="ul"
          :class="gridClassName"
        >
          <li
            v-for="wordItemInList in currentRenderedBatch"
            :key="wordItemInList.id"
            :id="`${listKeyPrefixForScroll}-${wordItemInList.id}`"
            class="word-list-item"
            :style="{ height: itemHeight }"
          >
            <ManagedWordCard
              :ref="el => setManagedCardRef(wordItemInList.id, el as any)"
              :word-item="wordItemInList"
              :srs-data="getSrsDataForItem ? getSrsDataForItem(wordItemInList.id) : undefined"
              :face-behavior-config="faceBehaviorConfig"
              :initial-face-type="initialFaceType"
              @card-action="handleCardActionFromManagedCard"
              @request-hint="payload => handleHintRequestFromManagedCard(payload, wordItemInList.id)"
            />
          </li>
        </TransitionGroup>
      </template>
      <template #empty>
        <div
          v-if="!isLoadingMore && listItems.length === 0 && allLoaded"
          class="text-center text-slate-400 dark:text-slate-500 py-10 px-4"
        >
          <p>{{ emptyListMessage || $t('dictionaryList.noWordsInDict') }}</p>
          <slot name="empty-actions"></slot>
        </div>
      </template>
    </InfiniteScroll>
  </div>
</template>

<script setup lang="ts" generic="T extends WordEntry">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagedWordCard from '@/components/ManagedWordCard.vue';
import InfiniteScroll from '@/components/InfiniteScroll.vue';
import CardSkeleton from '@/components/skeletons/CardSkeleton.vue'; // IMPORT SKELETON
import type { WordEntry, SrsData } from '@/types';
import type { FaceInteractionConfig, CardActionEventPayload, CardHintRequestPayload } from '@/types/interactiveCard';
import { useCustomMediaStore } from '@/stores/customMediaStore';

defineOptions({
  name: 'GenericWordListView'
});

const {
  listItems,
  isLoadingInitial = false,
  isLoadingMore = false,
  allLoaded = false,
  loadMoreFunction,
  faceBehaviorConfig,
  initialFaceType,
  listKeyPrefix,
  targetItemIdToScrollTo = null,
  emptyListMessage = '',
  minItemsForEmptyMessage = 10,
  gridClassName = 'dictionary-browser-card-grid',
  itemHeight = '180px',
  enableListAnimation = true,
  getSrsDataForItem = undefined,
  loadingText = 'Loading more...',
  endOfListText = 'End of list.',
  debugScroll = false,
} = defineProps<{
  listItems: T[];
  isLoadingInitial?: boolean;
  isLoadingMore?: boolean;
  allLoaded?: boolean;
  loadMoreFunction: () => Promise<void> | void;
  faceBehaviorConfig: Record<string, { interactions: FaceInteractionConfig }>;
  initialFaceType: string;
  listKeyPrefix: string;
  targetItemIdToScrollTo?: string | number | null;
  emptyListMessage?: string;
  minItemsForEmptyMessage?: number;
  gridClassName?: string;
  itemHeight?: string;
  enableListAnimation?: boolean;
  getSrsDataForItem?: (wordId: string) => SrsData | undefined;
  loadingText?: string;
  endOfListText?: string;
  debugScroll?: boolean;
}>();

const emit = defineEmits<{
  (e: 'card-action', payload: CardActionEventPayload): void;
  (e: 'request-hint', payload: CardHintRequestPayload): void;
}>();

const { t } = useI18n();
const customMediaStore = useCustomMediaStore();
const infiniteScrollRef = ref<InstanceType<typeof InfiniteScroll> | null>(null);
const managedCardRefs = reactive<Record<string, InstanceType<typeof ManagedWordCard> | null>>({});

const listKeyPrefixForScroll = computed(() => `${listKeyPrefix}-${Math.random().toString(36).substring(2,7)}`);

// Calculate how many skeletons to show based on screen size (rough estimate)
const skeletonCount = computed(() => {
    // 6 is a safe default for mobile, 12 for desktop
    return 6; 
});

function setManagedCardRef(id: string, el: InstanceType<typeof ManagedWordCard> | null) {
  if (el) {
    managedCardRefs[id] = el;
  } else {
    delete managedCardRefs[id];
  }
}

function handleCardActionFromManagedCard(payload: CardActionEventPayload) {
  emit('card-action', payload);
}

async function handleHintRequestFromManagedCard(payload: CardHintRequestPayload, cardWordId: string) {
  const cardRef = managedCardRefs[cardWordId];
  if (!cardRef) return;

  const wordEntry = listItems.find(item => item.id === payload.wordId);
  if (!wordEntry || !wordEntry.metadata.dictionaryPath) {
    console.error(`GenericWordListView: Could not find dictionaryPath for wordId ${payload.wordId}`);
    cardRef.setHintData(payload.hintType, null);
    return;
  }

  const media = await customMediaStore.getOrFetchMedia(wordEntry.metadata.dictionaryPath, payload.wordId);

  if (payload.hintType === 'drawing') {
    cardRef.setHintData('drawing', media?.drawingDataUrl || null);
  } else if (payload.hintType === 'image') {
    cardRef.setHintData('image', media?.imageDataUrl || null);
  }
}

function scrollToTop() {
  infiniteScrollRef.value?.scrollToTop();
}

defineExpose({
  scrollToTop,
  getManagedCardRef: (id: string) => managedCardRefs[id],
  forceScrollAttempt: () => infiniteScrollRef.value?.forceScrollAttempt(),
});
</script>

<style scoped>
.word-list-item {
  position: relative;
}
</style>