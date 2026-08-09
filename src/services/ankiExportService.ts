import JSZip from 'jszip';
import { useAppStore } from '@/stores/appStore';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { getMediaForWord } from '@/services/db';
import type { DictionaryMeta, UserInfo, WordMediaData, AnkiExportWord, AnkiExportPayload } from '@/types';
import { dataUrlToBlob } from '@/utils/blobUtils';
import i18n from '@/i18n';

async function gatherAnkiExportData(): Promise<AnkiExportPayload | null> {
    const appStore = useAppStore();
    const dictionaryStore = useDictionaryStore();
    const selectedDict = appStore.selectedDictionary;
    const user = appStore.currentUserInfo ?? { userName: 'unknown_user' };

    if (!selectedDict || !user.userName) {
        const errorMsg = !selectedDict ? i18n.global.t('ankiExport.noDictionary') : i18n.global.t('ankiExport.userNotLoaded');
        console.error("Anki Export Error:", errorMsg);
        const defaultDict: DictionaryMeta = { dictId: 'unknown', author: '', message: 'Unknown', type: '', path: '', version: '', lastUpdate: 0 };
        return {
            user,
            dictionary: selectedDict || defaultDict,
            words: [],
            mediaFiles: new Map(),
            error: errorMsg
        };
    }

    const dictionaryPath = selectedDict.path;
    console.log(`Anki Export: Starting KEEP export for dictionary: ${dictionaryPath}`);

    if (dictionaryStore.currentDictionaryPath !== dictionaryPath || dictionaryStore.masterList.length === 0) {
        await dictionaryStore.loadDictionaryIndex(dictionaryPath);
        if (dictionaryStore.dictionaryError) {
            console.error("Anki Export Error: Failed load dictionary index.", dictionaryStore.dictionaryError);
             return { user, dictionary: selectedDict, words: [], mediaFiles: new Map(), error: i18n.global.t('general.indexLoadError', { error: dictionaryStore.dictionaryError }) };
        }
    }

    const wordsToExport = dictionaryStore.masterList.filter(entry => entry.metadata.state === 'KEEP');

    if (wordsToExport.length === 0) {
        console.log("Anki Export: No words in 'KEEP' state to export.");
         return { user, dictionary: selectedDict, words: [], mediaFiles: new Map() };
    }

    const ankiWords: AnkiExportWord[] = [];
    const mediaFiles = new Map<string, Blob>();
    let mediaErrors = 0;

    const mediaPromises = wordsToExport.map(entry => getMediaForWord(dictionaryPath, entry.id));
    const allMediaResults = await Promise.all(mediaPromises);
    const mediaMap = new Map<string, WordMediaData>(allMediaResults.filter(m => m).map(m => [m!.wordId, m!] as [string, WordMediaData]));
    console.log(`Anki Export: Fetched ${mediaMap.size} media records.`);

    for (const entry of wordsToExport) {
        const mediaData = mediaMap.get(entry.id);
        const safeDictPath = selectedDict.path.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const safeWordId = entry.id.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const baseFilename = `swipedict_anki_${safeDictPath}_${safeWordId}`;

        let drawingFilename: string | undefined = undefined;
        let audioFilename: string | undefined = undefined;
        let imageFilename: string | undefined = undefined;

        if (mediaData?.imageDataUrl) {
            const blobResult = dataUrlToBlob(mediaData.imageDataUrl);
            if (blobResult) {
                imageFilename = `${baseFilename}_image.${blobResult.extension}`;
                mediaFiles.set(imageFilename, blobResult.blob);
            } else {
                mediaErrors++;
                console.warn(`Anki Export: Failed to convert imageDataUrl for word ${entry.id}`);
            }
        }

        if (mediaData?.drawingDataUrl) {
            const blobResult = dataUrlToBlob(mediaData.drawingDataUrl);
            if (blobResult) {
                drawingFilename = `${baseFilename}_drawing.${blobResult.extension}`;
                mediaFiles.set(drawingFilename, blobResult.blob);
            } else {
                mediaErrors++;
                console.warn(`Anki Export: Failed to convert drawingDataUrl for word ${entry.id}`);
            }
        }

        if (mediaData?.userAudioDataUrl) {
            const blobResult = dataUrlToBlob(mediaData.userAudioDataUrl);
            if (blobResult) {
                let audioExt = 'opus';
                if (blobResult.mimeType === 'audio/opus' || blobResult.mimeType.includes('opus') || blobResult.extension === 'opus') {
                    audioExt = 'opus';
                } else if (['mp3', 'ogg', 'wav', 'aac', 'flac', 'm4a'].includes(blobResult.extension)) {
                    audioExt = blobResult.extension;
                }
                audioFilename = `${baseFilename}_audio.${audioExt}`;
                mediaFiles.set(audioFilename, blobResult.blob);
            } else {
                 mediaErrors++;
                console.warn(`Anki Export: Failed to convert userAudioDataUrl for word ${entry.id}`);
            }
        }

        ankiWords.push({
            wordId: entry.id,
            sourceHeadword: entry.source.headword || '',
            targetHeadword: entry.target.headword || '',
            imageFilename: imageFilename,
            drawingFilename: drawingFilename,
            audioFilename: audioFilename,
            userTextNote: mediaData?.userTextNote
        });
    }

    console.log(`Anki Export: Processed ${wordsToExport.length} words. Found ${mediaFiles.size} media files. ${mediaErrors} media conversion errors.`);

    return {
        user,
        dictionary: selectedDict,
        words: ankiWords,
        mediaFiles,
        error: mediaErrors > 0 ? `${mediaErrors} Medien konnten nicht verarbeitet werden.` : undefined
    };
}

