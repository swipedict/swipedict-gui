<template>
  <div ref="rootRef" class="w-full h-full flex flex-col items-center overflow-hidden relative">
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
            :data-word-id="wordItemInList.id"
            class="word-list-item"
            :class="{ 'kbd-focused': keyboardFocusedId === wordItemInList.id }"
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
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
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

// --- KEYBOARD / HID CONTROLLER NAVIGATION -----------------------------------
// A Bluetooth remote or a Zeemote behind a keyboard adapter shows up as a plain
// keyboard, so driving the list with keys is all that is needed to support one.
// Arrows and PageUp/PageDown move a roving highlight; Enter/Space and
// Backspace/Delete fire the same actions the right/left swipes do, resolved from
// faceBehaviorConfig so the two input methods can never drift apart.
const keyboardFocusedId = ref<string | null>(null);

// Read the order straight off the rendered elements rather than from the props.
// InfiniteScroll owns how much of listItems is mounted, and props here are
// destructured, so any script-side copy can disagree with what is on screen —
// and acting on a stale index would mark the wrong word. data-word-id is used
// rather than the element id because listKeyPrefixForScroll embeds a
// Math.random() suffix that changes whenever that computed re-evaluates.
const rootRef = ref<HTMLElement | null>(null);

function navigableEls(): HTMLLIElement[] {
  const scope: ParentNode = rootRef.value ?? document;
  return Array.from(scope.querySelectorAll<HTMLLIElement>('li.word-list-item[data-word-id]'));
}

function navigableIds(): string[] {
  return navigableEls().map(li => li.dataset.wordId!);
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

function moveKeyboardFocus(delta: number) {
  const ids = navigableIds();
  if (!ids.length) return;
  const current = keyboardFocusedId.value ? ids.indexOf(keyboardFocusedId.value) : -1;
  const next = current < 0 ? 0 : Math.min(ids.length - 1, Math.max(0, current + delta));
  keyboardFocusedId.value = ids[next];

  navigableEls()[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  // Keep the runway ahead of the cursor so holding a direction does not dead-end.
  if (next >= ids.length - 3 && !allLoaded && !isLoadingMore) loadMoreFunction();
}

function fireSwipeAction(interaction: 'swipeLeft' | 'swipeRight') {
  const wordId = keyboardFocusedId.value;
  if (!wordId) return;
  const action = faceBehaviorConfig?.[initialFaceType]?.interactions?.[interaction];
  if (!action) return;

  // Acting on a card usually drops it from the list, which would strand the
  // highlight. Claim the follower up front so the cursor lands there and the
  // next press keeps working without re-navigating.
  const ids = navigableIds();
  const successor = ids[ids.indexOf(wordId) + 1] ?? ids[ids.indexOf(wordId) - 1] ?? null;

  emit('card-action', { action, wordId, interactionType: interaction as any });
  keyboardFocusedId.value = successor;
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
  if (isTypingTarget(e.target)) return;
  // Let an open drawer or modal keep the keyboard to itself.
  if (document.querySelector('[role="dialog"]')) return;

  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': moveKeyboardFocus(1); break;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': moveKeyboardFocus(-1); break;
    case 'Enter': case ' ': fireSwipeAction('swipeRight'); break;
    case 'Backspace': case 'Delete': fireSwipeAction('swipeLeft'); break;
    // Escape clears the highlight but is deliberately not consumed — other
    // components still need it to close themselves.
    case 'Escape': keyboardFocusedId.value = null; return;
    default: return;
  }
  e.preventDefault();
}

onMounted(() => document.addEventListener('keydown', handleGlobalKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', handleGlobalKeydown));

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

/* Roving highlight for keyboard / HID-controller navigation. */
.word-list-item.kbd-focused::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 0.85rem;
  pointer-events: none;
  box-shadow: 0 0 0 2px theme('colors.primary.500', #6366f1);
  z-index: 5;
}
</style>