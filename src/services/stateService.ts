import JSZip from 'jszip';
import { useAppStore } from '@/stores/appStore';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { db } from '@/services/db';
import type { StateExportManifest, WordMediaData, UserInfo, AppSettings, UserProgressMap, SrsData } from '@/types';
import { dataUrlToBlob } from '@/utils/blobUtils';

// ==================================================================
// --- EXPORT LOGIC ---
// ==================================================================

/**
 * Gathers all user-specific data from the database and app store.
 * @returns A promise resolving to the raw data for the manifest.
 */
async function gatherFullStateData(): Promise<Omit<StateExportManifest, 'mediaManifest'>> {
    const appStore = useAppStore();
    const userInfo = await db.userInfo.get('currentUser');
    const appSettings = await db.userSettings.get('user');
    const allProgressRecords = await db.userProgress.toArray();
    const allSrsData = await db.srsData.toArray();
    const allMediaData = await db.wordMedia.toArray();

    const progressByDictionary: { [key: string]: UserProgressMap } = {};
    allProgressRecords.forEach(record => {
        progressByDictionary[record.dictionaryPath] = record.progress;
    });

    return {
        exportFormatVersion: "1.1-versioned-state", // Updated format version
        timestamp: new Date().toISOString(),
        syncVersion: appSettings?.settings.syncVersion || 1, // Embed the sync version
        userInfo: userInfo ? { userName: userInfo.userName, locale: userInfo.locale } : { userName: 'anonymous' },
        appSettings: appSettings?.settings,
        userProgress: progressByDictionary,
        srsData: allSrsData,
        allMedia: allMediaData,
    };
}

/**
 * Creates a full backup ZIP file of the user's state in memory.
 * This function now RETURNS the blob and filename instead of triggering a download.
 * @returns A promise resolving to an object with the backup data or an error message.
 */
export async function exportFullState(): Promise<{ success: boolean; message: string; data?: { zipBlob: Blob; filename: string } }> {
    try {
        const rawData = await gatherFullStateData();
        const zip = new JSZip();

        const manifest: StateExportManifest = {
            ...rawData,
            mediaManifest: []
        };

        for (const mediaItem of rawData.allMedia || []) {
            const { dictionaryPath, wordId } = mediaItem;
            const mediaManifestEntry: Partial<WordMediaData> = { id: mediaItem.id, dictionaryPath, wordId, lastUpdated: mediaItem.lastUpdated };
            let hasAnyMedia = false;

            const processMedia = async (dataUrl: string | undefined, type: 'drawing' | 'image' | 'userAudio') => {
                if (!dataUrl) return;
                const blobResult = dataUrlToBlob(dataUrl);
                if (blobResult) {
                    const filename = `media/${dictionaryPath}/${wordId}_${type}.${blobResult.extension}`;
                    zip.file(filename, blobResult.blob);
                    
                    if (type === 'drawing') mediaManifestEntry.drawingDataUrl = filename;
                    if (type === 'image') mediaManifestEntry.imageDataUrl = filename;
                    if (type === 'userAudio') mediaManifestEntry.userAudioDataUrl = filename;
                    hasAnyMedia = true;
                }
            };

            await processMedia(mediaItem.drawingDataUrl, 'drawing');
            await processMedia(mediaItem.imageDataUrl, 'image');
            await processMedia(mediaItem.userAudioDataUrl, 'userAudio');

            if (mediaItem.userTextNote && mediaItem.userTextNote.trim()) {
                const noteFilename = `media/${dictionaryPath}/${wordId}_note.txt`;
                zip.file(noteFilename, mediaItem.userTextNote);
                mediaManifestEntry.userTextNote = noteFilename; 
                hasAnyMedia = true;
            }

            if (hasAnyMedia) {
                manifest.mediaManifest.push(mediaManifestEntry as WordMediaData);
            }
        }
        
        // Explicitly ensure sensitive data like API keys are not in the manifest
        delete (manifest as any).apiKeys;
        
        // Remove the raw media data array before saving the manifest
        delete (manifest as any).allMedia;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const usernamePart = manifest.userInfo.userName?.replace(/\W/g, '_').toLowerCase() || 'user';
        const filename = `swipedict_backup_${usernamePart}_${timestamp}.zip`;

        // Return the data for the caller to handle (e.g., download or upload to Drive)
        return { 
            success: true, 
            message: "Backup data prepared successfully.",
            data: { zipBlob, filename } 
        };

    } catch (error: any) {
        console.error("Full State Export Error:", error);
        return { success: false, message: `Fehler beim Erstellen des Backups: ${error.message}` };
    }
}


