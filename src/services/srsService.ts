import { db, getSrsData, saveSrsData, type SrsData } from './db';
import {
    MIN_EASE_FACTOR,
    INITIAL_EASE_FACTOR,
    LEARNING_STEPS_MINUTES,
    INITIAL_INTERVAL_DAYS,
    EASY_BONUS,
    HARD_PENALTY
} from './srsConstants';

// --- Helper Functions ---
const MIN_TO_MS = 60 * 1000;
const DAY_TO_MS = 24 * 60 * MIN_TO_MS;

function calculateNextReviewTime(intervalDays: number): number {
    const now = Date.now();
    // Add some fuzziness to avoid cards clumping up exactly 24 hours later
    const fuzz = Math.random() * 0.1 * DAY_TO_MS; // +/- 5%
    // Ensure next review is at least a few minutes in the future even for short intervals
    const minFutureOffset = 5 * MIN_TO_MS;
    return Math.max(now + minFutureOffset, now + intervalDays * DAY_TO_MS + fuzz);
}

function calculateNextLearningStepTime(stepMinutes: number): number {
    const now = Date.now();
     const fuzz = Math.random() * 0.1 * MIN_TO_MS; // +/- 5% for minutes
     const minFutureOffset = 30 * 1000; // At least 30s in future
    return Math.max(now + minFutureOffset, now + stepMinutes * MIN_TO_MS + fuzz);
}

// --- Core SRS Calculation ---

/**
 * Calculates the next SRS state based on the current state and user rating.
 * @param currentData The current SrsData for the card.
 * @param rating The user's performance rating.
 * @returns The updated SrsData object.
 */
function calculateNextSrsState(currentData: SrsData, rating: 'again' | 'hard' | 'good' | 'easy'): SrsData {
    const now = Date.now();
    const newData: SrsData = { ...currentData, lastReviewDate: now }; // Copy and update last review

    // Ensure interval and easeFactor are numbers, providing defaults if necessary
    newData.interval = typeof newData.interval === 'number' ? newData.interval : 0;
    newData.easeFactor = typeof newData.easeFactor === 'number' ? INITIAL_EASE_FACTOR : newData.easeFactor;
    newData.lapses = typeof newData.lapses === 'number' ? newData.lapses : 0;
    newData.learningStep = typeof newData.learningStep === 'number' ? newData.learningStep : 0;


    // --- Learning Phase ('new', 'learning', 'lapsed') ---
    if (newData.state === 'new' || newData.state === 'learning' || newData.state === 'lapsed') {
        if (rating === 'again') {
            // Restart learning steps
            newData.learningStep = 0;
            newData.lapses++; // Increment lapses
            newData.state = 'lapsed'; // Mark as lapsed/relearning
            newData.nextReviewDate = calculateNextLearningStepTime(LEARNING_STEPS_MINUTES[0]);
            // Reduce ease factor on lapse
            newData.easeFactor = Math.max(MIN_EASE_FACTOR, newData.easeFactor - 0.2);
        } else if (rating === 'good' || rating === 'easy' || rating === 'hard') { // Treat 'hard' like 'good' in learning phase for simplicity
            newData.learningStep++;
            if (newData.learningStep >= LEARNING_STEPS_MINUTES.length) {
                // Graduate!
                newData.state = 'review';
                newData.interval = INITIAL_INTERVAL_DAYS; // Set initial interval
                // Adjust ease slightly based on graduation rating
                if (rating === 'easy') newData.easeFactor += 0.15;
                if (rating === 'hard') newData.easeFactor -= 0.10; // Slight penalty if graduated with hard
                newData.easeFactor = Math.max(MIN_EASE_FACTOR, newData.easeFactor); // Ensure ease doesn't drop too low
                newData.nextReviewDate = calculateNextReviewTime(newData.interval);
            } else {
                // Advance to next learning step
                newData.state = 'learning';
                newData.nextReviewDate = calculateNextLearningStepTime(LEARNING_STEPS_MINUTES[newData.learningStep]);
            }
        }
    }
    // --- Review Phase ---
    else if (newData.state === 'review') {
        let easeMultiplier = 1.0;
        let easeAdjustment = 0;

        if (rating === 'again') {
            newData.state = 'lapsed'; // Enter relearning/lapse state
            newData.lapses++;
            newData.easeFactor = Math.max(MIN_EASE_FACTOR, newData.easeFactor - 0.20);
            newData.interval = 0; // Reset interval for learning steps
            newData.learningStep = 0;
            newData.nextReviewDate = calculateNextLearningStepTime(LEARNING_STEPS_MINUTES[0]);
        } else {
            // Calculate ease adjustment based on rating
            if (rating === 'hard') {
                easeAdjustment = -0.15;
            } else if (rating === 'good') {
                easeAdjustment = 0; // No change for good
            } else { // rating === 'easy'
                easeAdjustment = 0.15;
            }
            newData.easeFactor = Math.max(MIN_EASE_FACTOR, newData.easeFactor + easeAdjustment);

            // Calculate next interval based on previous interval, ease, and potentially bonus for easy/penalty for hard
             if (rating === 'hard') {
                 // Next interval is slightly longer than previous, but less than 'good'
                 newData.interval = Math.max(newData.interval + 1, newData.interval * 1.2); // SM-2 hard interval
             } else if (rating === 'good') {
                 newData.interval = Math.max(newData.interval + 1, newData.interval * newData.easeFactor);
             } else { // Easy
                 newData.interval = Math.max(newData.interval + 1, newData.interval * newData.easeFactor * EASY_BONUS);
             }

            newData.nextReviewDate = calculateNextReviewTime(newData.interval);
            newData.state = 'review'; // Stay in review state
        }
    } else {
        // Handle unexpected state? Maybe treat as 'new'
        console.warn(`SRS Service: Unexpected card state '${newData.state}' for ${newData.uniqueId}. Treating as 'new'.`);
        newData.state = 'new';
        newData.learningStep = 0;
        newData.nextReviewDate = now;
        return calculateNextSrsState(newData, rating); // Recalculate based on 'new' state
    }

    // Round interval for storage/display if desired (e.g., to 2 decimal places)
    newData.interval = Math.round(newData.interval * 100) / 100;

    return newData;
}


