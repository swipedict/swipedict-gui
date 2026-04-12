<template>
  <div ref="scrollContainerRef" class="infinite-scroll-container w-full h-full overflow-y-auto" @scroll.passive="handleScroll">
    <div class="list-content-wrapper" :id="`list-wrapper-${uniqueId}`">
      <!-- Slot for the actual list items -->
      <slot name="items" :items="itemsToRender"></slot>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoadingMore" class="text-center text-gray-500 py-4">
      <span class="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-1"></span>
      {{ loadingText }}
    </div>

    <!-- End of List Message -->
    <div
      v-else-if="allLoaded && itemsToRender.length > 0 && itemsToRender.length >= minItemsToDisplayMessage"
      class="text-center text-gray-400 text-xs py-4"
    >
      {{ endOfListText }}
    </div>

    <!-- Empty State Message (if no items at all and not loading initially) -->
    <div
      v-else-if="!isLoadingInitial && itemsToRender.length === 0 && allLoaded"
      class="text-center text-gray-500 py-10"
    >
      <slot name="empty">
        <p>{{ emptyText }}</p>
      </slot>
    </div>

    <!-- Sentinel for Intersection Observer -->
    <div ref="observerTargetRef" class="h-20 w-full"></div>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string | number }">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import type { PropType } from 'vue';

const props = defineProps({
  items: {
    type: Array as PropType<T[]>,
    required: true,
  },
  loadMore: {
    type: Function as PropType<() => Promise<void> | void>,
    required: true,
  },
  isLoadingMore: { 
    type: Boolean,
    default: false,
  },
  isLoadingInitial: { 
    type: Boolean,
    default: false,
  },
  allLoaded: { 
    type: Boolean,
    default: false,
  },
  threshold: { 
    type: Number,
    default: 200,
  },
  useIntersectionObserver: {
    type: Boolean,
    default: true,
  },
  loadingText: {
    type: String,
    default: 'Loading more...',
  },
  endOfListText: {
    type: String,
    default: 'End of list.',
  },
  emptyText: { 
    type: String,
    default: 'No items to display.',
  },
  minItemsToDisplayMessage: { 
      type: Number,
      default: 10
  },
  targetItemIdToScrollTo: { 
    type: [String, Number] as PropType<string | number | null>,
    default: null,
  },
  listKeyPrefix: { 
    type: String,
    default: 'listItem',
  },
  debug: { 
    type: Boolean,
    default: false,
  }
});

const uniqueId = Math.random().toString(36).substring(2, 9);
const scrollContainerRef = ref<HTMLDivElement | null>(null);
const observerTargetRef = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

const itemsToRender = computed(() => props.items);
const scrollAttemptedForCurrentTarget = ref(false);
let scrollRetryCount = 0;
const MAX_SCROLL_RETRIES = 10; 
let currentScrollTargetId: string | number | null = null;

function logDebug(message: string, ...args: any[]) {
  if (props.debug) {
    console.log(`[InfiniteScroll ${props.listKeyPrefix || uniqueId}] ${message}`, ...args);
  }
}

const attemptScrollToTarget = async () => {
  const targetId = props.targetItemIdToScrollTo; 
  
  if (!targetId || (scrollAttemptedForCurrentTarget.value && currentScrollTargetId === targetId) || !scrollContainerRef.value) {
    if (targetId && scrollAttemptedForCurrentTarget.value && currentScrollTargetId === targetId) {
      logDebug(`attemptScrollToTarget: Scroll already completed/max-retried for target ${targetId}.`);
    }
    return;
  }

  if (currentScrollTargetId !== targetId) {
    logDebug(`attemptScrollToTarget: New scroll target detected. Old: ${currentScrollTargetId}, New: ${targetId}. Resetting attempt flags.`);
    currentScrollTargetId = targetId;
    scrollAttemptedForCurrentTarget.value = false;
    scrollRetryCount = 0;
  }
  
  logDebug(`attemptScrollToTarget: Attempting scroll. Target: ${targetId}, Retry: ${scrollRetryCount + 1}/${MAX_SCROLL_RETRIES}`);

  await nextTick(); 

  const targetElementId = `${props.listKeyPrefix}-${targetId}`;
  const targetElement = document.getElementById(targetElementId);

  if (targetElement && scrollContainerRef.value.contains(targetElement)) {
    logDebug(`attemptScrollToTarget: Element ${targetElementId} FOUND. Scrolling into view.`);
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scrollAttemptedForCurrentTarget.value = true; 
    scrollRetryCount = 0; 
  } else {
    logDebug(`attemptScrollToTarget: Element ${targetElementId} NOT FOUND in DOM (or not child of scroll container).`);
    if (scrollRetryCount < MAX_SCROLL_RETRIES && !props.allLoaded) {
      scrollRetryCount++;
      setTimeout(attemptScrollToTarget, 150);
    } else {
      logDebug(`attemptScrollToTarget: Max retries (${MAX_SCROLL_RETRIES}) reached or all items loaded, but element ${targetElementId} not found. Marking attempt for ${targetId} as done.`);
      scrollAttemptedForCurrentTarget.value = true; 
      scrollRetryCount = 0;
    }
  }
};

