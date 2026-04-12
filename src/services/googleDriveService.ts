import { exportFullState, importStateFromZip, type ImportProgressCallback } from './stateService';
import emitter from './emitter';
import type { StateExportManifest } from '@/types';
import JSZip from 'jszip';
// DO NOT import appStore here to prevent circular dependencies.
// It will be imported dynamically inside the functions that need it.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DRIVE_API_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const STATE_BACKUP_FILENAME = 'state_backup.zip';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;
let gisLoaded = false;
let gisLoadPromise: Promise<void> | null = null;

// A simple flag to know if the feature is enabled.
export const isGoogleDriveEnabled = !!CLIENT_ID;

function loadGisClient(): Promise<void> {
    if (!isGoogleDriveEnabled) return Promise.resolve(); // Do nothing if not enabled
    if (gisLoaded) return Promise.resolve();
    if (gisLoadPromise) return gisLoadPromise;
    gisLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => { gisLoaded = true; resolve(); };
        script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
        document.body.appendChild(script);
    });
    return gisLoadPromise;
}

async function initTokenClient() {
    if (!isGoogleDriveEnabled) return;
    if (tokenClient) return;
    await loadGisClient();
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: DRIVE_API_SCOPES,
            callback: (tokenResponse) => { accessToken = tokenResponse?.access_token || null; },
        });
    } catch (error) {
        console.error("Error initializing Google token client:", error);
        throw error;
    }
}

async function signIn(): Promise<void> {
    if (!isGoogleDriveEnabled) {
        return Promise.reject(new Error("Google Drive integration is not configured."));
    }
    return new Promise(async (resolve, reject) => {
        try { await initTokenClient(); } catch (e) { return reject(e); }
        accessToken = null;
        tokenClient!.callback = (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                resolve();
            } else {
                accessToken = null;
                reject(new Error("Authentication failed or was cancelled by user."));
            }
        };
        tokenClient!.requestAccessToken({ prompt: '' });
    });
}

async function getRemoteBackupFile(): Promise<{ id: string } | null> {
    if (!isGoogleDriveEnabled) return null;
    if (!accessToken) await signIn();
    const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
    searchUrl.searchParams.append('spaces', 'appDataFolder');
    searchUrl.searchParams.append('q', `name='${STATE_BACKUP_FILENAME}'`);
    searchUrl.searchParams.append('fields', 'files(id)');
    
    const response = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error('Could not search for remote backup file.');

    const result = await response.json();
    return result.files?.[0] || null;
}

export async function uploadBackupToDrive(): Promise<void> {
    const { useSettingsStore } = await import('@/stores/settingsStore');
    const settingsStore = useSettingsStore();

    if (!isGoogleDriveEnabled) return;
    if (!accessToken) await signIn();

    const existingFile = await getRemoteBackupFile();
    const existingFileId = existingFile?.id;

    const newVersion = (settingsStore.settings.syncVersion || 1) + 1;
    await settingsStore.updateSetting('syncVersion', newVersion);

    const updatedExport = await exportFullState();
    if (!updatedExport.success || !updatedExport.data) {
        await settingsStore.updateSetting('syncVersion', newVersion - 1); // Revert version increment on failure
        throw new Error("Failed to re-export state with incremented version.");
    }

    const metadata = { name: STATE_BACKUP_FILENAME, mimeType: 'application/zip' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', updatedExport.data.zipBlob);

    let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
        method = 'PATCH';
    } else {
        (metadata as any).parents = ['appDataFolder'];
        form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    }

    const response = await fetch(uploadUrl, { method, headers: { Authorization: `Bearer ${accessToken}` }, body: form });
    if (!response.ok) {
        const errorData = await response.json();
        await settingsStore.updateSetting('syncVersion', newVersion - 1); // Revert on failure
        throw new Error(errorData.error.message || `Upload failed with status ${response.status}`);
    }

    localStorage.setItem('hasUnsyncedChanges', 'false');
}

async function downloadStateBackup(fileId: string): Promise<Blob> {
    if (!isGoogleDriveEnabled) throw new Error("Google Drive integration is not configured.");
    if (!accessToken) await signIn(); // Ensure we are signed in
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || `Download failed with status ${response.status}`);
    }
    return response.blob();
}

export async function downloadBackupFromDrive(): Promise<{ file: File, remoteVersion: number } | null> {
    if (!isGoogleDriveEnabled) throw new Error("Google Drive integration is not configured.");
    if (!accessToken) await signIn();
    
    const remoteFile = await getRemoteBackupFile();
    if (!remoteFile) return null;

    const remoteVersion = await getRemoteSyncVersion(remoteFile.id);
    if (remoteVersion === null) throw new Error("Could not read remote backup version.");

    const blob = await downloadStateBackup(remoteFile.id);
    const file = new File([blob], STATE_BACKUP_FILENAME, { type: 'application/zip' });
    return { file, remoteVersion };
}


// --- MODIFICATION START: Removed the faulty partial download logic ---
async function getRemoteSyncVersion(fileId: string): Promise<number | null> {
    if (!isGoogleDriveEnabled) return null;
    if (!accessToken) await signIn();
    
    try {
        // Go straight to the reliable full download.
        const fullBlob = await downloadStateBackup(fileId);
        const zip = await JSZip.loadAsync(fullBlob);
        const manifestFile = zip.file("manifest.json");
        if (!manifestFile) return null;
        
        const content = await manifestFile.async("string");
        const manifest = JSON.parse(content) as StateExportManifest;
        return manifest.syncVersion || 1;
    } catch (e) {
        console.error("Error reading remote manifest from backup file:", e);
        return null;
    }
}
// --- MODIFICATION END ---

export async function fetchRemoteVersionOnly(): Promise<number | 'no_backup'> {
    if (!isGoogleDriveEnabled) return 'no_backup';
    if (!accessToken) await signIn();
    const remoteFile = await getRemoteBackupFile();
    if (!remoteFile) {
        return 'no_backup';
    }
    const version = await getRemoteSyncVersion(remoteFile.id);
    return version ?? 'no_backup';
}