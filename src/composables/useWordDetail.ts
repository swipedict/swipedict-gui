import { ref, watch, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import type { WordDetail, WordMediaData } from '@/types';
import { BASE_SERVER_URL } from '@/config';

const DETAILS_CACHE_NAME = 'swipedict-details-cache-v1';

export function useWordDetail(dictionaryPath: Ref<string>, wordId: Ref<string>) {
  const dictionaryStore = useDictionaryStore();
  const customMediaStore = useCustomMediaStore();

  const wordDetailData = ref<WordDetail | null>(null);
  const mediaData = ref<Partial<WordMediaData> | null>(null);
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const contentVersion = ref<number | null>(null);

  let controller: AbortController | null = null;

  const loadData = async () => {
    if (controller) controller.abort('New data load request');
    controller = new AbortController();
    const { signal } = controller;

    isLoading.value = true;
    error.value = null;
    wordDetailData.value = null;
    mediaData.value = null;
    contentVersion.value = null;

    try {
      if (dictionaryStore.currentDictionaryPath !== dictionaryPath.value || dictionaryStore.masterList.length === 0) {
        await dictionaryStore.loadDictionaryIndex(dictionaryPath.value);
        if (dictionaryStore.dictionaryError) throw new Error(`Failed to load dictionary index: ${dictionaryStore.dictionaryError}`);
      }
      if (signal.aborted) return;

      const wordIndexInfo = dictionaryStore.getFilenameForWord(wordId.value);
      if (!wordIndexInfo) throw new Error(`Word ID "${wordId.value}" not found in the current dictionary index.`);
      
      contentVersion.value = wordIndexInfo.contentVersion;
      
      // --- THIS IS THE CORRECTED AND SIMPLIFIED LINE ---
      // The filename from the index already includes the version. No need to add it as a query parameter.
      const detailUrl = `${BASE_SERVER_URL}/${dictionaryPath.value}/${wordIndexInfo.filename}`;
      // --- END CORRECTION ---
      
      const cache = await caches.open(DETAILS_CACHE_NAME);
      let response = await cache.match(detailUrl);
      if (!response) {
        response = await fetch(detailUrl, { signal });
        if (response.ok) {
            cache.put(detailUrl, response.clone());
        }
      }

      if (!response.ok) throw new Error(`HTTP ${response.status} fetching word detail`);
      wordDetailData.value = await response.json();
      if (signal.aborted) return;

      mediaData.value = await customMediaStore.getOrFetchMedia(dictionaryPath.value, wordId.value) || {};

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("useWordDetail error:", err);
        error.value = err.message;
      }
    } finally {
      if (!signal.aborted) {
        isLoading.value = false;
      }
    }
  };

  watch([dictionaryPath, wordId], loadData, { immediate: true });

  onUnmounted(() => {
    if (controller) controller.abort('Component unmounted');
  });

  return { 
    wordDetailData, 
    mediaData, 
    isLoading, 
    error, 
    contentVersion,
    reload: loadData
  };
}