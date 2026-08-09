import Dexie, { type Table } from 'dexie';
import type {
    GlobalIndex, CachedGlobalIndex, CachedDictionaryIndexTimestamp,
    UserProgressMap, WordMediaData, UserInfo, AppSettings, CachedAppSettings,
    SrsData, ImageThumbnail, DictionaryIndexContent
} from '@/types';
import { srsUniqueId } from '@/types';
import { clearAudioCache } from '@/composables/useAudioPlayer';

export interface CachedDictionaryIndex {
    path: string; // The dictionary path acts as the primary key
    content: DictionaryIndexContent;
    fetchedAt: number;
}

const DB_VERSION = 1;

// Helper function for our simple dirty flag, called automatically by the middleware.
function markSessionAsDirty() {
    localStorage.setItem('hasUnsyncedChanges', 'true');
}

export class SwipeDictDexie extends Dexie {
  // --- Table Definitions ---
  globalDictionaries!: Table <CachedGlobalIndex, 'global'>;
  dictionaryIndexTimestamps!: Table<CachedDictionaryIndexTimestamp, string>; 
  userProgress!: Table<{ dictionaryPath: string; progress: UserProgressMap }, string>;
  wordMedia!: Table<WordMediaData, string>; 
  userSettings!: Table<CachedAppSettings, 'user'>;
  userInfo!: Table<UserInfo & { id: 'currentUser' }, 'currentUser'>;
  srsData!: Table<SrsData, string>; 
  introducedToday!: Table<{ uniqueId: string; dateIntroduced: string }, string>;
  imageThumbnails!: Table<ImageThumbnail, string>;
  cachedIndexes!: Table<CachedDictionaryIndex, string>;

  constructor() {
    super('SwipeDictDB_v4');
    
    this.version(DB_VERSION).stores({
      globalDictionaries: 'id',
      dictionaryIndexTimestamps: 'dictionaryPath',
      userProgress: 'dictionaryPath',
      wordMedia: 'id, dictionaryPath, wordId',
      userSettings: 'id',
      userInfo: 'id',
      srsData: '&uniqueId, dictionaryPath, wordId, nextReviewDate, state',
      introducedToday: '&uniqueId, dateIntroduced',
      imageThumbnails: 'id',
      cachedIndexes: 'path',
    });
  }
}

export const db = new SwipeDictDexie();

db.use({
  stack: "dbcore",
  name: "DirtyStateTracker",
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      mutate: (req) => {
        const tablesToTrack = new Set(['userProgress', 'wordMedia', 'userSettings', 'srsData']);
        if (tablesToTrack.has(req.table)) {
          if (req.type === 'put' || req.type === 'add' || req.type === 'delete') {
            markSessionAsDirty();
          }
        }
        return downlevelDatabase.mutate(req);
      },
    };
  },
});


// --- User Info & App Settings ---

export async function getUserInfo(): Promise<UserInfo | undefined> {
    const result = await db.userInfo.get('currentUser');
    if (result) {
        const { id, ...userInfo } = result;
        return userInfo as UserInfo;
    }
    return undefined;
}
export async function saveUserInfo(userInfo: UserInfo): Promise<void> { await db.userInfo.put({ ...userInfo, id: 'currentUser' }); }
export async function deleteUserInfo(): Promise<void> { await db.userInfo.delete('currentUser'); }
export async function getAppSettings(): Promise<AppSettings | undefined> { return (await db.userSettings.get('user'))?.settings; }
export async function saveAppSettings(settings: AppSettings): Promise<void> {
    await db.userSettings.put({ id: 'user', settings });
}

// --- Dictionary Index Caching ---

export async function getCachedGlobalDicts(): Promise<CachedGlobalIndex | undefined> { return await db.globalDictionaries.get('global'); }
export async function cacheGlobalDicts(indexData: GlobalIndex): Promise<void> {
    const payloadToCache: CachedGlobalIndex = {
        id: 'global',
        ...JSON.parse(JSON.stringify(indexData)),
        timestamp: Date.now()
    };
    await db.globalDictionaries.put(payloadToCache);
}
export async function getCachedDictionaryIndex(path: string): Promise<CachedDictionaryIndex | undefined> {
    return await db.cachedIndexes.get(path);
}
export async function cacheDictionaryIndex(path: string, content: DictionaryIndexContent): Promise<void> {
    await db.cachedIndexes.put({ path, content, fetchedAt: Date.now() });
}
export async function getDictionaryIndexTimestamp(dictionaryPath: string): Promise<CachedDictionaryIndexTimestamp | undefined> { return await db.dictionaryIndexTimestamps.get(dictionaryPath); }
export async function cacheDictionaryIndexTimestamp(dictionaryPath: string, serverLastUpdateTimestamp: number): Promise<void> { await db.dictionaryIndexTimestamps.put({ dictionaryPath, lastKnownServerUpdate: serverLastUpdateTimestamp }); }

// --- User Progress ---

export async function getProgressForDictionary(dictionaryPath: string): Promise<UserProgressMap> { return (await db.userProgress.get(dictionaryPath))?.progress || {}; }
export async function saveProgressForDictionary(dictionaryPath: string, progress: UserProgressMap): Promise<void> {
    if (Object.keys(progress).length > 0) {
        await db.userProgress.put({ dictionaryPath, progress });
    } else {
        await db.userProgress.delete(dictionaryPath);
    }
}

// --- User-Specific Word Media (Notes, Drawings, etc.) ---

