/**
 * Converts a Data URL string into a Blob object and extracts the file extension.
 *
 * @param dataUrl The Data URL string (e.g., "data:image/png;base64,...").
 * @returns An object containing the Blob and the inferred file extension, or null if conversion fails.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; extension: string; mimeType: string } | null {
    try {
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            console.error("Invalid Data URL format (missing comma).");
            return null;
        }

        const metaPart = parts[0];
        const base64Data = parts[1];

        const metaMatch = metaPart.match(/^data:(.+?)(;base64)?$/);
        if (!metaMatch || !metaMatch[1]) {
            console.error("Invalid Data URL format (could not parse meta).");
            return null;
        }

        const mimeType = metaMatch[1].toLowerCase(); // Standardize to lowercase
        let extension = 'bin';

        // Prioritize Opus detection
        if (mimeType === 'audio/opus' || mimeType.includes('opus')) { // Broader check for opus in codecs
            extension = 'opus';
        } else {
            const mimeParts = mimeType.split('/');
            if (mimeParts.length === 2) {
                const subType = mimeParts[1]; // Already lowercase from mimeType
                if (subType === 'webm') { // WebM can contain Opus, but if not explicitly opus, use webm
                    extension = 'webm';
                } else if (subType === 'ogg') { // Ogg can contain Opus, but if not explicitly opus, use ogg
                    extension = 'ogg';
                } else if (subType === 'mpeg') {
                    extension = 'mp3';
                } else if (subType === 'wav' || subType === 'wave' || subType === 'x-wav') {
                    extension = 'wav';
                } else if (subType === 'aac') {
                    extension = 'aac';
                } else if (subType === 'mp4' || subType === 'x-m4a') { // m4a is audio/mp4 or audio/x-m4a
                    extension = 'm4a';
                } else if (subType === 'flac') {
                    extension = 'flac';
                } else if (subType === 'png') {
                    extension = 'png';
                } else if (subType === 'jpeg' || subType === 'jpg') {
                    extension = 'jpg';
                } else if (subType === 'gif') {
                    extension = 'gif';
                } else if (subType === 'svg+xml') {
                    extension = 'svg';
                } else {
                    // General fallback, try to extract from subtype before any parameters
                    extension = subType.split(';')[0].split('+')[0].replace('x-', '');
                }
            }
        }

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        return { blob, extension, mimeType };

    } catch (error) {
        console.error("Error converting Data URL to Blob:", error);
        return null;
    }
}