// ==================================================================
// --- IMPORT LOGIC ---
// ==================================================================

/**
 * Helper to convert a file Blob from the ZIP into a Data URL string.
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Validates the structure and version of the manifest file.
 */
function validateManifest(manifest: any): manifest is StateExportManifest {
    if (typeof manifest !== 'object' || manifest === null) return false;
    const validVersions = ["1.0-full-state", "1.1-versioned-state"];
    if (!validVersions.includes(manifest.exportFormatVersion)) {
        throw new Error(`Inkompatible Backup-Version. Erwartet eine der folgenden: ${validVersions.join(', ')}. Gefunden: '${manifest.exportFormatVersion}'.`);
    }
    return true;
}

export type ImportProgressCallback = (data: { step: string; current: number; total: number; }) => void;

/**
 * Imports a full state backup from a ZIP file, overwriting existing data.
 * @param zipFile The user-selected ZIP file.
 * @param onProgress A callback function to report progress updates.
 * @returns A promise resolving to an object indicating the result of the import.
 */
export async function importStateFromZip(zipFile: File, onProgress: ImportProgressCallback): Promise<{ success: boolean; message: string; details?: string }> {
    const appStore = useAppStore();

    let zip: JSZip;
    let manifest: StateExportManifest;

    try {
        onProgress({ step: "Lese ZIP-Datei...", current: 0, total: 100 });
        zip = await JSZip.loadAsync(zipFile);
        const manifestFile = zip.file("manifest.json");
        if (!manifestFile) throw new Error("Die ZIP-Datei enthält keine 'manifest.json'. Ungültiges Backup.");
        
        const manifestContent = await manifestFile.async("string");
        const parsedManifest = JSON.parse(manifestContent);
        if (!validateManifest(parsedManifest)) throw new Error("Die 'manifest.json' hat ein ungültiges Format.");
        manifest = parsedManifest;
        onProgress({ step: "Backup validiert", current: 10, total: 100 });
    } catch (error: any) {
        console.error("Import Service: Pre-flight check failed.", error);
        return { success: false, message: `Fehler bei der Backup-Validierung: ${error.message}` };
    }

    try {
        let importedProgressCount = { new: 0, updated: 0 };
        let importedSrsCount = { new: 0, updated: 0 };
        let importedMediaCount = 0;

        if (manifest.userInfo) await db.userInfo.put({ ...manifest.userInfo, id: 'currentUser' });
        // Make sure to include the syncVersion from the manifest when importing settings
        if (manifest.appSettings) {
            const settingsToSave = { ...manifest.appSettings, syncVersion: manifest.syncVersion || 1 };
            await db.userSettings.put({ id: 'user', settings: settingsToSave });
        }

        const currentDictionaryPaths = new Set(appStore.availableDictionaries.map(d => d.path));
        let skippedProgress = 0, skippedSrs = 0, skippedMedia = 0;

        // 1. Smart Patch User Progress
        if (manifest.userProgress) {
            onProgress({ step: "Importiere Fortschritt...", current: 20, total: 100 });
            for (const [dictPath, progressData] of Object.entries(manifest.userProgress)) {
                if (currentDictionaryPaths.has(dictPath)) {
                    const existingProgress = await db.userProgress.get(dictPath) || { dictionaryPath: dictPath, progress: {} };
                    let hasChanges = false;
                    for (const wordId in progressData) {
                        if (existingProgress.progress[wordId] !== progressData[wordId]) {
                            if (existingProgress.progress[wordId]) {
                                importedProgressCount.updated++;
                            } else {
                                importedProgressCount.new++;
                            }
                            existingProgress.progress[wordId] = progressData[wordId];
                            hasChanges = true;
                        }
                    }
                    if (hasChanges) await db.userProgress.put(existingProgress);
                } else {
                    skippedProgress++;
                }
            }
        }

        // 2. Smart Patch SRS Data
        if (manifest.srsData) {
            onProgress({ step: "Importiere SRS-Daten...", current: 40, total: 100 });
            const srsToProcess = manifest.srsData.filter(srsItem => currentDictionaryPaths.has(srsItem.dictionaryPath));
            skippedSrs = manifest.srsData.length - srsToProcess.length;
            const existingSrsItems = await db.srsData.bulkGet(srsToProcess.map(i => i.uniqueId));
            const itemsToPut: SrsData[] = [];
            
            srsToProcess.forEach((item, index) => {
                const existingItem = existingSrsItems[index];
                if (!existingItem) {
                    itemsToPut.push(item);
                    importedSrsCount.new++;
                } else if (JSON.stringify(item) !== JSON.stringify(existingItem)) {
                    itemsToPut.push(item);
                    importedSrsCount.updated++;
                }
            });

            if (itemsToPut.length > 0) await db.srsData.bulkPut(itemsToPut);
        }
        
        // 3. Smart Patch Media Data
        if (manifest.mediaManifest) {
            const totalMedia = manifest.mediaManifest.length;
            let processedMedia = 0;

            for (const mediaEntry of manifest.mediaManifest) {
                processedMedia++;
                const progressPercentage = 60 + Math.round((processedMedia / totalMedia) * 40);
                onProgress({ step: `Importiere Medien (${processedMedia}/${totalMedia})`, current: progressPercentage, total: 100 });
                if (!currentDictionaryPaths.has(mediaEntry.dictionaryPath)) {
                    skippedMedia++;
                    continue;
                }
                const localMedia = await db.wordMedia.get(mediaEntry.id);
                const mediaToSave: Partial<WordMediaData> = {};
                let mediaWasAdded = false;

                let backupNoteContent: string | undefined;
                if (mediaEntry.userTextNote && mediaEntry.userTextNote.endsWith('.txt')) {
                     const noteFile = zip.file(mediaEntry.userTextNote);
                     if (noteFile) backupNoteContent = await noteFile.async("string");
                }
                if (backupNoteContent && backupNoteContent !== localMedia?.userTextNote) {
                    mediaToSave.userTextNote = backupNoteContent;
                    mediaWasAdded = true;
                }

                if (mediaEntry.drawingDataUrl && !localMedia?.drawingDataUrl) {
                    const file = zip.file(mediaEntry.drawingDataUrl);
                    if(file) {
                        mediaToSave.drawingDataUrl = await blobToDataUrl(await file.async("blob"));
                        mediaWasAdded = true;
                    }
                }
                if (mediaEntry.imageDataUrl && !localMedia?.imageDataUrl) {
                     const file = zip.file(mediaEntry.imageDataUrl);
                     if(file) {
                        mediaToSave.imageDataUrl = await blobToDataUrl(await file.async("blob"));
                        mediaWasAdded = true;
                     }
                }
                if (mediaEntry.userAudioDataUrl && !localMedia?.userAudioDataUrl) {
                     const file = zip.file(mediaEntry.userAudioDataUrl);
                     if(file) {
                        mediaToSave.userAudioDataUrl = await blobToDataUrl(await file.async("blob"));
                        mediaWasAdded = true;
                     }
                }
                
                if (mediaWasAdded) {
                    importedMediaCount++;
                    const finalMedia = { ...localMedia, ...mediaToSave, id: mediaEntry.id, dictionaryPath: mediaEntry.dictionaryPath, wordId: mediaEntry.wordId, lastUpdated: Date.now() };
                    await db.wordMedia.put(finalMedia as WordMediaData);
                }
            }
        }

        let detailsMessage = `Wort-Status: ${importedProgressCount.new} neu hinzugefügt, ${importedProgressCount.updated} aktualisiert.`;
        detailsMessage += `\nSRS-Einträge: ${importedSrsCount.new} neu hinzugefügt, ${importedSrsCount.updated} aktualisiert.`;
        detailsMessage += `\nMedien: ${importedMediaCount} neu hinzugefügt (existierende wurden nicht überschrieben).`;

        if (skippedProgress > 0 || skippedSrs > 0 || skippedMedia > 0) {
            detailsMessage += `\n\nÜbersprungen: ${skippedProgress + skippedSrs + skippedMedia} Einträge insgesamt (Wörterbücher nicht installiert).`;
        }
        
        await appStore.checkUserRegistration();
        await appStore.loadSettings();

        return { success: true, message: "Import abgeschlossen!", details: detailsMessage };
    } catch (error: any) {
        console.error("Full State Import Error:", error);
        return { success: false, message: `Fehler beim Import: ${error.message}` };
    }
}