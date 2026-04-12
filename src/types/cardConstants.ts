// Standard Face Types for consistency across different card manifestations
export const FaceType = {
  WORD_LIST_DEFAULT: 'WordListDefault',
  EXPLORE_DEFAULT: 'ExploreDefault', // Can be same as WordListDefault or have minor variations
  HINT_DRAWING: 'HintDrawing',
  HINT_IMAGE: 'HintImage',
  SRS_QUESTION: 'SrsQuestion',
  SRS_ANSWER: 'SrsAnswer',
} as const;
export type FaceTypeKey = typeof FaceType[keyof typeof FaceType];

// Standard Action Names for dictionaryList cards
export const WordListActions = {
  GOTO_DETAILS: 'GOTO_DETAILS',
  MARK_IGNORED: 'MARK_IGNORED',
  MARK_KEEP: 'MARK_KEEP',
  TOGGLE_HINT_DRAWING: 'TOGGLE_HINT_DRAWING',
  TOGGLE_HINT_IMAGE: 'TOGGLE_HINT_IMAGE',
  TAP_REVEAL: 'TAP_REVEAL',
  PLAY_SOUND_TARGET: 'PLAY_SOUND_TARGET',
  PLAY_SOUND_SOURCE: 'PLAY_SOUND_SOURCE',
} as const;
export type WordListActionKey = typeof WordListActions[keyof typeof WordListActions];

// Standard Action Names for SRS cards
export const SrsActions = {
  SHOW_HINT_DRAWING: 'SHOW_HINT_DRAWING',
  SHOW_HINT_IMAGE: 'SHOW_HINT_IMAGE',
  PLAY_SOUND_QUESTION_SOURCE: 'PLAY_SOUND_QUESTION_SOURCE',
  PLAY_SOUND_QUESTION_TARGET: 'PLAY_SOUND_QUESTION_TARGET',
  SHOW_ANSWER: 'SHOW_ANSWER',
  GOTO_QUESTION_INITIAL: 'GOTO_QUESTION_INITIAL',
  FLIP_TO_QUESTION_INITIAL: 'FLIP_TO_QUESTION_INITIAL',
  GOTO_DETAILS_SRS: 'GOTO_DETAILS_SRS',
  PLAY_SOUND_ANSWER_TARGET: 'PLAY_SOUND_ANSWER_TARGET',
  PLAY_SOUND_ANSWER_SOURCE: 'PLAY_SOUND_ANSWER_SOURCE',
  RATE_CARD: 'RATE_CARD',
} as const;
export type SrsActionKey = typeof SrsActions[keyof typeof SrsActions];