/**
 * Canonical constructor for SrsData.uniqueId. Every lookup and write into the srsData table
 * keys on this format — build it here and nowhere else, so the convention cannot drift.
 */
export function srsUniqueId(dictionaryPath: string, wordId: string): string {
    return `${dictionaryPath}_${wordId}`;
}

export interface SrsData {
    uniqueId: string;
    dictionaryPath: string;
    wordId: string;
    nextReviewDate: number;
    interval: number;
    easeFactor: number;
    lapses: number;
    state: 'new' | 'learning' | 'review' | 'lapsed';
    learningStep: number;
    lastReviewDate?: number;
    /** Set once `lapses` reaches LEECH_THRESHOLD. Not indexed — no Dexie migration needed. */
    isLeech?: boolean;
}
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';