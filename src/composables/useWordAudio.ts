import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import { playAudio as audioServicePlay } from '@/composables/useAudioPlayer';
import type { WordEntry } from '@/types';

/**
 * A composable function that provides a centralized method for playing audio for a word entry.
 * It handles logic for user-recorded audio, official audio files, and TTS fallback.
 * @param wordItem The WordEntry object for which to play audio.
 * @param type The side of the card to play ('source' or 'target').
 * @param context A unique string identifier for the calling context (e.g., 'explore-list', 'srs-view') to prevent audio conflicts.
 */
export async function playSoundForItem(wordItem: WordEntry, type: 'source' | 'target' = 'target', context: string) {
    if (!wordItem) return;
    
    const appStore = useAppStore();
    const settingsStore = useSettingsStore();
    const customMediaStore = useCustomMediaStore();
    const dictMeta = appStore.selectedDictionary;

    if (!dictMeta?.path) return;

    // Select the correct side (source or target) of the word entry from the index data.
    const sideData = (type === 'source' ? wordItem.source : wordItem.target);
    const langSimple = (type === 'source' ? wordItem.sourceLanguage : wordItem.targetLanguage) || dictMeta.type.split('-')[type === 'source' ? 0 : 1];
    
    // --- THIS IS THE FINAL, CORRECTED LOGIC ---
    // The index now provides the full root-relative URL directly in the `audioUrl` field.
    const conventionalUrlPath = sideData?.audioUrl;
    
    // Ensure we have the necessary data to proceed.
    // We only need headword and lang for the TTS fallback.
    if (!sideData?.headword || !langSimple) {
        console.warn("playSoundForItem: Missing required data to play audio.", { sideData, langSimple });
        return;
    }
    
    let userAudioDataUrl: string | undefined = undefined;
    // Check for and prefer user's personal audio recording if the setting is enabled.
    if (settingsStore.settings.preferUserAudio && type === 'target') {
        const media = await customMediaStore.getOrFetchMedia(dictMeta.path, wordItem.id);
        userAudioDataUrl = media?.userAudioDataUrl;
    }
    
    audioServicePlay('headword', {
        userAudioDataUrl: userAudioDataUrl,
        sourceUrl: conventionalUrlPath, // This is now the root-relative path, e.g., "/media/audio/ro/a-vira-v1.opus" or undefined
        identifier: `headword-${wordItem.id}-${langSimple}-${context}`,
        textToSpeak: sideData.headword,
        langCode: langSimple,
        disableTTSFallback: settingsStore.settings.disableTTSFallback,
        dictionaryPath: dictMeta.path,
        wordId: wordItem.id
    });
}