// --- File: src/stores/thumbnailStore.ts ---
// --- Start Content ---
import { defineStore } from 'pinia';
import { getThumbnail, saveThumbnail, deleteThumbnail } from '@/services/db';
import { useCustomMediaStore } from './customMediaStore';
import type { ImageThumbnail } from '@/types';

const THUMB_WIDTH = 128;
const THUMB_HEIGHT = 96;

async function generateThumbnail(fullImageDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = THUMB_WIDTH;
            canvas.height = THUMB_HEIGHT;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get 2d context for thumbnail generation'));
            }
            
            // Simple center-crop logic
            const sourceRatio = img.width / img.height;
            const targetRatio = THUMB_WIDTH / THUMB_HEIGHT;
            let sx, sy, sWidth, sHeight;

            if (sourceRatio > targetRatio) { // source is wider
                sHeight = img.height;
                sWidth = sHeight * targetRatio;
                sx = (img.width - sWidth) / 2;
                sy = 0;
            } else { // source is taller or same ratio
                sWidth = img.width;
                sHeight = sWidth / targetRatio;
                sx = 0;
                sy = (img.height - sHeight) / 2;
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
            
            // Export as WebP for better compression
            const thumbnailDataUrl = canvas.toDataURL('image/webp', 0.8);
            resolve(thumbnailDataUrl);
        };
        img.onerror = () => {
            reject(new Error('Image failed to load for thumbnail generation'));
        };
        img.src = fullImageDataUrl;
    });
}

export const useThumbnailStore = defineStore('thumbnail', () => {
    const customMediaStore = useCustomMediaStore();

    function getCacheKey(dictionaryPath: string, wordId: string): string {
        return `${dictionaryPath}_${wordId}`;
    }

    async function getOrCreateThumbnail(dictionaryPath: string, wordId: string): Promise<string | null> {
        const cacheKey = getCacheKey(dictionaryPath, wordId);

        // 1. Check DB cache first
        const cachedThumb = await getThumbnail(cacheKey);
        if (cachedThumb) {
            return cachedThumb.thumbnailDataUrl;
        }

        // 2. No thumb in cache, need to generate. Get full image.
        const media = await customMediaStore.getOrFetchMedia(dictionaryPath, wordId);
        const fullImageUrl = media?.imageDataUrl;

        if (!fullImageUrl) {
            return null; // No source image, so no thumbnail
        }

        try {
            // 3. Generate thumbnail from full image
            const thumbnailDataUrl = await generateThumbnail(fullImageUrl);

            // 4. Save to DB cache
            const newThumbnail: ImageThumbnail = {
                id: cacheKey,
                thumbnailDataUrl,
            };
            await saveThumbnail(newThumbnail);

            return thumbnailDataUrl;
        } catch (error) {
            console.error(`ThumbnailStore: Failed to generate/save thumbnail for ${cacheKey}`, error);
            return null;
        }
    }

    async function clearThumbnail(dictionaryPath: string, wordId: string): Promise<void> {
        const cacheKey = getCacheKey(dictionaryPath, wordId);
        await deleteThumbnail(cacheKey);
    }
    
    function $reset() {
        // Dexie table clear is handled in db.ts
    }

    return {
        getOrCreateThumbnail,
        clearThumbnail,
        $reset,
    };
});
// --- End Content ---