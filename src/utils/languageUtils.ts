/**
 * Converts a simple language code (e.g., 'en', 'de') to a more specific
 * BCP 47 language code often preferred by Text-to-Speech engines or other APIs.
 * Adds common region codes. This is a basic mapping and might need expansion.
 *
 * Example: getLanguageCode('de') -> 'de-DE'
 * Example: getLanguageCode('en') -> 'en-US'
 * Example: getLanguageCode('ro') -> 'ro-RO'
 * Example: getLanguageCode('es-MX') -> 'es-MX' (passes through existing BCP 47)
 * Example: getLanguageCode('xx') -> null
 *
 * @param simpleCode The simple language code (e.g., 'de', 'en', 'ro', 'es', 'pl').
 * @returns The BCP 47 code (e.g., 'de-DE') or null if no mapping is found or input is invalid.
 */
export function getLanguageCode(simpleCode: string | undefined | null): string | null {
    if (!simpleCode) {
        console.warn("getLanguageCode: Received invalid input:", simpleCode);
        return null;
    }

    const code = simpleCode.toLowerCase().trim();

    // Check if it already looks like a valid BCP 47 code (e.g., 'en-US', 'de-DE')
    // This regex is basic, checks for lang-REGION format primarily.
    if (/^[a-z]{2,3}(-[a-z]{2,4})?$/i.test(code)) {
        // If it has a region/script tag, return it as is.
        // If it's just 'de', 'en', etc., it will fall through to the mapping.
        if (code.includes('-')) {
             return code;
        }
    }

    // Basic mappings (add more as needed for your dictionaries)
    // Prioritize common default regions.
    const mapping: { [key: string]: string } = {
        'de': 'de-DE',
        'en': 'en-US', // Defaulting to US, could be 'en-GB'
        'ro': 'ro-RO',
        'es': 'es-ES', // Defaulting to Spain, could be 'es-MX'
        'fr': 'fr-FR',
        'it': 'it-IT',
        'pl': 'pl-PL',
        'pt': 'pt-PT', // Defaulting to Portugal, could be 'pt-BR'
        'ru': 'ru-RU',
        'zh': 'zh-CN', // Defaulting to Mainland China Mandarin
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        // Add other languages supported by your dictionaries/TTS engines
    };

    const mappedCode = mapping[code];

    if (!mappedCode) {
        console.warn(`getLanguageCode: No specific BCP 47 mapping found for simple code "${code}". Returning null.`);
        return null;
    }

    return mappedCode;
}
