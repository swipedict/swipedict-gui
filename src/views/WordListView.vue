<template>
    <GenericWordListView
        ref="genericListRef"
        :list-items="renderedItems"
        :load-more-function="listViewStore.loadMoreWords"
        :is-loading-more="listViewStore.isLoadingMore" 
        :is-loading-initial="isViewLoadingInitialData"
        :all-loaded="listViewStore.allWordsRendered"
        :face-behavior-config="faceBehaviorConfig"
        :initial-face-type="FaceType.WORD_LIST_DEFAULT"
        :list-key-prefix="viewUniqueKey" 
        :target-item-id-to-scroll-to="effectiveTargetItemIdForScroll"
        :grid-class-name="isExploreMode ? 'explore-card-grid' : 'dictionary-browser-card-grid'"
        :empty-list-message="emptyListMessage"
        :min-items-for-empty-message="18"
        :enable-list-animation="enableListAnimation"
        :debug-scroll="false"
        @card-action="handleCardActionWrapper"
        @request-hint="handleHintRequest"
    >
        <template #header>
            <!-- BROWSER MODE HEADER -->
            <DictionaryListHeader
                v-if="!isExploreMode"
                :dictionary-title="dictionaryTitle"
                :dictionary-path="props.dictionaryPath"
                :search-term="localSearchTerm"
                :total-filtered-count="totalFilteredCount"
                :rendered-count="renderedItems.length"
                :is-loading-srs="dictionaryStore.isLoadingSrsIds && listViewStore.browseSrsFilterMode !== 'all'"
                :active-filter-count="activeFilterCount"
                :display-mode="settingsStore.settings.initialListDisplay"
                :source-lang-code="sourceLangCode"
                :target-lang-code="targetLangCode"
                @update:search-term="handleLocalSearchUpdate"
                @open-drawer="isFilterDrawerOpen = true"
                @clear-filters="clearAllFilters"
                @cycle-display-mode="cycleDisplayMode"
                @propose-new-word="isProposeModalOpen = true"
            />
            <!-- EXPLORE MODE HEADER -->
            <div v-else class="w-full px-3 sm:px-4 pt-3 pb-2 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700
                            bg-white/80 dark:bg-surface-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
                <div class="flex items-center justify-between mb-3 gap-2">
                    <h1 class="text-lg sm:text-xl font-heading font-bold text-slate-800 dark:text-slate-100 truncate min-w-0 flex-1">{{ exploreViewTitle }}</h1>
                    <RouterLink :to="{ name: 'topicSelection', params: { dictionaryPath: props.dictionaryPath } }" class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap shrink-0">{{ $t('topicSelection.otherTopics') }}</RouterLink>
                </div>
                <div class="flex flex-row flex-wrap gap-2 justify-end">
                    <button @click="cycleDisplayMode" :title="$t('dictionaryList.displayMode.tooltip')" class="text-xs flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                        <span class="font-mono text-xs mr-1.5">
                            <template v-if="settingsStore.settings.initialListDisplay === 'all'">[{{ sourceLangCode }}+{{ targetLangCode }}]</template>
                            <template v-else-if="settingsStore.settings.initialListDisplay === 'sourceOnly'">[{{ sourceLangCode }}]</template>
                            <template v-else>[{{ targetLangCode }}]</template>
                        </span>
                        {{ displayModeButtonText }}
                    </button>
                    <button @click="shuffleList" :title="$t('topicSelection.shuffleTooltip')" class="text-xs flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1.5"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-6.903 6.903l-1.044-.388a1.5 1.5 0 0 1-.83-1.855l.174-.872a1.5 1.5 0 0 0-.56-1.444l-.827-.828a1.5 1.5 0 0 1-.39-1.712l.202-1.01A5.5 5.5 0 0 1 15.312 11.424ZM1.44 5.322a5.5 5.5 0 0 1 6.903-6.903l1.044.388a1.5 1.5 0 0 1 .83 1.855l-.174.872a1.5 1.5 0 0 0 .56 1.444l.827.828a1.5 1.5 0 0 1 .39 1.712l-.202 1.01A5.5 5.5 0 0 1 1.44 5.322Z" clip-rule="evenodd" /></svg>
                        {{ $t('topicSelection.shuffle') }}
                    </button>
                </div>
                <p class="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">
                    {{ $t('topicSelection.newWordsInList', { count: totalFilteredCount, rendered: renderedItems.length }) }}
                </p>
            </div>

            <!-- MODALS (Only for Browser Mode) -->
            <FilterDrawer
                v-if="!isExploreMode"
                :is-open="isFilterDrawerOpen"
                :current-filters="currentFiltersForDrawer"
                :available-categorized-tags="dictionaryStore.availableCategorizedTags"
                @close="isFilterDrawerOpen = false"
                @apply-filters="handleApplyFilters"
                @clear-filters="clearAllFilters"
            />
            <ProposeWordModal
                v-if="!isExploreMode"
                :show="isProposeModalOpen"
                :is-submitting="isSubmittingProposal"
                :dictionary-title="dictionaryTitle"
                @close="isProposeModalOpen = false"
                @submit="handleWordProposal"
            />
        </template>
         <template #empty-actions>
            <div class="mt-4" v-if="dictionaryStore.dictionaryError && dictionaryStore.masterList.length === 0 && !dictionaryStore.isLoadingIndex">
                 <p class="font-semibold text-red-600">{{ $t('dictionaryList.errorLoadingDict') }}</p>
                 <p class="text-sm text-red-500 mb-3">{{ dictionaryStore.dictionaryError }}</p>
                 <button @click="() => loadInitialData(false)" class="px-4 py-1.5 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 transition-colors">{{ $t('dictionaryList.tryAgain') }}</button>
                 <RouterLink :to="{ name: 'dictionarySelection' }" class="mt-2 block text-xs text-primary-600 dark:text-primary-400 hover:underline">{{ $t('dictionaryList.changeDictionary') }}</RouterLink>
            </div>
             <div v-else-if="!appStore.isUserRegistered" class="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-xl text-sm">
                <p class="text-primary-900 dark:text-primary-200">
                    <i18n-t keypath="dictionaryList.registerToProgress" tag="span">
                        <template #link>
                            <RouterLink :to="{ name: 'register', query: { redirect: route.fullPath } }" class="font-semibold underline hover:text-primary-700 dark:hover:text-primary-300">{{ $t('general.createAccount') }}</RouterLink>
                        </template>
                    </i18n-t>
                </p>
             </div>
        </template>
    </GenericWordListView>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onActivated, onDeactivated } from 'vue';
