import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { speakText, cancelSpeech } from '@/services/tts';
import { getLanguageCode } from '@/utils/languageUtils';
import emitter from '@/services/emitter';
import { BASE_SERVER_URL } from '@/config';
import { useAppStore } from '@/stores/appStore';
import { useDictionaryStore } from '@/stores/dictionaryStore';

const AUDIO_CACHE_NAME = 'swipedict-audio-cache-v1';
const MAX_FETCH_RETRIES = 2; 
const RETRY_DELAY_MS = 750; // Increased delay for more breathing room
// --- MODIFICATION: Added a timeout for each fetch attempt ---
const FETCH_TIMEOUT_MS = 8000; // 8 seconds

// --- Types ---
export type PlaybackType = 'headword' | 'example' | 'user' | 'related' | 'antonym' | 'tts' | string;
export interface PlaybackPayload {
    sourceUrl?: string;
    identifier: string;
    textToSpeak?: string;
    langCode?: string;
    disableTTSFallback?: boolean;
    userAudioDataUrl?: string;
    dictionaryPath?: string;
    wordId?: string;
}

// --- Singleton State ---
const isPlaying = ref(false);
const currentPlaybackIdentifier = ref<string | null>(null);
let currentAudioElement: HTMLAudioElement | null = null;
let activeFetchController: AbortController | null = null;

const isPrefetching = ref(false);
const prefetchProgress = ref(0);
const prefetchTotal = ref(0);
const activePrefetchController = ref<AbortController | null>(null);

// --- Private Helper Functions ---

const onAudioEnded = () => {
    cleanupCurrentAudio(false);
};

const onAudioError = (event: Event | string) => {
    const audioEl = event.currentTarget as HTMLAudioElement;
    const errorMessage = typeof event === 'string' ? event : audioEl?.error?.message || 'Unknown audio error';
    const failedSrc = audioEl?.src || 'source unknown';
    console.error(`AudioPlayer: Error playing audio from ${failedSrc}. Identifier: ${currentPlaybackIdentifier.value}. Error:`, errorMessage);

    if (errorMessage && !errorMessage.includes('aborted')) {
        emitter.emit('show-notification', { message: `Audio playback error: ${errorMessage}`, type: 'error' });
    }
    cleanupCurrentAudio(false);
};

function cleanupCurrentAudio(stopPlaybackIntent: boolean = true) {
    if (activeFetchController) {
        activeFetchController.abort('cleanup');
        activeFetchController = null;
    }
    if (currentAudioElement) {
        if (stopPlaybackIntent && !currentAudioElement.paused) {
            currentAudioElement.pause();
        }
        currentAudioElement.removeEventListener('ended', onAudioEnded);
        currentAudioElement.removeEventListener('error', onAudioError);
        if (currentAudioElement.src && currentAudioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudioElement.src);
        }
        currentAudioElement.removeAttribute('src');
        currentAudioElement.load();
        currentAudioElement = null;
    }
    isPlaying.value = false;
    currentPlaybackIdentifier.value = null;
}

