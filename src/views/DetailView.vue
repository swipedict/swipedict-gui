<template>
    <div
        ref="detailViewPageRoot"
        class="detail-view-container w-full"
        @pointerdown="handlePageSwipeStart"
        style="touch-action: pan-y;"
    >
        <!-- Loading Indicator (Initial Page Load / Prop Change) -->
        <div v-if="isLoadingPage" class="flex items-center justify-center min-h-[200px] text-gray-500 dark:text-slate-400 p-4">
            <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></span>
            {{ $t('detailView.loadingDetails') }}
        </div>
        <!-- Error State (Initial Page Load / Prop Change) -->
        <div v-else-if="pageError" class="p-4 md:p-6 text-center text-red-500 dark:text-red-400">
            <p class="font-semibold">{{ $t('detailView.errorLoading') }}</p>
            <p class="text-sm mb-4">{{ $t('detailView.errorGeneric', { error: pageError }) }}</p>
            <button @click="goBack" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center justify-center mx-auto">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 mr-1.5">
                   <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
                 </svg>
                {{ $t('detailView.backButton') }}
            </button>
        </div>
        <!-- Data Not Ready State (Word ID not found in index after dictionary load) -->
        <div v-else-if="!isWordIdValid" class="p-4 md:p-6 text-center text-gray-500 dark:text-slate-400">
             <p class="font-semibold">{{ $t('detailView.errorNotFound') }}</p>
             <p class="text-sm mb-4">{{ $t('detailView.errorNotFoundMessage', { wordId: props.wordId }) }}</p>
             <button @click="goBack" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 mr-1.5">
                   <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
                 </svg>
                {{ $t('detailView.backButton') }}
             </button>
        </div>

        <!-- Main Content Area (Render DetailViewContent if initial checks pass) -->
        <DetailViewContent v-else
            :key="`${props.dictionaryPath}-${props.wordId}`"
            :dictionaryPath="props.dictionaryPath"
            :wordId="props.wordId"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useAppStore } from '@/stores/appStore';
import { stopAudio } from '@/composables/useAudioPlayer';
import { useSwipeInteraction } from '@/composables/useSwipeInteraction';
import DetailViewContent from '@/components/detail/DetailViewContent.vue';

const props = defineProps<{ dictionaryPath: string; wordId: string }>();
const { t } = useI18n();
const router = useRouter();
const dictionaryStore = useDictionaryStore();

const isLoadingPage = ref(true);
const pageError = ref<string | null>(null);
const isWordIdValid = ref(false);

const detailViewPageRoot = ref<HTMLDivElement | null>(null);

const {
  handlePointerDown: handlePageSwipeStartInternal,
  resetSwipeState: resetPageSwipeState,
} = useSwipeInteraction(
  detailViewPageRoot,
  { threshold: 100, maxRotation: 0 },
  () => { goBack(); resetPageSwipeState(true); },
  () => {
    const wordEntry = dictionaryStore.masterList.find(w => w.id === props.wordId);
    const searchTerm = wordEntry?.target?.headword || wordEntry?.source?.headword;
    if (searchTerm) {
        router.push({ name: 'externalSearch', params: { searchTerm } });
    }
    resetPageSwipeState(true);
  },
  () => { resetPageSwipeState(true); }
);

function handlePageSwipeStart(event: PointerEvent) {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('button, input, select, textarea, a[href], [role="button"], [tabindex="0"], canvas, .collapsible-trigger, .word-info-item')) {
        return;
    }
    handlePageSwipeStartInternal(event);
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ 
        name: 'dictionaryBrowser', 
        params: { dictionaryPath: props.dictionaryPath },
        query: { selectedId: props.wordId } 
    });
  }
}

async function performInitialChecks() {
  isLoadingPage.value = true;
  pageError.value = null;
  isWordIdValid.value = false; 

  try {
      if (dictionaryStore.currentDictionaryPath !== props.dictionaryPath || dictionaryStore.masterList.length === 0) {
          await dictionaryStore.loadDictionaryIndex(props.dictionaryPath);
          if (dictionaryStore.dictionaryError) { 
            throw new Error(`Index Error: ${dictionaryStore.dictionaryError}`);
          }
      }
      const wordInfo = dictionaryStore.getFilenameForWord(props.wordId);
      isWordIdValid.value = !!wordInfo?.filename;
  } catch (err: any) {
      console.error("DetailView: Error during initial checks:", err);
      pageError.value = err.message || 'Failed to load dictionary index.';
  } finally {
      isLoadingPage.value = false;
  }
}

onMounted(performInitialChecks);

watch(() => [props.dictionaryPath, props.wordId], (newVal, oldVal) => {
    if (newVal[0] !== oldVal[0] || newVal[1] !== oldVal[1]) { 
        performInitialChecks();
    }
}, { immediate: false }); 

onUnmounted(stopAudio);
</script>