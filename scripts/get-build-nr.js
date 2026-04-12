/**
 * SwipeDict Build ID Generator
 * 
 * Generates a unique, human-friendly, time-based build ID.
 * The ID is created by calculating seconds since a custom epoch and encoding
 * that number into a custom Base34 string (0-9, A-Z, excluding I and O).
 */

// --- Configuration (self-contained within this module) ---
const EPOCH = new Date('2025-01-01T00:00:00Z').getTime();
const CUSTOM_ALPHABET = '023456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const BASE = CUSTOM_ALPHABET.length;

/**
 * Encodes a number into a custom base string.
 * @param {number} num - The number to encode.
 * @returns {string} The encoded string.
 */
function toCustomBase(num) {
    if (num === 0) {
        return CUSTOM_ALPHABET[0];
    }
    let result = '';
    while (num > 0) {
        result = CUSTOM_ALPHABET[num % BASE] + result;
        num = Math.floor(num / BASE);
    }
    return result;
}

/**
 * Generates and returns a unique build ID based on the current time.
 * @returns {string} The generated build ID.
 */
export function generateBuildId() {
    const now = new Date().getTime();
    const secondsSinceEpoch = Math.floor((now - EPOCH) / 1000);
    return toCustomBase(secondsSinceEpoch);
}