import { useRouter, RouterLink, useRoute, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDictionaryStore, type SrsFilterMode } from '@/stores/dictionaryStore'; 
import { useListViewStore } from '@/stores/listViewStore';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import { useWordActions } from '@/composables/useWordActions';
import GenericWordListView from '@/components/GenericWordListView.vue'; 
import DictionaryListHeader from '@/components/DictionaryListHeader.vue';
import FilterDrawer from '@/components/filters/FilterDrawer.vue';
import ProposeWordModal from '@/components/ProposeWordModal.vue';
import { FaceType, WordListActions } from '@/types/cardConstants';
import type { UserState, WordEntry, AppSettings } from '@/types';
import type { FaceInteractionConfig, CardActionEventPayload, CardHintRequestPayload } from '@/types/interactiveCard';
import emitter from '@/services/emitter';
import { submitFeedback } from '@/services/feedbackService';

defineOptions({ name: 'WordListView' });

const props = defineProps<{ dictionaryPath: string; topicId?: string; }>(); 
const { t } = useI18n();
const dictionaryStore = useDictionaryStore();
const listViewStore = useListViewStore();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const customMediaStore = useCustomMediaStore();
const router = useRouter();
const route = useRoute();
const { handleCardAction } = useWordActions();

// --- REFS & STATE ---
const genericListRef = ref<InstanceType<typeof GenericWordListView> | null>(null);
const isViewLoadingInitialData = ref(true); 
const isFilterDrawerOpen = ref(false);
const isProposeModalOpen = ref(false);
const isSubmittingProposal = ref(false);
const lastInteractedWordId = ref<string | null>(null);
const enableListAnimation = ref(true);
const localSearchTerm = ref(listViewStore.browseSearchTerm);
// --- MODIFICATION: This ref will now declaratively control the scroll ---
const effectiveTargetItemIdForScroll = ref<string | number | null>(null);
const localDisplayList = ref<WordEntry[]>([]);

// --- COMPUTED PROPERTIES ---
const isExploreMode = computed(() => !!props.topicId);
const viewUniqueKey = computed(() => `wordList-${props.dictionaryPath}-${props.topicId || 'browse'}`);
const SESSION_STORAGE_SCROLL_KEY = computed(() => `wordListScrollTarget_${props.dictionaryPath}_${props.topicId || 'browse'}`);

const dictionaryTitle = computed(() => appStore.selectedDictionary?.message || props.dictionaryPath);
const exploreViewTitle = computed(() => `${t('topicSelection.title')}: ${props.topicId || t('general.all')}`);

