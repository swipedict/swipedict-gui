import type { WordEntry, SrsData, UserState } from '@/types';
import type { InjectionKey, ComputedRef } from 'vue';

export type CardInteractionType = 'tap' | 'swipe-left' | 'swipe-right' | 'long-press' | 'context-menu'; // Added new types

// --- INJECTION KEYS ---
export const WordItemInjectionKey: InjectionKey<ComputedRef<WordEntry>> = Symbol('wordItem');
export const IsInSrsInjectionKey: InjectionKey<ComputedRef<boolean>> = Symbol('isInSrs');

// Props that ANY card face component might receive from ManagedWordCard
export interface BaseFaceComponentProps {
  // wordItem is now provided/injected
  srsData?: SrsData; // For SRS cards
  displayMode?: 'all' | 'sourceOnly' | 'targetOnly';
  isCardDragging?: boolean; // Visual feedback for drag
  justTappedCard?: boolean; // For tap-reveal logic
  diffXWhileDragging?: number; // For visual feedback during drag
  isLoadingHint?: boolean; // If a hint is being loaded
  hintUrl?: string | null; // URL for a visual hint (drawing/image)
  thumbnailUrl?: string | null;
  questionSide?: 'sourceOnly' | 'targetOnly'; // For SRS question face
}

// Describes a specific face to be rendered (e.g., default, hint, SRS answer)
// The `componentName` could be used with Vue's dynamic <component :is="...">
// Or `faceType` could be used in v-if/v-else-if within ManagedWordCard's template.
export interface CardFaceConfig {
  id: string; // Unique ID for this face instance (e.g., `wordId_default`, `wordId_hint`)
  faceType: string; // e.g., 'WordListDefault', 'SrsQuestion', 'SrsAnswer', 'ImageHint'
  props: BaseFaceComponentProps; // Props to pass to the actual face rendering component/template
}

// Maps user interactions on a specific face to logical action names
export interface FaceInteractionConfig {
  tap?: string;          // Action name for tap
  swipeLeft?: string;    // Action name for swipe left
  swipeRight?: string;   // Action name for swipe right
  longPress?: string;    // Action name for long press
  contextMenu?: string;  // Action name for context menu
}

// Payload for when an interaction is initiated on the card shell
export interface InteractionRequestPayload {
  cardId: string; // The ID of the WordEntry or SrsData uniqueId
  originatingFaceId: string; // The `id` from CardFaceConfig
  interactionType: CardInteractionType;
  actionName?: string; // The logical action triggered (from FaceInteractionConfig)
  interactionDetail?: any; // e.g., SrsRating for a rating action
  diffX?: number; // For swipe physics if needed by handler
}

// --- CARD MANAGER TYPES (NEW) ---

// Defines the structure of the props that ManagedWordCard will accept
export interface ManagedCardProps {
  wordItem: WordEntry;
  srsData?: SrsData; // Optional, for SRS cards
  // Configuration for how different faces should behave and what actions they trigger.
  // The key is the `faceType` (e.g., 'WordListDefault', 'SrsQuestion').
  faceBehaviorConfig: Record<string, {
    interactions: FaceInteractionConfig;
    // Potentially other behavior flags for this face type
  }>;
  initialFaceType?: string; // Which faceType to show initially
}

// --- Emits from ManagedWordCard ---
export interface CardActionEventPayload {
  action: string; // The logical action name (e.g., 'MARK_IGNORED', 'GOTO_DETAILS')
  wordId: string;
  srsUniqueId?: string;
  details?: any; // e.g., SrsRating
  interactionType?: CardInteractionType; // Pass original interaction type for context
}

export interface CardHintRequestPayload {
  wordId: string;
  hintType: 'drawing' | 'image'; // Specify what kind of hint is needed
}

// Represents the state managed internally by ManagedWordCard
export interface InternalCardUiState {
  currentFaceType: string;
  isLoadingHint: boolean;
  hintUrl: string | null;
  thumbnailUrl: string | null;
  justTappedForReveal: boolean;
  isPhysicallyFlipped: boolean; // For 3D flip animation
  // Visual drag state (passed down to InteractiveCardShell if needed for face rendering)
  isShellDragging: boolean;
  shellDiffX: number;
}

// --- End CARD MANAGER TYPES ---

// Old types kept for reference or if still used by InteractiveCardShell directly
// May be refactored or removed if ManagedWordCard fully abstracts them.
export interface CardFace { // This might be superseded by CardFaceConfig
  id: string;
  props: BaseFaceComponentProps & { [key: string]: any; }; // Allow arbitrary extra props for now
}

export interface FaceInteractionMap { // This might be superseded by FaceInteractionConfig
  tap?: string;
  swipeLeft?: string;
  swipeRight?: string;
}