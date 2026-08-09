import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useDictionaryStore, type SrsFilterMode } from './dictionaryStore';
import type { WordEntry, UserState } from '@/types';
import { normalizeSearchText } from '@/utils/textUtils';

const INITIAL_LOAD_COUNT = 18;
const LOAD_MORE_BATCH_SIZE = 12;

export const useListViewStore = defineStore('listView', () => {
    // --- STATE ---
    // Filters for "Browse" mode (DictionaryListView)
    const browseFilterState = ref<UserState | 'ALL'>('ALL');
    const browseFilterTag = ref<string | null>(null);
    const browseSearchTerm = ref('');
    const browseSrsFilterMode = ref<SrsFilterMode>('all');
    const browseFilterCategorized = ref<Record<string, string>>({});
    
    // Filters for "Explore" mode (ExploreListView)
    const exploreTopicId = ref<string | null>(null);
    const exploreFilterState = ref<UserState>('NONE');

    const renderedWordsCount = ref(INITIAL_LOAD_COUNT);
    const isLoadingMore = ref(false);

    // --- DEPENDENCIES ---
    const dictionaryStore = useDictionaryStore();

    // --- GETTERS (COMPUTED) ---
    const getFilteredList = computed((): WordEntry[] => {
        let list = dictionaryStore.masterList;

        // Apply EXPLORE filters first if a topic is set
        if (exploreTopicId.value && exploreTopicId.value.toLowerCase() !== 'all') {
            const topicIdLower = exploreTopicId.value.toLowerCase();
            // TopicSelectionView synthesises a `pos:<part_of_speech>` topic id for the word-class
            // group. That tag is never present in entry.tags, so it has to be matched against the
            // field itself — same special case the categorized browse filter makes below.
            const posValue = topicIdLower.startsWith('pos:') ? topicIdLower.slice(4) : null;
            list = list.filter(entry => posValue !== null
                ? entry.part_of_speech?.toLowerCase() === posValue
                : entry.tags?.some(tag => tag.toLowerCase() === topicIdLower));
            list = list.filter(word => word.metadata.state === exploreFilterState.value);
            return list;
        }

        // Apply BROWSE filters if no topic is set
        if (browseFilterState.value !== 'ALL') {
            list = list.filter(word => word.metadata.state === browseFilterState.value);
        }
        
        if (browseFilterTag.value) {
            list = list.filter(entry => entry.tags?.includes(browseFilterTag.value!));
        }
        
        if (Object.keys(browseFilterCategorized.value).length > 0) {
            const activeCategorizedFilters = Object.entries(browseFilterCategorized.value).filter(([, value]) => value);
            if (activeCategorizedFilters.length > 0) {
                list = list.filter(entry => {
                    return activeCategorizedFilters.every(([category, value]) => {
                        if (category === 'pos') {
                            return entry.part_of_speech === value;
                        }
                        return entry.tags && entry.tags.includes(`${category}:${value}`);
                    });
                });
            }
        }
        
        const searchTermRaw = browseSearchTerm.value; 
        if (searchTermRaw.trim()) {
            const normalizedUserSearch = normalizeSearchText(searchTermRaw); 
            if (normalizedUserSearch) { 
                 list = list.filter(entry => entry.normalizedSearch?.includes(normalizedUserSearch));
            }
        }

        if (browseSrsFilterMode.value !== 'all') {
            if (browseSrsFilterMode.value === 'in_srs') list = list.filter(word => dictionaryStore.srsWordIds.has(word.id));
            else if (browseSrsFilterMode.value === 'not_in_srs') list = list.filter(word => !dictionaryStore.srsWordIds.has(word.id));
        }
        
        return list;
    });

    const getRenderedWords = computed((): WordEntry[] => getFilteredList.value.slice(0, renderedWordsCount.value));
    const allWordsRendered = computed((): boolean => getFilteredList.value.length > 0 && renderedWordsCount.value >= getFilteredList.value.length);

    // --- ACTIONS ---
    function setBrowseFilters(filters: {
        state?: UserState | 'ALL',
        tag?: string | null,
        categorized?: Record<string, string>,
        searchTerm?: string,
        srsMode?: SrsFilterMode,
    }) {
        if (filters.state !== undefined) browseFilterState.value = filters.state;
        if (filters.tag !== undefined) browseFilterTag.value = filters.tag;
        if (filters.categorized !== undefined) browseFilterCategorized.value = filters.categorized;
        if (filters.searchTerm !== undefined) browseSearchTerm.value = filters.searchTerm;
        if (filters.srsMode !== undefined) {
             browseSrsFilterMode.value = filters.srsMode;
             if (filters.srsMode !== 'all' && dictionaryStore.srsWordIds.size === 0 && !dictionaryStore.isLoadingSrsIds) {
                 dictionaryStore.loadSrsWordIdsForCurrentDictionary();
             }
        }
        exploreTopicId.value = null; // Clear explore topic when setting browse filters
        resetRenderedCount();
    }

    function setExploreFilters(topicId: string, state: UserState = 'NONE') {
        exploreTopicId.value = topicId;
        exploreFilterState.value = state;
        // Reset browse filters when switching to explore mode
        browseFilterState.value = 'ALL';
        browseFilterTag.value = null;
        browseSearchTerm.value = '';
        browseSrsFilterMode.value = 'all';
        browseFilterCategorized.value = {};
        resetRenderedCount();
    }

    function resetRenderedCount() {
        isLoadingMore.value = false;
        renderedWordsCount.value = INITIAL_LOAD_COUNT;
    }

    function loadMoreWords() {
        if (isLoadingMore.value || allWordsRendered.value) return;
        isLoadingMore.value = true;
        setTimeout(() => {
            const currentCount = renderedWordsCount.value;
            const totalCount = getFilteredList.value.length;
            renderedWordsCount.value = Math.min(currentCount + LOAD_MORE_BATCH_SIZE, totalCount);
            isLoadingMore.value = false;
        }, 50);
    }

    function $reset() {
        browseFilterState.value = 'ALL';
        browseFilterTag.value = null;
        browseSearchTerm.value = '';
        browseSrsFilterMode.value = 'all';
        browseFilterCategorized.value = {};
        exploreTopicId.value = null;
        exploreFilterState.value = 'NONE';
        renderedWordsCount.value = INITIAL_LOAD_COUNT;
        isLoadingMore.value = false;
    }

    return {
        // State
        browseFilterState, browseFilterTag, browseSearchTerm, browseSrsFilterMode, browseFilterCategorized,
        exploreTopicId, exploreFilterState,
        renderedWordsCount, isLoadingMore,
        // Getters
        getFilteredList, getRenderedWords, allWordsRendered,
        // Actions
        setBrowseFilters, setExploreFilters,
        resetRenderedCount, loadMoreWords,
        $reset
    };
});