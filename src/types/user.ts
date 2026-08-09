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

/**
 * A word captured on a lookup miss (e.g. while reading a book) — the raw material
 * for later enrichment into a full dictionary entry. Lives only in local storage
 * and backups until promoted by the enrichment pipeline.
 */
export interface CapturedWord {
    id: string;
    term: string;            // as encountered in the source text
    normalizedTerm: string;  // normalizeSearchText(term), for dedup and lookup marking
    context?: string;        // the sentence it appeared in
    note?: string;
    dictionaryPath: string;  // dictionary that was active at capture time
    createdAt: number;
}

/**
 * Shape of the backup ZIP's manifest.json (see stateService). capturedWords was added
 * in format 1.2; older backups simply lack the field.
 */
export interface StateExportManifest {
    exportFormatVersion: string;
    timestamp: string;
    syncVersion: number;
    userInfo: { userName: string; locale?: string };
    appSettings?: AppSettings;
    userProgress: { [dictionaryPath: string]: UserProgressMap };
    srsData: import('./srs').SrsData[];
    allMedia?: import('./components').WordMediaData[];
    mediaManifest: Array<Partial<import('./components').WordMediaData>>;
    capturedWords?: CapturedWord[];
}