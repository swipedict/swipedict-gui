<template>
  <div class="w-full h-full flex flex-col items-center overflow-hidden relative">
    <!-- Slot for custom header/filter controls provided by the parent -->
    <slot name="header"></slot>

    <!-- SKELETON LOADER STATE -->
    <div v-if="props.isLoadingInitial" class="flex-grow w-full overflow-hidden p-4">
        <!-- Replicate the grid layout used by the real list -->
        <ul :class="props.gridClassName">
            <li v-for="n in skeletonCount" :key="n" class="word-list-item" :style="{ height: props.itemHeight }">
                <CardSkeleton />
            </li>
        </ul>
        <div class="text-center text-slate-400 dark:text-slate-500 text-sm mt-4 animate-pulse">
            {{ props.loadingText }}
        </div>
    </div>

    <!-- REAL CONTENT STATE -->
    <!-- We hide this while loading initial data to prevent layout thrashing -->
    <InfiniteScroll
      v-else
      ref="infiniteScrollRef"
      class="flex-grow w-full"
      :items="props.listItems" 
      :load-more="props.loadMoreFunction"
      :is-loading-more="props.isLoadingMore"
      :is-loading-initial="false" 
      :all-loaded="props.allLoaded"
      :loading-text="props.loadingText"
      :end-of-list-text="props.endOfListText"
      :empty-text="props.emptyListMessage"
      :min-items-to-display-message="props.minItemsForEmptyMessage"
      :target-item-id-to-scroll-to="props.targetItemIdToScrollTo"
      :list-key-prefix="listKeyPrefixForScroll"
      :debug="props.debugScroll"
    >
      <template #items="{ items: currentRenderedBatch }">
        <TransitionGroup
          v-if="currentRenderedBatch.length > 0"
          :name="props.enableListAnimation ? 'list' : 'list-no-anim'"
          tag="ul"
          :class="props.gridClassName"
        >
          <li
            v-for="wordItemInList in currentRenderedBatch"
            :key="wordItemInList.id"
            :id="`${listKeyPrefixForScroll}-${wordItemInList.id}`"
            class="word-list-item"
            :style="{ height: props.itemHeight }"
          >
            <ManagedWordCard
              :ref="el => setManagedCardRef(wordItemInList.id, el as any)"
              :word-item="wordItemInList"
              :srs-data="props.getSrsDataForItem ? props.getSrsDataForItem(wordItemInList.id) : undefined"
              :face-behavior-config="props.faceBehaviorConfig"
              :initial-face-type="props.initialFaceType"
              @card-action="handleCardActionFromManagedCard"
              @request-hint="payload => handleHintRequestFromManagedCard(payload, wordItemInList.id)"
            />
          </li>
        </TransitionGroup>
      </template>
      <template #empty>
        <div
          v-if="!props.isLoadingMore && props.listItems.length === 0 && props.allLoaded"
          class="text-center text-slate-400 dark:text-slate-500 py-10 px-4"
        >
          <p>{{ props.emptyListMessage || $t('dictionaryList.noWordsInDict') }}</p>
          <slot name="empty-actions"></slot>
        </div>
      </template>
    </InfiniteScroll>
  </div>
</template>

<script setup lang="ts" generic="T extends WordEntry">
import { ref, reactive, computed } from 'vue';
import type { PropType } from 'vue';
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

const props = defineProps({
  listItems: {
    type: Array as PropType<T[]>,
    required: true,
  },
  isLoadingInitial: { type: Boolean, default: false },
  isLoadingMore: { type: Boolean, default: false },
  allLoaded: { type: Boolean, default: false },
  loadMoreFunction: {
    type: Function as PropType<() => Promise<void> | void>,
    required: true,
  },
  faceBehaviorConfig: {
    type: Object as PropType<Record<string, { interactions: FaceInteractionConfig }>>,
    required: true,
  },
  initialFaceType: { type: String, required: true },
  listKeyPrefix: { type: String, required: true },
  targetItemIdToScrollTo: { type: [String, Number] as PropType<string | number | null>, default: null },
  emptyListMessage: { type: String, default: '' },
  minItemsForEmptyMessage: { type: Number, default: 10 },
  gridClassName: { type: String, default: 'dictionary-browser-card-grid' },
  itemHeight: { type: String, default: '180px' },
  enableListAnimation: { type: Boolean, default: true },
  getSrsDataForItem: {
    type: Function as PropType<(wordId: string) => SrsData | undefined>,
    default: undefined,
  },
  loadingText: { type: String, default: 'Loading more...' },
  endOfListText: { type: String, default: 'End of list.' },
  debugScroll: { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: 'card-action', payload: CardActionEventPayload): void;
  (e: 'request-hint', payload: CardHintRequestPayload): void;
}>();

const { t } = useI18n();
const customMediaStore = useCustomMediaStore();
const infiniteScrollRef = ref<InstanceType<typeof InfiniteScroll> | null>(null);
const managedCardRefs = reactive<Record<string, InstanceType<typeof ManagedWordCard> | null>>({});

const listKeyPrefixForScroll = computed(() => `${props.listKeyPrefix}-${Math.random().toString(36).substring(2,7)}`);

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

  const wordEntry = props.listItems.find(item => item.id === payload.wordId);
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