async function getPlayableUrl(sourceUrl: string, identifier: string): Promise<string> {
    console.log(`[AudioPlayer - ${identifier}] getPlayableUrl started for: ${sourceUrl}`);
    if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
        console.log(`[AudioPlayer - ${identifier}] Provided URL is a data/blob URL. Playing directly.`);
        return sourceUrl;
    }

    if (activeFetchController && !activeFetchController.signal.aborted) {
        activeFetchController.abort('new_request');
    }
    activeFetchController = new AbortController();
    const { signal } = activeFetchController;

    try {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const cachedResponse = await cache.match(sourceUrl);
        if (cachedResponse) {
            console.log(`[AudioPlayer - ${identifier}] Cache HIT. Creating blob URL.`);
            const blob = await cachedResponse.blob();
            return URL.createObjectURL(blob);
        }

        console.log(`[AudioPlayer - ${identifier}] Cache MISS. Attempting to fetch from network.`);
        for (let attempt = 1; attempt <= MAX_FETCH_RETRIES + 1; attempt++) {
            if (signal.aborted) throw new Error("Fetch aborted by new request during retry loop.");
            try {
                // --- MODIFICATION: Create a timeout controller for this specific attempt ---
                const attemptController = new AbortController();
                const timeoutId = setTimeout(() => attemptController.abort('timeout'), FETCH_TIMEOUT_MS);
                
                // Combine the main signal (for overall cancellation) and the timeout signal
                const combinedSignal = AbortSignal.any ? AbortSignal.any([signal, attemptController.signal]) : signal;

                const response = await fetch(sourceUrl, { signal: combinedSignal });
                clearTimeout(timeoutId); // Clear the timeout if fetch resolves or rejects first

                if (!response.ok) {
                    console.warn(`[AudioPlayer - ${identifier}] Fetch attempt ${attempt} failed. Status: ${response.status} ${response.statusText}`);
                    throw new Error(`HTTP ${response.status}`);
                }
                
                console.log(`[AudioPlayer - ${identifier}] Fetch attempt ${attempt} SUCCESSFUL. Caching response.`);
                const responseForCache = response.clone();
                cache.put(sourceUrl, responseForCache).catch(err => console.error("Cache put error:", err));
                
                const blob = await response.blob();
                return URL.createObjectURL(blob);

            } catch (error: any) {
                if (signal.aborted || error.name === 'AbortError') throw error;

                const reason = error.message.includes('timeout') ? 'timed out' : 'threw an error';
                console.error(`[AudioPlayer - ${identifier}] Fetch attempt ${attempt} ${reason}:`, error.message);
                if (attempt > MAX_FETCH_RETRIES) {
                    throw error;
                }
                
                console.log(`[AudioPlayer - ${identifier}] Waiting ${RETRY_DELAY_MS}ms before next retry...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
        throw new Error("Exhausted all fetch retries.");

    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error(`[AudioPlayer - ${identifier}] FINAL ERROR after retries for ${sourceUrl}:`, error.message);
        } else {
            console.log(`[AudioPlayer - ${identifier}] Fetch process was aborted.`);
        }
        throw error;
    } finally {
        if (activeFetchController?.signal === signal) {
            activeFetchController = null;
        }
    }
}


function shouldAttemptTTS(playbackType: PlaybackType, payload: PlaybackPayload): boolean {
    return (playbackType === 'headword' || playbackType === 'example' || playbackType === 'etymology') && !payload.disableTTSFallback && !!payload.textToSpeak && !!payload.langCode;
}

// --- Publicly Exported Functions ---

export function stopAudio() {
    cancelSpeech();
    cleanupCurrentAudio(true);
}

export async function playAudio(playbackType: PlaybackType, payload: PlaybackPayload) {
    // --- MODIFICATION START: Prevent self-cancellation ---
    if (isPlaying.value && currentPlaybackIdentifier.value === payload.identifier) {
        console.log(`[AudioPlayer - ${payload.identifier}] Playback for this identifier is already in progress. Ignoring duplicate request.`);
        return;
    }
    // --- MODIFICATION END ---

    stopAudio();
    currentPlaybackIdentifier.value = payload.identifier;
    isPlaying.value = true;
    
    const audio = new Audio();
    currentAudioElement = audio;
    audio.addEventListener('ended', onAudioEnded);
    audio.addEventListener('error', onAudioError);

    let finalSourceUrl: string | undefined = undefined;

    if (payload.userAudioDataUrl) {
        finalSourceUrl = payload.userAudioDataUrl;
    } 
    else if (payload.sourceUrl) {
        finalSourceUrl = `${BASE_SERVER_URL}${payload.sourceUrl}`;
    }
    
    console.log(`[AudioPlayer - ${payload.identifier}] playAudio called. Type: ${playbackType}, URL: ${finalSourceUrl || 'N/A'}, TTS: "${payload.textToSpeak || ''}"`);

    if (finalSourceUrl) {
        try {
            const playableUrl = await getPlayableUrl(finalSourceUrl, payload.identifier);
            if (currentPlaybackIdentifier.value !== payload.identifier) {
                console.log(`[AudioPlayer - ${payload.identifier}] Playback aborted; identifier changed during fetch.`);
                if (playableUrl.startsWith('blob:')) URL.revokeObjectURL(playableUrl);
                return;
            }
            audio.src = playableUrl;
            console.log(`[AudioPlayer - ${payload.identifier}] Playing from resolved URL: ${playableUrl.substring(0, 50)}...`);
            await audio.play();
            return;
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.warn(`[AudioPlayer - ${payload.identifier}] Could not play from source, will attempt fallback. Error: ${error.message}`);
            }
        }
    }
    
    if (shouldAttemptTTS(playbackType, payload)) {
        console.log(`[AudioPlayer - ${payload.identifier}] Falling back to TTS.`);
        const bcp47Code = getLanguageCode(payload.langCode!);
        if (bcp47Code) {
            cleanupCurrentAudio(false); 
            speakText(payload.textToSpeak!, bcp47Code);
        } else {
            emitter.emit('show-notification', { message: `No audio or TTS for ${payload.langCode} available.`, type: 'error', duration: 2000 });
            cleanupCurrentAudio(false);
        }
    } else {
        console.log(`[AudioPlayer - ${payload.identifier}] No playable source and TTS is disabled or not applicable. Playback finished.`);
        cleanupCurrentAudio(false);
    }
}

export async function clearAudioCache(): Promise<void> {
    try {
        await caches.delete(AUDIO_CACHE_NAME);
        console.log(`AudioPlayer: Cache "${AUDIO_CACHE_NAME}" deleted successfully.`);
        emitter.emit('show-notification', { message: "Audio-Cache geleert.", type: 'success' });
    } catch (error: any) {
        console.error(`AudioPlayer: Failed to delete cache "${AUDIO_CACHE_NAME}":`, error);
        emitter.emit('show-notification', { message: `Fehler beim Leeren des Audio-Caches: ${error.message}`, type: 'error' });
    }
}

export async function prefetchTargetAudio(dictionaryPath: string): Promise<void> {
    if (isPrefetching.value) {
        emitter.emit('show-notification', { message: "Prefetch läuft bereits.", type: 'error' });
        return;
    }
    const appStore = useAppStore();
    const dictionaryStore = useDictionaryStore();
    const dictMeta = appStore.availableDictionaries.find(d => d.path === dictionaryPath);
    if (!dictMeta || !dictMeta.dictId) {
        emitter.emit('show-notification', { message: `Wörterbuch-Metadaten für "${dictionaryPath}" nicht gefunden.`, type: 'error' });
        return;
    }

    isPrefetching.value = true;
    prefetchProgress.value = 0;
    prefetchTotal.value = 0;
    activePrefetchController.value = new AbortController();
    const prefetchSignal = activePrefetchController.value.signal;

    emitter.emit('show-notification', { message: `Starte Audio-Download für ${dictMeta.message}...`, type: 'success', duration: 2000 });
    try {
        if (dictionaryStore.currentDictionaryPath !== dictionaryPath || dictionaryStore.masterList.length === 0) {
            await dictionaryStore.loadDictionaryIndex(dictionaryPath);
            if (dictionaryStore.dictionaryError) throw new Error(`Index konnte nicht geladen werden: ${dictionaryStore.dictionaryError}`);
        }
        const words = dictionaryStore.masterList;

        const audioUrlsToFetch = words
            .map(word => word.target?.audioUrl)
            .filter((url): url is string => !!url)
            .map(relativeUrl => `${BASE_SERVER_URL}${relativeUrl}`);

        prefetchTotal.value = audioUrlsToFetch.length;
        if (audioUrlsToFetch.length === 0) {
            emitter.emit('show-notification', { message: "Keine Audio-Dateien zum Vorladen gefunden.", type: 'success' });
            return;
        }

        const cache = await caches.open(AUDIO_CACHE_NAME);
        let completed = 0, errors = 0;
        const BATCH_SIZE = 15;
        for (let i = 0; i < audioUrlsToFetch.length; i += BATCH_SIZE) {
            if (prefetchSignal.aborted) throw new Error("Prefetch aborted by user.");
            const batch = audioUrlsToFetch.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (url) => {
                if (prefetchSignal.aborted) return { success: false };
                const cachedResponse = await cache.match(url);
                if (cachedResponse) return { success: true };
                try {
                    const response = await fetch(url, { signal: prefetchSignal });
                    if (!response.ok) {
                        if (response.status !== 404) console.warn(`Prefetch: Failed GET ${url} (${response.status})`);
                        return { success: false, error: response.status !== 404 };
                    }
                    await cache.put(url, response);
                    return { success: true };
                } catch (fetchError: any) {
                    if (fetchError.name !== 'AbortError') console.warn(`Prefetch: Network error fetching ${url}:`, fetchError.message);
                    return { success: false, error: fetchError.name !== 'AbortError' };
                }
            });
            const results = await Promise.all(batchPromises);
            if (prefetchSignal.aborted) throw new Error("Prefetch aborted by user during batch processing.");
            completed += results.length;
            errors += results.filter(r => r.error).length;
            prefetchProgress.value = Math.round((completed / prefetchTotal.value) * 100);
        }
        if (errors > 0) {
            emitter.emit('show-notification', { message: `Audio-Download abgeschlossen. ${errors} Zielsprachen-Audio(s) fehlten/nicht geladen.`, type: 'error', duration: 5000 });
        } else {
            emitter.emit('show-notification', { message: `Audio-Download der Zielsprachen-Audio für ${dictMeta.message} abgeschlossen.`, type: 'success', duration: 4000 });
        }
    } catch (error: any) {
        if (error.message?.includes("aborted")) {
            emitter.emit('show-notification', { message: "Audio-Download abgebrochen.", type: 'error' });
        } else {
            emitter.emit('show-notification', { message: `Audio-Download fehlgeschlagen: ${error.message}`, type: 'error' });
        }
    } finally {
        isPrefetching.value = false;
        if (activePrefetchController.value && prefetchSignal === activePrefetchController.value.signal) {
            activePrefetchController.value = null;
        }
        prefetchProgress.value = 0;
        prefetchTotal.value = 0;
    }
}

export function abortPrefetch() {
    if (isPrefetching.value && activePrefetchController.value) {
        activePrefetchController.value.abort('user_abort');
    }
}

// --- The Composable Hook ---
export function useAudioPlayer() {
    return {
        isPlaying: computed(() => isPlaying.value),
        currentPlaybackIdentifier: computed(() => currentPlaybackIdentifier.value),
        isPrefetching: computed(() => isPrefetching.value),
        prefetchProgress: computed(() => prefetchProgress.value),
        prefetchTotal: computed(() => prefetchTotal.value)
    };
}