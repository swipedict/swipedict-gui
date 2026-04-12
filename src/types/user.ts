export type UserState = 'NONE' | 'KEEP' | 'IGNORED';

export interface UserInfo {
    id?: 'currentUser';
    userName: string | null;
    locale?: string;
}

export interface AppSettings {
    syncVersion?: number; // The version number for cloud sync state
    enableCloudSync?: boolean; // User preference to enable/disable cloud sync
    initialListDisplay: 'all' | 'sourceOnly' | 'targetOnly';
    playSoundOnTap: boolean;
    revealOnTap: boolean;
    revealOnSwipe: boolean;
    preferUserAudio: boolean;
    disableTTSFallback: boolean;
    newCardsPerDay: number;
    srsQuestionSide: 'mixed' | 'source' | 'target';
    detailViewDefaultVisibility: 'all' | 'sourceOnly' | 'targetOnly';
}

// --- Persistence & Database Types (Dexie) ---
export interface CachedGlobalIndex extends import('./dictionary').GlobalIndex {
    id: 'global';
    timestamp: number;
}
export interface CachedDictionaryIndexTimestamp {
    dictionaryPath: string;
    lastKnownServerUpdate: number;
}
export type UserProgressMap = { [wordId: string]: 'KEEP' | 'IGNORED'; };

export interface CachedAppSettings {
    id: 'user';
    settings: AppSettings;
}