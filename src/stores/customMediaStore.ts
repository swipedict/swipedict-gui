import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { Ref } from 'vue';
import { getMediaForWord as getMediaFromDb, saveMediaForWord as saveMediaToDb } from '@/services/db';
import type { WordMediaData } from '@/types';
import emitter from '@/services/emitter';
import { useThumbnailStore } from './thumbnailStore';

interface MediaCacheEntry {
    data: Partial<Pick<WordMediaData, 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote'>>;
    timestamp: number;
    isLoading: boolean;
    error?: string | null;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for in-memory cache before re-fetch from DB if needed

export const useCustomMediaStore = defineStore('customMedia', () => {
    const thumbnailStore = useThumbnailStore();

    const mediaCache: Ref<Map<string, MediaCacheEntry>> = shallowRef(new Map());
    const isSavingMediaGlobally: Ref<boolean> = ref(false); // Global saving flag

    function getCacheKey(dictionaryPath: string, wordId: string): string {
        return `${dictionaryPath}_${wordId}`;
    }

    async function fetchAndCacheMedia(dictionaryPath: string, wordId: string, forceRefetch: boolean = false): Promise<Partial<Pick<WordMediaData, 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote'>> | undefined> {
        const cacheKey = getCacheKey(dictionaryPath, wordId);
        const existingEntry = mediaCache.value.get(cacheKey);

        if (existingEntry && !existingEntry.isLoading && !forceRefetch && (Date.now() - existingEntry.timestamp < CACHE_TTL)) {
            // console.log(`CustomMediaStore: Using cached media for ${cacheKey}`);
            return existingEntry.data;
        }
        if (existingEntry?.isLoading) {
            // console.log(`CustomMediaStore: Already fetching media for ${cacheKey}, returning current promise or undefined.`);
            // A more advanced implementation might return a promise that resolves when the ongoing fetch completes.
            // For now, returning undefined is simpler and UI can react when data becomes available.
            return undefined; 
        }

        // Mark as loading
        // console.log(`CustomMediaStore: Fetching media for ${cacheKey}`);
        mediaCache.value.set(cacheKey, { data: existingEntry?.data || {}, timestamp: Date.now(), isLoading: true });
        mediaCache.value = new Map(mediaCache.value); // Trigger reactivity for shallowRef

        try {
            const mediaDataFromDb = await getMediaFromDb(dictionaryPath, wordId);
            const dataToCache = mediaDataFromDb 
                ? { 
                    drawingDataUrl: mediaDataFromDb.drawingDataUrl, 
                    imageDataUrl: mediaDataFromDb.imageDataUrl, 
                    userAudioDataUrl: mediaDataFromDb.userAudioDataUrl,
                    userTextNote: mediaDataFromDb.userTextNote
                  } 
                : {};
            
            mediaCache.value.set(cacheKey, { data: dataToCache, timestamp: Date.now(), isLoading: false });
            mediaCache.value = new Map(mediaCache.value);
            // console.log(`CustomMediaStore: Successfully fetched and cached media for ${cacheKey}`);
            return dataToCache;
        } catch (error: any) {
            console.error(`CustomMediaStore: Failed to fetch media for ${cacheKey}:`, error);
            mediaCache.value.set(cacheKey, { data: existingEntry?.data || {}, timestamp: Date.now(), isLoading: false, error: error.message });
            mediaCache.value = new Map(mediaCache.value);
            emitter.emit('show-notification', { message: `Fehler beim Laden der Medien für Wort ${wordId.split('-').pop()}: ${error.message}`, type: 'error' });
            return undefined;
        }
    }

    async function saveCustomMediaAction(
        dictionaryPath: string,
        wordId: string,
        mediaUpdates: Partial<Pick<WordMediaData, 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote'>>
    ): Promise<{ success: boolean; message: string; updatedMedia?: Partial<Pick<WordMediaData, 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote'>> }> {
        if (isSavingMediaGlobally.value) {
             console.warn("CustomMediaStore: Save operation already in progress globally.");
            return { success: false, message: "Ein anderer Speichervorgang läuft bereits." };
        }
        isSavingMediaGlobally.value = true;
        let notificationMsg = "Medien gespeichert."; // Default success message
        let success = false;
        const cacheKey = getCacheKey(dictionaryPath, wordId);

        try {
            await saveMediaToDb(dictionaryPath, wordId, mediaUpdates);
            
            if (mediaUpdates.imageDataUrl !== undefined) {
                await thumbnailStore.clearThumbnail(dictionaryPath, wordId);
            }

            // Determine specific success message based on what was updated
            if (mediaUpdates.drawingDataUrl !== undefined) {
                notificationMsg = mediaUpdates.drawingDataUrl ? "Zeichnung gespeichert." : "Zeichnung gelöscht.";
            } else if (mediaUpdates.imageDataUrl !== undefined) {
                notificationMsg = mediaUpdates.imageDataUrl ? "Bild gespeichert." : "Bild gelöscht.";
            } else if (mediaUpdates.userAudioDataUrl !== undefined) {
                notificationMsg = mediaUpdates.userAudioDataUrl ? "Audio-Notiz gespeichert." : "Audio-Notiz gelöscht.";
            } else if (mediaUpdates.userTextNote !== undefined) {
                notificationMsg = mediaUpdates.userTextNote ? "Textnotiz gespeichert." : "Textnotiz gelöscht.";
            } else {
                // This case should ideally not happen if mediaUpdates is always specific.
                notificationMsg = "Medien erfolgreich aktualisiert."; 
            }

            emitter.emit('show-notification', { message: notificationMsg, type: 'success', duration: 1500 });
            success = true;

            const currentCachedEntry = mediaCache.value.get(cacheKey);
            const currentCachedData = currentCachedEntry?.data || {};
            const newCachedData = { ...currentCachedData, ...mediaUpdates };
            
            (Object.keys(newCachedData) as Array<keyof typeof newCachedData>).forEach(key => {
                if (newCachedData[key] === undefined) {
                    delete newCachedData[key];
                }
            });

            mediaCache.value.set(cacheKey, { data: newCachedData, timestamp: Date.now(), isLoading: false });
            mediaCache.value = new Map(mediaCache.value);

            return { success, message: notificationMsg, updatedMedia: newCachedData };

        } catch (error: any) {
            console.error(`CustomMediaStore: Failed to save media for ${cacheKey}:`, error);
            notificationMsg = `Fehler beim Speichern der Medien: ${error.message}`;
            emitter.emit('show-notification', { message: notificationMsg, type: 'error' });
            success = false;
            return { success, message: notificationMsg };
        } finally {
            isSavingMediaGlobally.value = false;
        }
    }
    
    function getMedia(dictionaryPath: string, wordId: string): Partial<Pick<WordMediaData, 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote'>> | undefined {
        const entry = mediaCache.value.get(getCacheKey(dictionaryPath, wordId));
        return entry ? entry.data : undefined;
    }

