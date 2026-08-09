<template>
    <div
        ref="srsDetailViewRootRef"
        class="srs-progress-detail-view w-full sm:max-w-md sm:mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-6 sm:pb-8"
        @pointerdown="handlePageSwipeStart"
        style="touch-action: pan-y;"
    >
        <PageHeader :title="$t('srsProgress.title')" :back-fn="goBack" />

        <div class="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div v-if="localIsLoadingSrsData" class="text-sm text-gray-500 italic text-center py-6">
                <span class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2 mb-1"></span>
                <br>{{ $t('srsProgress.loading') }}
            </div>
            <div v-else-if="localSrsData" class="text-sm space-y-2">
                <div class="p-2 bg-gray-50 rounded-md border">
                    <p><strong>{{ $t('srsProgress.wordId') }}</strong> <span class="font-mono text-xs text-gray-600">{{ props.wordId }}</span></p>
                    <p><strong>{{ $t('srsProgress.status') }}</strong> <span class="font-semibold" :class="statusTextColor(localSrsData.state)">{{ localSrsData.state.toUpperCase() }}</span></p>
                </div>
                <p><strong>{{ $t('srsProgress.nextReview') }}</strong> {{ nextReviewDateFormatted }}</p>
                <p><strong>{{ $t('srsProgress.interval') }}</strong> {{ localSrsData.interval.toFixed(1) }} {{ $t('srsProgress.intervalUnit', localSrsData.interval) }}</p>
                <p><strong>{{ $t('srsProgress.easeFactor') }}</strong> {{ localSrsData.easeFactor.toFixed(2) }}</p>
                <p><strong>{{ $t('srsProgress.lapses') }}</strong> {{ localSrsData.lapses }}</p>
                <p v-if="localSrsData.lastReviewDate"><strong>{{ $t('srsProgress.lastReview') }}</strong> {{ lastReviewDateFormatted }}</p>

                <div class="pt-3 mt-3 border-t">
                    <button
                        @click="handleReset"
                        :disabled="isResetting"
                        class="w-full px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded shadow hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center"
                    >
                        <svg v-if="isResetting" class="animate-spin -ml-1 mr-1 h-4 w-4 " xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {{ $t('srsProgress.resetSrs') }}
                    </button>
                </div>
            </div>
            <div v-else-if="localError" class="text-sm text-red-600 italic text-center py-6 border border-red-200 bg-red-50 p-3 rounded-md">
                <p class="font-semibold mb-1">{{ $t('srsProgress.errorLoading') }}</p>
                <p>{{ localError }}</p>
                <button @click="goBack" class="block mt-3 text-xs text-blue-600 hover:underline">
                    {{ $t('srsProgress.backToDetail') }}
                </button>
            </div>
            <div v-else class="text-sm text-gray-500 italic text-center py-6 border border-gray-200 bg-gray-50 p-3 rounded-md">
                <p>{{ $t('srsProgress.notInSrs') }}</p>
                <button @click="goBack" class="block mt-3 text-xs text-blue-600 hover:underline">
                    {{ $t('srsProgress.backToDetail') }}
                </button>
            </div>
        </div>

        <div class="mt-6 text-center border-t pt-4 space-y-2">
             <RouterLink :to="{ name: 'srsReview', params: { dictionaryPath: props.dictionaryPath } }" class="text-sm text-blue-600 hover:underline block">
                 {{ $t('srsFastReview.title') }}
             </RouterLink>
             <RouterLink :to="{ name: 'learningSummary', params: { dictionaryPath: props.dictionaryPath } }" class="text-sm text-indigo-600 hover:underline block">
                 {{ $t('srsFastReview.toLearningSummary') }}
             </RouterLink>
         </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, useTemplateRef } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/layout/PageHeader.vue';
import type { SrsData } from '@/types';
import { srsUniqueId } from '@/types';
import { getSrsData as fetchSrsDataFromDb, saveSrsData } from '@/services/db';
import * as srsService from '@/services/srsService';
import emitter from '@/services/emitter';
import { useSwipeInteraction } from '@/composables/useSwipeInteraction';

