import { useAppStore } from '@/stores/appStore';
import { API_ENDPOINT } from '@/config';
import emitter from '@/services/emitter';

export type FeedbackType = 'correction' | 'proposal';

interface BasePayload {
    dictionaryPath: string;
}

export interface CorrectionPayload extends BasePayload {
    type: 'correction';
    wordId: string;
    correctionData: string | null; // The diff string
    notes: string;
}

export interface ProposalPayload extends BasePayload {
    type: 'proposal';
    sourceText: string;
    targetText: string;
    notes: string;
}

export type FeedbackPayload = CorrectionPayload | ProposalPayload;

/**
 * Submits feedback (either a correction or a new word proposal) to the backend.
 * @param payload The data for the feedback submission.
 * @returns A promise that resolves to an object indicating success and a message.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<{ success: boolean; message: string }> {
    const appStore = useAppStore();

    if (!appStore.isUserRegistered) {
        return { success: false, message: 'User is not registered.' };
    }

    // Find the relevant dictionary meta to get the feedback email
    const dictionaryMeta = appStore.availableDictionaries.find(d => d.path === payload.dictionaryPath);
    const feedbackEmail = dictionaryMeta?.feedback;

    // This is the JSON object that will be sent to the PHP script.
    const apiPayload: any = {
        action: 'submitFeedback', // A single, unified action for the backend
        type: payload.type,
        dictionaryPath: payload.dictionaryPath,
        username: appStore.userName || 'anonymous',
        data: {} as any, // The data specific to the feedback type
    };

    // Add the feedback email if it exists for this dictionary
    if (feedbackEmail) {
        apiPayload.feedbackEmail = feedbackEmail;
    }

    if (payload.type === 'correction') {
        apiPayload.data = {
            wordId: payload.wordId,
            correctionData: payload.correctionData,
            notes: payload.notes,
        };
    } else if (payload.type === 'proposal') {
        apiPayload.data = {
            sourceText: payload.sourceText,
            targetText: payload.targetText,
            notes: payload.notes,
        };
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload)
        });

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error(`Server returned invalid JSON (HTTP ${response.status}).`);
        }

        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Server returned an error.');
        }
        
        emitter.emit('show-notification', { message: 'Vielen Dank für Ihren Vorschlag!', type: 'success' });
        return { success: true, message: result.message };

    } catch (error: any) {
        console.error("FeedbackService Error:", error);
        emitter.emit('show-notification', { message: `Fehler beim Senden des Feedbacks: ${error.message}`, type: 'error' });
        return { success: false, message: error.message };
    }
}