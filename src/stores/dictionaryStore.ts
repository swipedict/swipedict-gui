import { defineStore } from 'pinia';
import { ref, computed, nextTick, watch } from 'vue';
import type { IndexEntry, WordEntry, UserState, UserProgressMap, DictionaryIndexContent, DictionaryIndexFileMetadata, SrsData, CategorizedTags } from '@/types';
import { srsUniqueId } from '@/types';
import {
    getProgressForDictionary, saveProgressForDictionary,
    getSrsData, saveSrsData, deleteSrsData, db,
    getCachedDictionaryIndex, cacheDictionaryIndex
} from '@/services/db';
import * as srsService from '@/services/srsService';
import emitter from '@/services/emitter';
import { useAppStore } from './appStore';
import { BASE_SERVER_URL } from '@/config';
import { normalizeSearchText } from '@/utils/textUtils'; 

const INITIAL_LOAD_COUNT = 18;
const LOAD_MORE_BATCH_SIZE = 12;

let currentLoadController: AbortController | null = null;

export type SrsFilterMode = 'all' | 'in_srs' | 'not_in_srs';

export const useDictionaryStore = defineStore('dictionary', () => {
    const masterList = ref<WordEntry[]>([]);
    const currentDictionaryPath = ref<string | null>(null);
    const currentDictionaryMeta = ref<DictionaryIndexFileMetadata | null>(null);
    const isLoadingIndex = ref(false);
    const dictionaryError = ref<string | null>(null);
    const userProgress = ref<UserProgressMap>({});
    const currentTopicId = ref<string | null>(null);
    const wordListFilterState = ref<UserState>('NONE');

    const srsWordIds = ref<Set<string>>(new Set());
    const isLoadingSrsIds = ref(false);

    const renderedWordListCount = ref(INITIAL_LOAD_COUNT);
    const isLoadingMore = ref(false);
    
    const availableCategorizedTags = computed((): CategorizedTags => {
        const categories = new Map<string, Set<string>>();
        const simpleTags = new Set<string>();
        
        for (const entry of masterList.value) {
            if (entry.tags) {
                entry.tags.forEach(tag => {
                    if (!tag) return;
                    const parts = tag.split(':');
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        const categoryKey = parts[0].trim();
                        const categoryValue = parts[1].trim();
                        if (!categories.has(categoryKey)) {
                            categories.set(categoryKey, new Set());
                        }
                        categories.get(categoryKey)!.add(categoryValue);
                    } else {
                        simpleTags.add(tag);
                    }
                });
            }
            if (entry.part_of_speech) {
                const categoryKey = 'pos';
                const categoryValue = entry.part_of_speech;
                if (!categories.has(categoryKey)) {
                    categories.set(categoryKey, new Set());
                }
                categories.get(categoryKey)!.add(categoryValue);
            }
        }
        return { categories, simpleTags };
    });
    
    const availablePartsOfSpeech = computed(() => {
        const partsOfSpeech = new Set<string>();
        masterList.value.forEach(entry => {
            if (entry.part_of_speech) partsOfSpeech.add(entry.part_of_speech);
        });
        return Array.from(partsOfSpeech).sort();
    });

    const getWordList = computed<WordEntry[]>(() => {
        let list = masterList.value;
        const topicId = currentTopicId.value;
        const topicIdLower = topicId?.toLowerCase();

        if (topicId && topicIdLower !== 'all') {
            if (topicIdLower.startsWith('pos:')) {
                return list.filter(entry => entry.part_of_speech === topicIdLower.split(':')[1] && entry.metadata.state === wordListFilterState.value);
            }
            list = list.filter(entry => entry.tags?.some(tag => tag.toLowerCase() === topicIdLower));
        }
        return list.filter(word => word.metadata.state === wordListFilterState.value);
    });
    
    const getRenderedWordList = computed(() => getWordList.value.slice(0, renderedWordListCount.value));
    const allWordListRendered = computed(() => getWordList.value.length > 0 && renderedWordListCount.value >= getWordList.value.length);
    
    const keepCount = computed(() => masterList.value.filter(w => w.metadata.state === 'KEEP').length);
    const ignoredCount = computed(() => masterList.value.filter(w => w.metadata.state === 'IGNORED').length);
    const totalWordsInCurrentDict = computed(() => masterList.value.length);

    const _processAndSetIndexData = (indexContent: DictionaryIndexContent, path: string) => {
        currentDictionaryMeta.value = indexContent.metadata;
        masterList.value = indexContent.entries.map((entry: IndexEntry) => ({
            ...entry,
            metadata: { state: userProgress.value[entry.id] || 'NONE', dictionaryPath: path },
            normalizedSearch: `${normalizeSearchText(entry.source.headword)}|${normalizeSearchText(entry.target.headword)}`
        }));
        resetRenderedCount('wordList');
    };

    async function loadSrsWordIdsForCurrentDictionary() {
        if (!currentDictionaryPath.value || isLoadingSrsIds.value) return;
        
        isLoadingSrsIds.value = true;
        srsWordIds.value.clear();
        try {
            const srsRecords = await db.srsData.where('dictionaryPath').equals(currentDictionaryPath.value).toArray();
            srsRecords.forEach(record => srsWordIds.value.add(record.wordId));
        } catch (error) {
            console.error("DictionaryStore: Failed to load SRS word IDs", error);
            emitter.emit('show-notification', { message: "Fehler beim Laden der SRS-Wort-IDs.", type: 'error'});
        } finally {
            isLoadingSrsIds.value = false;
        }
    }

    let _currentLoadPromise: Promise<void> | null = null;
    let _currentLoadForPath: string | null = null;

    async function loadDictionaryIndex(path: string) {
        if (!path) {
            dictionaryError.value = "Kein Wörterbuchpfad angegeben.";
            return;
        }

        // Deduplicate: if already loading this exact path, return the existing promise
        if (_currentLoadForPath === path && _currentLoadPromise) {
            return _currentLoadPromise;
        }

        if (currentLoadController) {
            currentLoadController.abort('new_dictionary_load');
        }
        _currentLoadForPath = path;
        currentLoadController = new AbortController();
        const signal = currentLoadController.signal;

        const doLoad = async () => {
        isLoadingIndex.value = true;
        dictionaryError.value = null;

        if (currentDictionaryPath.value !== path) {
            masterList.value = [];
            userProgress.value = {};
            srsWordIds.value.clear();
            currentTopicId.value = null;
            wordListFilterState.value = 'NONE';
        }
        currentDictionaryPath.value = path;

        try {
            const cachedIndex = await getCachedDictionaryIndex(path);
            if (cachedIndex) {
                console.log(`[dictionaryStore] Found cached index for ${path}. Loading immediately.`);
                userProgress.value = await getProgressForDictionary(path);
                _processAndSetIndexData(cachedIndex.content, path);
                isLoadingIndex.value = false;
                await loadSrsWordIdsForCurrentDictionary();
            }

            const app = useAppStore();
            const dictMetaFromGlobal = app.availableDictionaries.find(d => d.path === path);
            if (!dictMetaFromGlobal || !dictMetaFromGlobal.dictId) {
                throw new Error(`Metadaten für Wörterbuchpfad "${path}" nicht gefunden oder ungültig.`);
            }
            
            const indexFilename = `index-${dictMetaFromGlobal.dictId}.json`;
            const indexUrl = `${BASE_SERVER_URL}/${path}/${indexFilename}?t=${Date.now()}`;
            
            const response = await fetch(indexUrl, { cache: 'no-store', signal });
            if (!response.ok) throw new Error(`HTTP ${response.status} fetching index ${indexFilename}`);

            const latestIndexContent: DictionaryIndexContent = await response.json();

            if (!latestIndexContent?.entries || !latestIndexContent?.metadata || latestIndexContent.metadata.dictId !== dictMetaFromGlobal.dictId) {
                throw new Error(`Invalid index format from network for ${path}`);
            }

            if (cachedIndex?.content.metadata.lastUpdate !== latestIndexContent.metadata.lastUpdate) {
                console.log(`[dictionaryStore] New version of index for ${path} found. Updating state and cache.`);
                await cacheDictionaryIndex(path, latestIndexContent);
                userProgress.value = await getProgressForDictionary(path);
                _processAndSetIndexData(latestIndexContent, path);
                if (!isLoadingSrsIds.value) {
                    await loadSrsWordIdsForCurrentDictionary();
                }
            } else if (!cachedIndex) {
                console.log(`[dictionaryStore] No cached index for ${path}. Caching now.`);
                await cacheDictionaryIndex(path, latestIndexContent);
                userProgress.value = await getProgressForDictionary(path);
                _processAndSetIndexData(latestIndexContent, path);
                await loadSrsWordIdsForCurrentDictionary();
            }

        } catch (error: any) {
            if (error?.name === 'AbortError') {
                console.log(`[dictionaryStore] Fetch aborted for ${path} (superseded by new load).`);
                return;
            }
            if (masterList.value.length > 0) {
                console.warn(`[dictionaryStore] Failed to fetch latest index for ${path}, but using cached version. Error: ${error.message}`);
            } else {
                dictionaryError.value = error.message || `Failed to load index for ${path}`;
                emitter.emit('show-notification', { message: `Error loading dictionary: ${dictionaryError.value}`, type: 'error' });
            }
        } finally {
            isLoadingIndex.value = false;
            if (_currentLoadForPath === path) {
                _currentLoadPromise = null;
                _currentLoadForPath = null;
            }
        }
        };

        _currentLoadPromise = doLoad();
        return _currentLoadPromise;
    }

    function setTopicFilter(topicId: string | null) {
        const newTopicId = topicId || 'all';
        if (currentTopicId.value !== newTopicId) {
            currentTopicId.value = newTopicId;
            resetRenderedCount('wordList');
        }
    }

    function setWordListFilterState(state: UserState) {
        if (wordListFilterState.value !== state) {
            wordListFilterState.value = state;
            resetRenderedCount('wordList');
        }
    }

    function resetRenderedCount(viewType: 'wordList') {
        isLoadingMore.value = false;
        if (viewType === 'wordList') {
            renderedWordListCount.value = INITIAL_LOAD_COUNT;
        }
    }

    function loadMoreWords(viewType: 'wordList', batchSize = LOAD_MORE_BATCH_SIZE) {
        if (isLoadingMore.value || allWordListRendered.value) return;
        isLoadingMore.value = true;
        setTimeout(() => {
            renderedWordListCount.value = Math.min(renderedWordListCount.value + batchSize, getWordList.value.length);
            isLoadingMore.value = false;
        }, 50);
    }

    async function updateWordState(payload: { id: string, newState: UserState }) {
        if (!currentDictionaryPath.value) return;
        const { id, newState } = payload;
        const dictionaryPath = currentDictionaryPath.value; 
        const index = masterList.value.findIndex(word => word.id === id);
        if (index === -1) return;
        const oldState = masterList.value[index].metadata.state;
        if (oldState === newState) return; 

        masterList.value[index].metadata.state = newState;
        masterList.value[index].metadata.dictionaryPath = dictionaryPath;

        try {
            const progressToSave = { ...userProgress.value };
            if (newState === 'NONE') delete progressToSave[id]; else progressToSave[id] = newState;
            await saveProgressForDictionary(dictionaryPath, progressToSave);
            userProgress.value = progressToSave; 

            const uniqueId = srsUniqueId(dictionaryPath, id);
            if (newState === 'KEEP') {
                let srsData = await getSrsData(uniqueId);
                if (!srsData) { srsData = srsService.createInitialSrsData(dictionaryPath, id); await saveSrsData(srsData); }
                srsWordIds.value.add(id);
            } else if (oldState === 'KEEP') {
                await deleteSrsData(uniqueId);
                srsWordIds.value.delete(id); 
            }
        } catch (error) {
            console.error(`DictStore: Failed save progress for ${id}:`, error);
            emitter.emit('show-notification', { message: `Error saving progress`, type: 'error' });
            masterList.value[index].metadata.state = oldState; 
        }
    }

    function getFilenameForWord(wordId: string): { filename: string; contentVersion: number } | null {
        const entry = masterList.value.find(w => w.id === wordId);
        return entry?.filename ? { filename: entry.filename, contentVersion: entry.contentVersion || 1 } : null;
    }

    function $reset() { 
        masterList.value = []; currentDictionaryPath.value = null; currentDictionaryMeta.value = null; isLoadingIndex.value = false; dictionaryError.value = null; userProgress.value = {}; currentTopicId.value = null; wordListFilterState.value = 'NONE'; renderedWordListCount.value = INITIAL_LOAD_COUNT; isLoadingMore.value = false; srsWordIds.value.clear(); isLoadingSrsIds.value = false; 
    }
    
    watch(() => useAppStore().selectedDictionaryPath, (newPath, oldPath) => {
        if (newPath && newPath !== oldPath) {
            loadDictionaryIndex(newPath);
        } else if (!newPath && oldPath) {
            $reset();
        }
    });

    return {
        masterList, currentDictionaryPath, currentDictionaryMeta, isLoadingIndex, dictionaryError, isLoadingMore, userProgress, 
        currentTopicId, wordListFilterState, renderedWordListCount,
        srsWordIds, isLoadingSrsIds,
        availableCategorizedTags, availablePartsOfSpeech, getWordList, getRenderedWordList, allWordListRendered, keepCount, ignoredCount, totalWordsInCurrentDict,
        loadDictionaryIndex, updateWordState, getFilenameForWord, $reset,
        setTopicFilter, setWordListFilterState,
        loadMoreWords, resetRenderedCount, loadSrsWordIdsForCurrentDictionary,
        normalizeSearchText 
    };
});