/**
 * Escapes a string for use in a TSV field, handling quotes and newlines for Anki.
 * @param field The string content to escape.
 * @returns A properly formatted string for a TSV cell.
 */
function escapeAnkiTsvField(field: string | undefined | null): string {
    if (field === undefined || field === null) {
        return '';
    }
    let str = String(field);

    // Anki-specific: convert newlines to HTML breaks. This should be done before checking for quotes.
    str = str.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
    
    // Check if the field contains characters that require quoting (tabs, double quotes).
    if (str.includes('\t') || str.includes('"')) {
        // Replace every double quote with two double quotes.
        const escapedStr = str.replace(/"/g, '""');
        // Enclose the entire field in double quotes.
        return `"${escapedStr}"`;
    }

    // If no special characters are present, return the string as is.
    return str;
}


async function generateAnkiZip(data: AnkiExportPayload): Promise<{ zipBlob: Blob, filename: string }> {
    const zip = new JSZip();

    let tsvContent = "# SwipeDict Anki Export\n";
    tsvContent += "# Format: WordID [tab] SourceHeadword [tab] TargetHeadword [tab] Image [tab] Drawing [tab] Audio [tab] TextNote\n";
    tsvContent += "# When importing into Anki, map columns to your note type fields accordingly.\n";
    tsvContent += "# Example field mapping: WordID, Front, Back, Image, Drawing, Audio, Note\n";

    data.words.forEach(word => {
        const imageField = word.imageFilename ? `<img src="${word.imageFilename}">` : '';
        const drawingField = word.drawingFilename ? `<img src="${word.drawingFilename}">` : '';
        const audioField = word.audioFilename ? `[sound:${word.audioFilename}]` : '';

        const tsvLine = [
            word.wordId,
            escapeAnkiTsvField(word.sourceHeadword),
            escapeAnkiTsvField(word.targetHeadword),
            imageField,
            drawingField,
            audioField,
            escapeAnkiTsvField(word.userTextNote)
        ].join('\t');

        tsvContent += `${tsvLine}\n`;

        if (word.imageFilename && data.mediaFiles.has(word.imageFilename)) {
             zip.file(word.imageFilename, data.mediaFiles.get(word.imageFilename)!);
        }
        if (word.drawingFilename && data.mediaFiles.has(word.drawingFilename)) {
             zip.file(word.drawingFilename, data.mediaFiles.get(word.drawingFilename)!);
        }
        if (word.audioFilename && data.mediaFiles.has(word.audioFilename)) {
             zip.file(word.audioFilename, data.mediaFiles.get(word.audioFilename)!);
        }
    });

    zip.file("import.tsv", tsvContent);

    const readmeContent = `SwipeDict Anki Export - Import Instructions
=========================================

This ZIP file contains:
1. import.tsv: A tab-separated file with your word data.
2. Media files (images/audio): Referenced in import.tsv.

How to Import into Anki:
--------------------------
1. Extract ALL files from this ZIP archive into a single folder.
2. Open Anki desktop application and go to File > Import...
3. Select the 'import.tsv' file from the extracted folder.
4. In the Anki Import dialog:
   - Choose or Create a Note Type with fields like: 'WordID', 'Source', 'Target', 'Image', 'Drawing', 'Audio', 'Note'.
   - **Crucially**, map the columns from the file to your fields:
     - Column 1 -> WordID
     - Column 2 -> Source
     - Column 3 -> Target
     - Column 4 -> Image
     - Column 5 -> Drawing
     - Column 6 -> Audio
     - Column 7 -> Note
   - Ensure "Allow HTML in fields" is CHECKED.
   - Choose an import behavior (e.g., "Update existing notes when first field matches").
5. Click "Import". Anki will import the notes and copy the media files to its collection.

Generated by SwipeDict on: ${new Date().toLocaleString()}
`;
    zip.file("README_Anki_Import.txt", readmeContent);


    const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const usernamePart = data.user?.userName?.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase() || 'user';
    const dictionaryPart = data.dictionary?.path.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'dictionary';
    const filename = `swipedict_anki_export_${usernamePart}_${dictionaryPart}_${timestamp}.zip`;

    return { zipBlob, filename };
}

function triggerDownload(blob: Blob, filename: string) {
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Anki Export: Triggered download for ${filename}`);
    } catch (e) {
        console.error("Anki Export: Error triggering download:", e);
        alert(i18n.global.t('ankiExport.downloadFailed', { error: e instanceof Error ? e.message : String(e) }));
    }
}

export async function exportDataForAnki(): Promise<{ success: boolean; message: string }> {
    console.log("Anki Export: Starting Anki export process...");
    try {
        const exportData = await gatherAnkiExportData();
        if (!exportData) {
            throw new Error(i18n.global.t('ankiExport.gatherFailed'));
        }
        if (exportData.error && exportData.words.length === 0) {
            throw new Error(exportData.error);
        }
        if (exportData.words.length === 0) {
            return { success: true, message: i18n.global.t('ankiExport.noKeepWords') };
        }
        const { zipBlob, filename } = await generateAnkiZip(exportData);
        triggerDownload(zipBlob, filename);
        let successMessage = `Anki Export für ${exportData.words.length} Wörter gestartet (${filename}). Siehe README im ZIP.`;
        if (exportData.error) {
            successMessage += ` WARNUNG: ${exportData.error}`;
        }
        return { success: true, message: successMessage };
    } catch (error: any) {
        console.error("Anki Export: Process failed:", error);
        return { success: false, message: `Anki Export fehlgeschlagen: ${error.message}` };
    }
}