// --- Configuration for the SRS Algorithm ---

/** The absolute minimum ease factor a card can have. */
export const MIN_EASE_FACTOR = 1.3;

/** The default ease factor assigned to new cards. */
export const INITIAL_EASE_FACTOR = 2.5;

/** The sequence of intervals (in minutes) for cards in the initial learning phase. */
export const LEARNING_STEPS_MINUTES = [1, 10];

/** The first interval (in days) assigned to a card after it graduates from the learning phase. */
export const INITIAL_INTERVAL_DAYS = 1;

/** A multiplier applied to the interval when a card is rated "Easy". */
export const EASY_BONUS = 1.3;

/** A multiplier applied to the interval when a card is rated "Hard". */
export const HARD_PENALTY = 0.8;

/** The interval (in days) at which a card is considered "mature". */
export const MATURE_INTERVAL_DAYS = 21;

/**
 * Number of lapses after which a card is flagged as a "leech" — a word that keeps being
 * forgotten and is soaking up review time. Matches Anki's default threshold.
 *
 * Flagging is deliberately non-destructive: the card is NOT suspended, because there is no
 * UI to bring a suspended card back. It is surfaced in the learning summary so the user can
 * act on it (add a drawing, image or mnemonic from the detail view).
 */
export const LEECH_THRESHOLD = 8;