// --- Public Service Functions ---

/**
 * Creates initial SRS data for a word newly marked as KEEP.
 */
export function createInitialSrsData(dictionaryPath: string, wordId: string): SrsData {
    const now = Date.now();
    const uniqueId = `${dictionaryPath}_${wordId}`;
    return {
        uniqueId,
        dictionaryPath,
        wordId,
        nextReviewDate: now, // Due immediately for the first learning step
        interval: 0, // Interval starts at 0 for learning phase
        easeFactor: INITIAL_EASE_FACTOR,
        lapses: 0,
        state: 'new',
        learningStep: 0,
        lastReviewDate: undefined
    };
}


/**
 * Processes a user's answer/rating for an SRS card and updates its data.
 * @param dictionaryPath Path of the dictionary.
 * @param wordId ID of the word.
 * @param rating User's rating for the card.
 */
export async function answerCard(dictionaryPath: string, wordId: string, rating: 'again' | 'hard' | 'good' | 'easy'): Promise<SrsData> {
    const uniqueId = `${dictionaryPath}_${wordId}`;
    let currentData = await getSrsData(uniqueId);

    if (!currentData) {
        console.warn(`SRS Service: No existing SRS data found for ${uniqueId} during rating. Creating initial.`);
        // This might happen if somehow a card is reviewed before being marked KEEP,
        // or if the initial creation failed. Create it now.
        currentData = createInitialSrsData(dictionaryPath, wordId);
        // Ensure it's due now if it was just created
        currentData.nextReviewDate = Date.now();
    }

    const updatedData = calculateNextSrsState(currentData, rating);
    await saveSrsData(updatedData);
    console.log(`SRS Service: Updated card ${uniqueId}. Rating: ${rating}, New State: ${updatedData.state}, Interval: ${updatedData.interval.toFixed(2)}d, Next Review: ${new Date(updatedData.nextReviewDate).toLocaleString()}`);
    return updatedData; // Return the updated data
}

/**
 * Retrieves SRS cards due for review for a given dictionary.
 * (Currently just a wrapper around the DB function, could add more logic later).
 */
export async function getDueCardsForSession(dictionaryPath: string, now: number = Date.now()): Promise<SrsData[]> {
    // Potentially add limits or mixing logic here later
    return await db.getDueSrsCards(dictionaryPath, now);
}