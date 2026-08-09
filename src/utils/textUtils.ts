/**
 * Normalizes a string for searching by converting to lowercase,
 * replacing common German umlauts and ligatures, and removing diacritics.
 * Also handles common Romanian diacritic replacements.
 * @param text The text to normalize.
 * @returns The normalized string.
 */
export function normalizeSearchText(text: string | undefined | null): string {
    if (!text) return '';
    return text
        .toLowerCase()
        // Specific replacements first (e.g., common transcriptions or fixed rules)
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        // Romanian specific common variants before general NFD to catch them if typed this way
        .replace(/ă/g, 'a') 
        .replace(/â/g, 'a')
        .replace(/î/g, 'i')
        .replace(/ș/g, 's') // s with comma below
        .replace(/ş/g, 's') // s with cedilla (often mistyped for ș)
        .replace(/ț/g, 't') // t with comma below
        .replace(/ţ/g, 't') // t with cedilla (often mistyped for ț)
        // Normalize to decompose combined diacritical marks into base character + mark
        .normalize("NFD")
        // Remove the diacritical marks (Unicode range for common combining diacritics)
        .replace(/[\u0300-\u036f]/g, "")
        .trim(); // Trim leading/trailing whitespace
}

/**
 * Common Romanian inflection endings, longest first so the most specific wins.
 * Operates on ALREADY-NORMALIZED text (see normalizeSearchText \u2014 diacritics folded).
 * Covers definite articles (-ul/-ului/-lor\u2026), plurals (-i/-e/-uri\u2026) and frequent
 * verb endings (-ase/-eaza/-and\u2026). This is a heuristic, not a lemmatizer: forms with
 * stem vowel alternation (frumoas\u0103\u2192frumos) are out of scope.
 */
const RO_INFLECTION_SUFFIXES = [
    'urilor', 'urile', 'ilor', 'elor', 'ului', 'iile',
    'eaza', 'este', 'esti', 'indu', 'andu', 'sera',
    'lui', 'uri', 'ule', 'ase', 'ise', 'use', 'and', 'ind', 'eze', 'ati', 'eti', 'ele', 'ile',
    'ii', 'ul', 'le', 'ei', 'ez', 'am', 'ai', 'au', 'ea', 'ia', 'ie',
    'a', 'e', 'i', 'u',
];

/**
 * Strips one Romanian inflection suffix from a normalized word, keeping a stem of at
 * least 3 characters. Returns the input unchanged when nothing safely strips.
 * Used by the lookup view to match inflected book forms ("cainelui", "plecase")
 * against citation-form headwords ("caine", "a pleca").
 */
export function stripRomanianInflection(normalized: string): string {
    for (const suffix of RO_INFLECTION_SUFFIXES) {
        if (normalized.length - suffix.length >= 3 && normalized.endsWith(suffix)) {
            return normalized.slice(0, -suffix.length);
        }
    }
    return normalized;
}

/**
 * Removes the infinitive marker from a normalized Romanian verb headword:
 * "a pleca" \u2192 "pleca", "a se spala" \u2192 "spala", "a-si aminti" \u2192 "aminti".
 * Non-verb headwords pass through unchanged.
 */
export function stripRomanianVerbMarker(normalized: string): string {
    return normalized.replace(/^a[- ](?:se |si |i )?/, '');
}