const props = defineProps<{
  dictionaryPath: string;
  wordId: string;
}>();

const router = useRouter();
const { t } = useI18n();

const localSrsData = ref<SrsData | null>(null);
const localIsLoadingSrsData = ref(true);
const localError = ref<string | null>(null);
const isResetting = ref(false);

const srsDetailViewRootRef = useTemplateRef('srsDetailViewRootRef');

// --- Swipe Logic ---
const {
  handlePointerDown: handleSwipePointerDownInternal,
  resetSwipeState: resetPageSwipeState,
} = useSwipeInteraction(
  srsDetailViewRootRef,
  { threshold: 100, maxRotation: 0 },
  () => { goBack(); resetPageSwipeState(true); },
  () => { resetPageSwipeState(true); },
  () => { resetPageSwipeState(true); }
);

function handlePageSwipeStart(event: PointerEvent) {
    const targetElement = event.target as HTMLElement;
    if ( targetElement.closest( 'button, input, select, textarea, a[href], [role="button"], [tabindex="0"]' ) ) {
        return;
    }
    const scrollableContainer = srsDetailViewRootRef.value;
    if (scrollableContainer) {
        const canScroll = scrollableContainer.scrollHeight > scrollableContainer.clientHeight;
        if (canScroll && event.offsetY > 20 && event.offsetY < (scrollableContainer.clientHeight - 20) ) {
            if (scrollableContainer.scrollTop > 0) return;
        }
    }
    handleSwipePointerDownInternal(event);
}
// --- End Swipe Logic ---

const nextReviewDateFormatted = computed(() => {
    if (!localSrsData.value?.nextReviewDate) return 'N/A';
    const date = new Date(localSrsData.value.nextReviewDate);
    return date.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
});

const lastReviewDateFormatted = computed(() => {
     if (!localSrsData.value?.lastReviewDate) return 'N/A';
    const date = new Date(localSrsData.value.lastReviewDate);
    return date.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
});

function statusTextColor(status: SrsData['state'] | undefined): string {
    if (!status) return 'text-gray-700';
    switch (status) {
        case 'new': return 'text-blue-600';
        case 'learning': return 'text-yellow-600';
        case 'review': return 'text-green-600';
        case 'lapsed': return 'text-red-600';
        default: return 'text-gray-700';
    }
}

async function loadSrsDataForView() {
  localIsLoadingSrsData.value = true;
  localError.value = null;
  localSrsData.value = null;
  try {
    const uniqueId = srsUniqueId(props.dictionaryPath, props.wordId);
    const data = await fetchSrsDataFromDb(uniqueId);
    localSrsData.value = data || null;
    if (!data) {
      console.log(`SrsProgressDetail View: No SRS data for ${uniqueId}.`);
    }
  } catch (err: any) {
    console.error(`SrsProgressDetail View: Error loading SRS data for ${props.wordId}:`, err);
    localError.value = t('srsProgress.errorLoading');
  } finally {
    localIsLoadingSrsData.value = false;
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: 'detail', params: { dictionaryPath: props.dictionaryPath, wordId: props.wordId } });
  }
}

async function handleReset() {
    if (isResetting.value) return;
    const confirmReset = window.confirm(t('srsProgress.resetSrsConfirm'));
    if (!confirmReset) return;

    isResetting.value = true;
    try {
        const initialData = srsService.createInitialSrsData(props.dictionaryPath, props.wordId);
        await saveSrsData(initialData);
        localSrsData.value = initialData;
        emitter.emit('show-notification', { message: t('srsProgress.resetSrsSuccess'), type: 'success' });
    } catch (error: any) {
         console.error(`SrsProgressDetail: Failed reset SRS for ${props.wordId}:`, error);
         emitter.emit('show-notification', { message: t('srsProgress.resetSrsError', { error: error.message }), type: 'error' });
    } finally {
        isResetting.value = false;
    }
}

onMounted(() => {
  loadSrsDataForView();
});

watch(() => [props.dictionaryPath, props.wordId], () => {
  loadSrsDataForView();
}, { immediate: false });

</script>