    function isLoadingMedia(dictionaryPath: string, wordId: string): boolean {
        const entry = mediaCache.value.get(getCacheKey(dictionaryPath, wordId));
        return entry ? entry.isLoading : false;
    }
    
    function hasDrawing(dictionaryPath: string, wordId: string): boolean {
        const media = getMedia(dictionaryPath, wordId);
        // console.log(`CustomMediaStore.hasDrawing for ${dictionaryPath}/${wordId}:`, !!media?.drawingDataUrl, media);
        return !!media?.drawingDataUrl;
    }

    // Function to explicitly clear a specific item from the cache
    function clearMediaFromCache(dictionaryPath: string, wordId: string): void {
        const cacheKey = getCacheKey(dictionaryPath, wordId);
        if (mediaCache.value.has(cacheKey)) {
            mediaCache.value.delete(cacheKey);
            mediaCache.value = new Map(mediaCache.value); // Trigger reactivity
            console.log(`CustomMediaStore: Cleared media for ${cacheKey} from cache.`);
        }
    }

    function $reset() {
        mediaCache.value.clear();
        mediaCache.value = new Map(mediaCache.value); // Ensure reactivity on clear
        isSavingMediaGlobally.value = false;
        console.log("CustomMediaStore: Reset.");
    }

    return {
        // Actions
        getOrFetchMedia: fetchAndCacheMedia,
        saveCustomMediaAction,
        clearMediaFromCache,
        // Getters/State
        getMedia,
        isLoadingMedia,
        hasDrawing,
        isSavingMediaGlobally,
        // Reset
        $reset,
    };
});