const renderedItems = computed(() => isExploreMode.value ? localDisplayList.value.slice(0, listViewStore.renderedWordsCount) : listViewStore.getRenderedWords);
const totalFilteredCount = computed(() => isExploreMode.value ? localDisplayList.value.length : listViewStore.getFilteredList.length);

const activeFilterCount = computed(() => {
    let count = 0;
    if (listViewStore.browseFilterState !== 'ALL') count++;
    if (listViewStore.browseFilterTag !== null) count++;
    if (listViewStore.browseSrsFilterMode !== 'all') count++;
    if (listViewStore.browseSearchTerm.trim() !== '') count++;
    count += Object.values(listViewStore.browseFilterCategorized).filter(v => !!v).length;
    return count;
});

const emptyListMessage = computed(() => { 
    if (isViewLoadingInitialData.value || listViewStore.isLoadingMore) return "";
    if (totalFilteredCount.value > 0 || dictionaryStore.isLoadingIndex) return "";
    return t('dictionaryList.noWordsForFilter');
});

const sourceLangCode = computed(() => (dictionaryStore.currentDictionaryMeta?.sourceLanguage || 'SRC').toUpperCase());
const targetLangCode = computed(() => (dictionaryStore.currentDictionaryMeta?.targetLanguage || 'TGT').toUpperCase());

const currentFiltersForDrawer = computed(() => ({
    status: listViewStore.browseFilterState,
    srsMode: listViewStore.browseSrsFilterMode,
    simpleTag: listViewStore.browseFilterTag,
    categorized: listViewStore.browseFilterCategorized,
}));

const displayModeButtonText = computed(() => { 
    const currentMode = settingsStore.settings.initialListDisplay;
    if (currentMode === 'all') return t('dictionaryList.displayMode.all');
    if (currentMode === 'sourceOnly') return `${sourceLangCode.value} ${t('general.onlySuffix', 'only')}`;
    return `${targetLangCode.value} ${t('general.onlySuffix', 'only')}`;
});

const faceBehaviorConfig = computed(() => {
    const hintInteractions = {
        tap: WordListActions.TOGGLE_HINT_DRAWING,
        swipeLeft: WordListActions.TOGGLE_HINT_DRAWING,
        swipeRight: WordListActions.TOGGLE_HINT_DRAWING,
    };
    
    return {
        [FaceType.WORD_LIST_DEFAULT]: { 
            interactions: {
                tap: settingsStore.settings.playSoundOnTap ? WordListActions.PLAY_SOUND_TARGET : WordListActions.GOTO_DETAILS,
                swipeLeft: WordListActions.MARK_IGNORED,
                swipeRight: WordListActions.MARK_KEEP,
                longPress: WordListActions.GOTO_DETAILS,
                contextMenu: WordListActions.GOTO_DETAILS,
            } as FaceInteractionConfig,
        },
        [FaceType.HINT_DRAWING]: { interactions: hintInteractions as FaceInteractionConfig },
        [FaceType.HINT_IMAGE]: { interactions: { ...hintInteractions, tap: WordListActions.TOGGLE_HINT_IMAGE } as FaceInteractionConfig },
    };
});

// --- METHODS ---
function cycleDisplayMode() {  
   const current = settingsStore.settings.initialListDisplay;
   let nextMode: AppSettings['initialListDisplay'] = current === 'all' ? 'sourceOnly' : current === 'sourceOnly' ? 'targetOnly' : 'all';
   settingsStore.setInitialListDisplay(nextMode);
}

function shuffleList() {
    if (localDisplayList.value.length > 0) {
        const shuffled = [...localDisplayList.value];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        localDisplayList.value = shuffled;
        listViewStore.resetRenderedCount();
    }
}

async function handleWordProposal(payload: { sourceText: string; targetText: string; notes: string }) {
    if (isSubmittingProposal.value) return;
    if (!appStore.isUserRegistered) {
        emitter.emit('show-notification', { message: 'Bitte registrieren Sie sich, um diese Funktion zu nutzen.', type: 'error' });
        router.push({ name: 'register', query: { redirect: route.fullPath } });
        return;
    }
    
    isSubmittingProposal.value = true;
    const result = await submitFeedback({ type: 'proposal', dictionaryPath: props.dictionaryPath, ...payload });
    if (result.success) isProposeModalOpen.value = false;
    isSubmittingProposal.value = false;
}

function handleCardActionWrapper(payload: CardActionEventPayload) {
    lastInteractedWordId.value = payload.wordId;
    handleCardAction(payload, (id) => genericListRef.value?.getManagedCardRef(id), (wordId, newState) => {
        if (isExploreMode.value) {
            const index = localDisplayList.value.findIndex(item => item.id === wordId);
            if (index > -1) localDisplayList.value.splice(index, 1);
        }
    });
}

