// --- File: src/services/tts.ts ---
import emitter from './emitter';

let utterance: SpeechSynthesisUtterance | null = null;

/**
 * Finds the best available voice for a given language code.
 * It prioritizes local, high-quality voices.
 * @param langCode BCP 47 language code (e.g., 'de-DE').
 * @returns The best SpeechSynthesisVoice found, or null.
 */
function findBestVoice(langCode: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const baseLang = langCode.split('-')[0];

    // 1. Perfect match (e.g., 'de-DE') with local service (highest quality)
    let bestVoice = voices.find(v => v.lang === langCode && v.localService);
    if (bestVoice) return bestVoice;

    // 2. Perfect match, any voice
    bestVoice = voices.find(v => v.lang === langCode);
    if (bestVoice) return bestVoice;

    // 3. Match base language (e.g., 'de') with local service
    bestVoice = voices.find(v => v.lang.startsWith(baseLang) && v.localService);
    if (bestVoice) return bestVoice;

    // 4. Match base language, any voice
    bestVoice = voices.find(v => v.lang.startsWith(baseLang));
    return bestVoice || null;
}

/**
 * Speaks the given text using the specified language code.
 * @param text The text to speak.
 * @param langCode BCP 47 language code (e.g., 'de-DE', 'ro-RO').
 */
export function speakText(text: string, langCode: string): void {
    if (!text || !langCode) {
        console.warn("TTS: Missing text or language code.");
        return;
    }

    if (!('speechSynthesis' in window)) {
        console.error("TTS: Speech synthesis not supported in this browser.");
        return;
    }

    if (utterance && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    // --- NEW: Tune the utterance for better quality ---
    utterance.rate = 0.9; // Slow down by 10% (default is 1.0)
    utterance.pitch = 1.0; // Keep pitch normal

    // --- NEW: Use the smarter voice selection logic ---
    const setVoice = () => {
        const voice = findBestVoice(langCode);
        if (voice) {
            utterance!.voice = voice;
            // console.log(`TTS: Using voice: ${voice.name} for lang: ${langCode}`);
        } else {
            // console.warn(`TTS: No specific voice found for ${langCode}. Using browser default.`);
        }
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        const onVoicesLoaded = () => {
            setVoice();
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesLoaded);
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesLoaded);
        // This call is sometimes needed to trigger the event on certain browsers
        window.speechSynthesis.getVoices();
    } else {
        setVoice();
    }

    utterance.onerror = (event) => {
        if (event.error === 'interrupted') {
            // console.log(`TTS: Speech for "${text}" was interrupted.`);
        } else {
            console.error("TTS: Speech synthesis error:", event.error);
            emitter.emit('show-notification', { message: `Text-to-speech error: ${event.error}`, type: 'error' });
        }
        if (utterance === event.utterance) utterance = null;
    };

    utterance.onend = (event) => {
        if (utterance === event.utterance) utterance = null;
    };

    // console.log(`TTS: Attempting to speak "${text}" (${langCode})`);
    window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
    if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
    }
    utterance = null;
}