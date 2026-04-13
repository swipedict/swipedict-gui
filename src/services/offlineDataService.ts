import { useDictionaryStore } from '@/stores/dictionaryStore';
import { BASE_SERVER_URL, MEDIA_BASE_URL } from '@/config';
import type { DictionaryMeta } from '@/types';

const AUDIO_CACHE_NAME = 'swipedict-audio-cache-v1';
const DETAILS_CACHE_NAME = 'swipedict-details-cache-v1';
const BATCH_SIZE = 10; // Process 10 files concurrently

export type DownloadType = 'audio' | 'details' | 'all';
export type ProgressCallback = (progress: { current: number; total: number; type: DownloadType }) => void;

/**
 * Downloads all target language audio files for a given dictionary and stores them in the cache.
 */
export async function downloadDictionaryAudio(
    dictionary: DictionaryMeta,
    onProgress: ProgressCallback,
    signal: AbortSignal
): Promise<{ success: number, skipped: number, errors: number }> {
    const dictionaryStore = useDictionaryStore();
    if (dictionaryStore.currentDictionaryPath !== dictionary.path) {
        await dictionaryStore.loadDictionaryIndex(dictionary.path);
    }
    if (signal.aborted) throw new Error("Aborted");

    const words = dictionaryStore.masterList;
    
    const audioUrls = words
        .map(word => word.target?.audioUrl)
        .filter((url): url is string => !!url)
        .map(relativeUrl => `${MEDIA_BASE_URL}${relativeUrl}`);

    const cache = await caches.open(AUDIO_CACHE_NAME);
    let completed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < audioUrls.length; i += BATCH_SIZE) {
        if (signal.aborted) throw new Error("Aborted");
        const batch = audioUrls.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (url) => {
            if (signal.aborted) return;
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                skipped++;
                return;
            }
            try {
                const response = await fetch(url, { signal });
                if (response.ok) {
                    await cache.put(url, response);
                } else if (response.status !== 404) {
                    errors++;
                }
            } catch (fetchError: any) {
                if (fetchError.name !== 'AbortError') errors++;
            }
        });

        await Promise.all(batchPromises);
        completed += batch.length;
        onProgress({ current: completed, total: audioUrls.length, type: 'audio' });
    }
    return { success: completed - skipped - errors, skipped, errors };
}

/**
 * Downloads all detail.json files for a given dictionary and stores them in the cache.
 */
export async function downloadDictionaryDetails(
    dictionary: DictionaryMeta,
    onProgress: ProgressCallback,
    signal: AbortSignal
): Promise<{ success: number, skipped: number, errors: number }> {
    const dictionaryStore = useDictionaryStore();
    if (dictionaryStore.currentDictionaryPath !== dictionary.path) {
        await dictionaryStore.loadDictionaryIndex(dictionary.path);
    }
    if (signal.aborted) throw new Error("Aborted");

    const words = dictionaryStore.masterList;
    
    // --- THIS IS THE CORRECTED AND SIMPLIFIED LOGIC ---
    // The filename from the index already contains the version. No need to add it as a query parameter.
    const detailUrls = words.map(word => {
        const wordIndexInfo = dictionaryStore.getFilenameForWord(word.id);
        if (!wordIndexInfo) return null;
        // Construct the full, absolute URL to the static file
        return `${BASE_SERVER_URL}/${dictionary.path}/${wordIndexInfo.filename}`;
    }).filter((url): url is string => !!url); // Filter out any nulls if a word wasn't found
    // --- END CORRECTION ---

    const cache = await caches.open(DETAILS_CACHE_NAME);
    let completed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < detailUrls.length; i += BATCH_SIZE) {
        if (signal.aborted) throw new Error("Aborted");
        const batch = detailUrls.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (url) => {
            if (signal.aborted) return;
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                skipped++;
                return;
            }
            try {
                const response = await fetch(url, { signal });
                if (response.ok) {
                    await cache.put(url, response);
                } else {
                    errors++;
                }
            } catch (fetchError: any) {
                if (fetchError.name !== 'AbortError') errors++;
            }
        });

        await Promise.all(batchPromises);
        completed += batch.length;
        onProgress({ current: completed, total: detailUrls.length, type: 'details' });
    }
    return { success: completed - skipped - errors, skipped, errors };
}