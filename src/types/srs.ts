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
}
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';