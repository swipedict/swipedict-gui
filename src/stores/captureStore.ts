import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CapturedWord } from '@/types';
import { saveCapturedWord, deleteCapturedWord, getAllCapturedWords } from '@/services/db';
import { normalizeSearchText } from '@/utils/textUtils';

/**
 * The capture inbox: words that missed in lookup, saved with their book context so
 * reading is never interrupted. Enriched into full dictionary entries later.
 */
export const useCaptureStore = defineStore('capture', () => {
    const capturedWords = ref<CapturedWord[]>([]);
    const isLoaded = ref(false);

    const captureCount = computed(() => capturedWords.value.length);

    const normalizedTerms = computed(() => new Set(capturedWords.value.map(w => w.normalizedTerm)));

    async function loadCapturedWords() {
        capturedWords.value = await getAllCapturedWords();
        isLoaded.value = true;
    }

    function isCaptured(term: string): boolean {
        return normalizedTerms.value.has(normalizeSearchText(term));
    }

    async function capture(payload: { term: string; context?: string; note?: string; dictionaryPath: string }): Promise<CapturedWord> {
        const word: CapturedWord = {
            id: crypto.randomUUID(),
            term: payload.term.trim(),
            normalizedTerm: normalizeSearchText(payload.term),
            context: payload.context?.trim() || undefined,
            note: payload.note?.trim() || undefined,
            dictionaryPath: payload.dictionaryPath,
            createdAt: Date.now(),
        };
        await saveCapturedWord(word);
        capturedWords.value = [word, ...capturedWords.value];
        return word;
    }

    async function remove(id: string) {
        await deleteCapturedWord(id);
        capturedWords.value = capturedWords.value.filter(w => w.id !== id);
    }

    /** Serializes the inbox for download — the input format of the enrichment pipeline. */
    function exportAsJson(): string {
        return JSON.stringify({ exportedAt: new Date().toISOString(), words: capturedWords.value }, null, 2);
    }

    return { capturedWords, isLoaded, captureCount, loadCapturedWords, isCaptured, capture, remove, exportAsJson };
});