watch(() => props.targetItemIdToScrollTo, (newTargetId, oldTargetId) => {
  logDebug(`targetItemIdToScrollTo prop changed: From '${oldTargetId}' to '${newTargetId}'`);
  if (newTargetId) {
    if (newTargetId !== currentScrollTargetId) {
        scrollAttemptedForCurrentTarget.value = false;
        scrollRetryCount = 0;
        currentScrollTargetId = newTargetId;
    }
    logDebug(`Triggering attemptScrollToTarget for new target: ${newTargetId}`);
    attemptScrollToTarget();
  } else {
    currentScrollTargetId = null;
    scrollAttemptedForCurrentTarget.value = false;
    scrollRetryCount = 0;
    logDebug("targetItemIdToScrollTo prop cleared.");
  }
}, { immediate: true });

watch(itemsToRender, () => {
  if (props.targetItemIdToScrollTo && !scrollAttemptedForCurrentTarget.value) {
    logDebug(`itemsToRender watcher: Items updated, re-attempting scroll to ${props.targetItemIdToScrollTo} if not yet successful.`);
    attemptScrollToTarget();
  }
}, { deep: true });


const handleScroll = () => {
  if (props.useIntersectionObserver || !scrollContainerRef.value || props.isLoadingMore || props.allLoaded) {
    return;
  }
  const el = scrollContainerRef.value;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < props.threshold;
  if (nearBottom) {
    logDebug("handleScroll: Near bottom, calling loadMore.");
    props.loadMore();
  }
};

const setupIntersectionObserver = () => {
  if (!props.useIntersectionObserver || !observerTargetRef.value || !scrollContainerRef.value) return;
  disconnectObserver();
  logDebug("setupIntersectionObserver: Setting up new observer.");

  const options = {
    root: scrollContainerRef.value,
    rootMargin: '400px 0px', 
    threshold: 0,
  };

  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && !props.isLoadingMore && !props.allLoaded) {
      logDebug("IntersectionObserver: Target intersecting, calling loadMore.");
      props.loadMore();
    }
  }, options);
  observer.observe(observerTargetRef.value);
};

const disconnectObserver = () => {
  if (observer) {
    logDebug("disconnectObserver: Disconnecting existing observer.");
    observer.disconnect();
    observer = null;
  }
};

onMounted(() => {
  logDebug("Component mounted.");
  if (props.useIntersectionObserver) {
    nextTick(setupIntersectionObserver);
  }
});

onUnmounted(() => {
  logDebug("Component unmounting.");
  disconnectObserver();
});

// --- THIS IS THE FIX ---
// We watch for the initial loading to complete. When it does, we re-run the
// observer setup to ensure it correctly registers the now-populated, scrollable container.
watch(
    () => props.isLoadingInitial,
    (isLoading, wasLoading) => {
        if (wasLoading && !isLoading && props.useIntersectionObserver) {
            logDebug("Initial load finished. Re-initializing IntersectionObserver.");
            nextTick(setupIntersectionObserver);
        }
    }
);

const scrollToTop = () => {
  if (scrollContainerRef.value) {
    logDebug("scrollToTop: Scrolling to top.");
    scrollContainerRef.value.scrollTop = 0;
  }
};

defineExpose({
  scrollToTop,
  forceScrollAttempt: () => { 
    if (props.targetItemIdToScrollTo) {
      logDebug(`forceScrollAttempt: Manually re-triggering scroll attempt for ${props.targetItemIdToScrollTo}.`);
      currentScrollTargetId = props.targetItemIdToScrollTo;
      scrollAttemptedForCurrentTarget.value = false;
      scrollRetryCount = 0;
      attemptScrollToTarget();
    } else {
        logDebug("forceScrollAttempt: No targetItemIdToScrollTo to attempt scroll.");
    }
  }
});

</script>

<style scoped>
.infinite-scroll-container {
  scrollbar-width: thin;
  scrollbar-color: #a0aec0 #e5e7eb; 
}
.infinite-scroll-container::-webkit-scrollbar {
  width: 8px;
}
.infinite-scroll-container::-webkit-scrollbar-track {
  background: #e5e7eb; 
  border-radius: 4px;
}
.infinite-scroll-container::-webkit-scrollbar-thumb {
  background-color: #a0aec0; 
  border-radius: 4px;
  border: 2px solid #e5e7eb; 
}
.infinite-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280; 
}
</style>