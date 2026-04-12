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