export interface WordMediaData {
    id: string;
    dictionaryPath: string;
    wordId: string;
    drawingDataUrl?: string;
    imageDataUrl?: string;
    userAudioDataUrl?: string;
    userTextNote?: string;
    lastUpdated: number;
}

export interface ImageThumbnail {
    id: string;
    thumbnailDataUrl: string;
}

export type NotificationPayload = {
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
};

export type EventPayloads = {
    'show-notification': NotificationPayload;
};

export interface HandwritingCanvasInstance {
    exportDrawing: () => string;
    clearCanvas: () => void;
}

export interface AudioRecorderInstance {
    getAudioDataUrl: () => Promise<string | null>;
    clearRecording: () => void;
}