function createMediaId(dictionaryPath: string, wordId: string): string { return `${dictionaryPath}_${wordId}`; }
export async function getMediaForWord(dictionaryPath: string, wordId: string): Promise<WordMediaData | undefined> { return await db.wordMedia.get(createMediaId(dictionaryPath, wordId)); }
export async function saveMediaForWord(dictionaryPath: string, wordId: string, mediaUpdates: Partial<Pick<WordMediaData, 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote'>>): Promise<void> {
    const id = createMediaId(dictionaryPath, wordId);
    const existing = await db.wordMedia.get(id);
    const dataToSave: Partial<WordMediaData> = { id, dictionaryPath, wordId, lastUpdated: Date.now(), ...existing, ...mediaUpdates };
    (Object.keys(dataToSave) as Array<keyof WordMediaData>).forEach(key => { if (dataToSave[key] === undefined) { delete dataToSave[key]; } });
    const hasMediaContent = !!dataToSave.drawingDataUrl || !!dataToSave.imageDataUrl || !!dataToSave.userAudioDataUrl || !!dataToSave.userTextNote;
    if (hasMediaContent) {
        await db.wordMedia.put(dataToSave as WordMediaData);
    } else if (existing) {
        await db.wordMedia.delete(id);
    }
}
export async function getAllMediaForDictionary(dictionaryPath: string): Promise<WordMediaData[]> { return await db.wordMedia.where('dictionaryPath').equals(dictionaryPath).toArray(); }

// --- Spaced Repetition System (SRS) ---

export async function getSrsData(uniqueId: string): Promise<SrsData | undefined> { return await db.srsData.get(uniqueId); }
export async function saveSrsData(data: SrsData): Promise<void> {
    await db.srsData.put(data);
}
export async function deleteSrsData(uniqueId: string): Promise<void> {
    await db.srsData.delete(uniqueId);
}
export async function getDueSrsCardsForSession(dictionaryPath: string, now: number, newCardLimit: number): Promise<SrsData[]> {
    const reviewAndLapsedCards = await db.srsData.where('dictionaryPath').equals(dictionaryPath).and(card => (card.state === 'review' || card.state === 'learning' || card.state === 'lapsed') && card.nextReviewDate <= now).sortBy('nextReviewDate');
    let cardsForSession = [...reviewAndLapsedCards];
    if (newCardLimit > 0) {
        // Cards are marked "introduced" when first ANSWERED (see srsService.answerCard), not
        // when merely selected here. Two consequences, both intended:
        //  - an abandoned session costs nothing: unanswered new cards return next time;
        //  - the limit is a true daily cap: today's already-answered new cards shrink the
        //    remaining quota instead of every session handing out a fresh newCardLimit.
        const newCardsIntroducedToday = await getIntroducedTodayIds(dictionaryPath);
        const remainingQuota = Math.max(0, newCardLimit - newCardsIntroducedToday.size);
        let newCardsAddedToSession = 0;
        const potentialNewCards = await db.srsData.where({ dictionaryPath: dictionaryPath, state: 'new' }).limit(newCardLimit * 2).toArray();
        for (const newCard of potentialNewCards) {
            if (newCardsAddedToSession >= remainingQuota) break;
            if (!newCardsIntroducedToday.has(newCard.uniqueId)) {
                cardsForSession.push(newCard);
                newCardsAddedToSession++;
            }
        }
    }
    return cardsForSession;
}
export async function getDueSrsCardsCount(dictionaryPath: string, now: number = Date.now()): Promise<number> { return await db.srsData.where('dictionaryPath').equals(dictionaryPath).and(card => card.nextReviewDate <= now).count(); }
/** Records that a new card was answered for the first time today. Idempotent (keyed put). */
export async function markCardAsIntroduced(uniqueId: string): Promise<void> { await db.introducedToday.put({ uniqueId, dateIntroduced: new Date().toISOString().split('T')[0] }); }
async function getIntroducedTodayIds(dictionaryPath: string): Promise<Set<string>> {
    const todayStr = new Date().toISOString().split('T')[0];
    const records = await db.introducedToday.where('dateIntroduced').equals(todayStr).toArray();
    // srsUniqueId(path, '') yields the "<path>_" prefix every uniqueId of this dictionary shares.
    return new Set(records.filter(r => r.uniqueId.startsWith(srsUniqueId(dictionaryPath, ''))).map(r => r.uniqueId));
}
export async function cleanupOldIntroducedCards(): Promise<void> {
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    // --- THIS IS THE FIX: Corrected the variable name from "yesterstr" to "yesterdayStr" ---
    await db.introducedToday.where('dateIntroduced').below(yesterdayStr).delete();
}

// --- Image Thumbnails ---

export async function getThumbnail(id: string): Promise<ImageThumbnail | undefined> { return await db.imageThumbnails.get(id); }
export async function saveThumbnail(thumbnail: ImageThumbnail): Promise<void> { await db.imageThumbnails.put(thumbnail); }
export async function deleteThumbnail(id: string): Promise<void> { await db.imageThumbnails.delete(id); }

// --- Full Data Management ---

export async function clearAllLocalData(): Promise<void> {
    await Promise.all([
        db.userProgress.clear(), db.wordMedia.clear(), db.userInfo.clear(),
        db.userSettings.clear(), db.globalDictionaries.clear(),
        db.dictionaryIndexTimestamps.clear(), db.srsData.clear(),
        db.introducedToday.clear(), db.imageThumbnails.clear(),
        db.cachedIndexes.clear(),
    ]);
    await clearAudioCache();
}