async function handleHintRequest(payload: CardHintRequestPayload) {
    const cardRef = genericListRef.value?.getManagedCardRef(payload.wordId);
    if(!cardRef) return;
    const media = await customMediaStore.getOrFetchMedia(props.dictionaryPath, payload.wordId);
    if (payload.hintType === 'drawing') cardRef.setHintData('drawing', media?.drawingDataUrl || null); 
    else if (payload.hintType === 'image') cardRef.setHintData('image', media?.imageDataUrl || null);
}

function handleLocalSearchUpdate(newTerm: string) {
    localSearchTerm.value = newTerm;
}

function handleApplyFilters(newFilters: any) {
    if (!appStore.isUserRegistered) {
        emitter.emit('show-notification', { message: t('dictionaryList.registerToUseFilters'), type: 'error' });
        router.push({ name: 'register', query: { redirect: route.fullPath } });
        return;
    }
    listViewStore.setBrowseFilters({
        state: newFilters.status,
        srsMode: newFilters.srsMode,
        tag: newFilters.simpleTag,
        categorized: newFilters.categorized
    });
    isFilterDrawerOpen.value = false;
    genericListRef.value?.scrollToTop();
}

function clearAllFilters() {
    localSearchTerm.value = '';
    listViewStore.setBrowseFilters({ state: 'ALL', tag: null, categorized: {}, srsMode: 'all', searchTerm: '' });
    genericListRef.value?.scrollToTop();
}

async function loadInitialData(isActivation: boolean) {
    isViewLoadingInitialData.value = true;
    
    await dictionaryStore.loadDictionaryIndex(props.dictionaryPath);
    if (dictionaryStore.dictionaryError) {
        isViewLoadingInitialData.value = false;
        return;
    }

    if (isExploreMode.value) {
        listViewStore.setExploreFilters(props.topicId!, 'NONE');
        localDisplayList.value = [...listViewStore.getFilteredList];
    } else {
        listViewStore.setExploreFilters('');
    }

    await nextTick();
    
    if (isActivation) {
        // On activation, we check session storage for a scroll target
        const scrollTargetId = sessionStorage.getItem(SESSION_STORAGE_SCROLL_KEY.value);
        if (scrollTargetId) {
            sessionStorage.removeItem(SESSION_STORAGE_SCROLL_KEY.value);
            effectiveTargetItemIdForScroll.value = scrollTargetId;
        }
    } else {
        // On a fresh load (not activation), just scroll to the top
        genericListRef.value?.scrollToTop();
    }
    
    isViewLoadingInitialData.value = false;
}

// --- LIFECYCLE & WATCHERS ---
let debounceTimer: number | null = null;
watch(localSearchTerm, (newValue) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
        listViewStore.setBrowseFilters({ searchTerm: newValue });
        genericListRef.value?.scrollToTop();
    }, 400);
});

watch(() => [props.dictionaryPath, props.topicId], () => {
    lastInteractedWordId.value = null;
    sessionStorage.removeItem(SESSION_STORAGE_SCROLL_KEY.value);
    loadInitialData(false);
}, { deep: true });

onMounted(() => { loadInitialData(false); });

onActivated(async () => {
    enableListAnimation.value = !lastInteractedWordId.value;
    localSearchTerm.value = listViewStore.browseSearchTerm;
    
    // --- MODIFICATION: The core logic is now just setting the prop ---
    const scrollTargetId = sessionStorage.getItem(SESSION_STORAGE_SCROLL_KEY.value);
    if (scrollTargetId) {
        sessionStorage.removeItem(SESSION_STORAGE_SCROLL_KEY.value);
        effectiveTargetItemIdForScroll.value = scrollTargetId;
    } else {
        effectiveTargetItemIdForScroll.value = null;
    }
    
    // If dictionary has changed, reload data
    if (dictionaryStore.currentDictionaryPath !== props.dictionaryPath) {
        await loadInitialData(true);
    }
    
    await nextTick();
    enableListAnimation.value = true;
});

onDeactivated(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    // --- MODIFICATION: Clear the scroll target when leaving ---
    effectiveTargetItemIdForScroll.value = null;
});

onBeforeRouteLeave((to) => {
    if (to.name === 'detail' && lastInteractedWordId.value) {
        sessionStorage.setItem(SESSION_STORAGE_SCROLL_KEY.value, lastInteractedWordId.value);
    } else {
        sessionStorage.removeItem(SESSION_STORAGE_SCROLL_KEY.value);
    }
    lastInteractedWordId.value = null;
});
</script>