import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { playSoundForItem } from '@/composables/useWordAudio';
import { WordListActions } from '@/types/cardConstants';
import type { CardActionEventPayload } from '@/types/interactiveCard';
import emitter from '@/services/emitter';

/**
 * A composable that provides a centralized handler for all card actions from list views.
 * It encapsulates routing, state updates, and audio playback logic.
 * @returns An object containing the `handleCardAction` function.
 */
export function useWordActions() {
  const router = useRouter();
  const appStore = useAppStore();
  const dictionaryStore = useDictionaryStore();

  /**
   * Processes a card action event.
   * @param payload The event payload from the card interaction.
   * @param getCardRef A function to retrieve the ManagedWordCard component instance by its ID.
   * @param onStateChange A callback function to be executed after a state change (e.g., to remove an item from a local list).
   */
  const handleCardAction = async (
    payload: CardActionEventPayload,
    getCardRef: (id: string) => any,
    onStateChange?: (wordId: string, newState: 'KEEP' | 'IGNORED') => void
  ) => {
    const { action, wordId, interactionType } = payload;
    const wordItem = dictionaryStore.masterList.find(w => w.id === wordId);

    if (!appStore.isUserRegistered) {
      emitter.emit('show-notification', { message: 'Bitte registrieren Sie sich, um Ihren Fortschritt zu speichern.', type: 'error' });
      router.push({ name: 'register', query: { redirect: router.currentRoute.value.fullPath } });
      return;
    }

    if (!wordItem) {
      console.error(`useWordActions: Could not find wordItem with ID ${wordId}`);
      return;
    }

    const cardRef = getCardRef(wordId);

    switch (action) {
      case WordListActions.GOTO_DETAILS:
        if (cardRef) cardRef.resetSwipeState(true);
        router.push({ name: 'detail', params: { dictionaryPath: wordItem.metadata.dictionaryPath!, wordId: wordId } });
        break;

      case WordListActions.MARK_IGNORED:
        if (cardRef) cardRef.resetSwipeState(true);
        await dictionaryStore.updateWordState({ id: wordId, newState: 'IGNORED' });
        onStateChange?.(wordId, 'IGNORED');
        break;
        
      case WordListActions.MARK_KEEP:
        if (cardRef) cardRef.resetSwipeState(true);
        await dictionaryStore.updateWordState({ id: wordId, newState: 'KEEP' });
        onStateChange?.(wordId, 'KEEP');
        break;

      case WordListActions.PLAY_SOUND_TARGET:
        await playSoundForItem(wordItem, 'target', 'word-list-view');
        break;
    }
  };

  return { handleCardAction };
}