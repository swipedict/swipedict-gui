import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import type { Ref } from 'vue';
import i18n from '@/i18n';
import { useAppStore } from './appStore';
import { useSettingsStore } from './settingsStore';
import { useDictionaryStore } from './dictionaryStore';
import { useListViewStore } from './listViewStore';
import { useCustomMediaStore } from './customMediaStore';
import { uploadBackupToDrive, downloadBackupFromDrive, fetchRemoteVersionOnly, isGoogleDriveEnabled } from '@/services/googleDriveService';
import { importStateFromZip, type ImportProgressCallback } from '@/services/stateService';
import emitter from '@/services/emitter';

export const useSyncStore = defineStore('sync', () => {
    const isSyncing = ref(false);
    const importStatus = reactive({ inProgress: false, completed: false, error: false, message: '', details: '', step: '', progress: 0 });
    const remoteSyncVersion: Ref<number | 'loading' | 'error' | 'no_backup' | null> = ref(null);

    function resetImportState() {
        importStatus.inProgress = false; importStatus.completed = false; importStatus.error = false;
        importStatus.message = ''; importStatus.details = ''; importStatus.step = ''; importStatus.progress = 0;
    }

    const progressCallback: ImportProgressCallback = (data) => {
        importStatus.step = data.step;
        importStatus.progress = data.current;
    };

    async function checkRemoteSyncVersion() {
        const appStore = useAppStore();
        const settingsStore = useSettingsStore();
        if (!appStore.isUserRegistered || !settingsStore.settings.enableCloudSync) {
            remoteSyncVersion.value = null;
            return;
        }
        isSyncing.value = true;
        remoteSyncVersion.value = 'loading';
        try {
            const version = await fetchRemoteVersionOnly();
            remoteSyncVersion.value = version;
        } catch (error: any) {
            console.error("Failed to fetch remote sync version:", error);
            remoteSyncVersion.value = 'error';
            emitter.emit('show-notification', { message: i18n.global.t('sync.errorCheckStatus', { error: error.message }), type: 'error' });
        } finally {
            isSyncing.value = false;
        }
    }

    async function pushChangesToCloud() {
        if (isSyncing.value) return;
        const settingsStore = useSettingsStore();
        const hasChanges = localStorage.getItem('hasUnsyncedChanges') === 'true';
        if (!hasChanges) {
            emitter.emit('show-notification', { message: i18n.global.t('sync.noLocalChanges'), type: 'info' });
            return;
        }

        const localVersion = settingsStore.settings.syncVersion || 1;
        if (typeof remoteSyncVersion.value === 'number' && remoteSyncVersion.value > localVersion) {
            if (!window.confirm(i18n.global.t('sync.overwriteWarning', { remoteVersion: remoteSyncVersion.value, localVersion }))) {
                return;
            }
        }

        isSyncing.value = true;
        emitter.emit('show-notification', { message: i18n.global.t('sync.uploading'), type: 'info' });
        try {
            await uploadBackupToDrive();
            await checkRemoteSyncVersion();
            emitter.emit('show-notification', { message: i18n.global.t('sync.pushSuccess'), type: 'success' });
        } catch (error: any) {
            emitter.emit('show-notification', { message: i18n.global.t('sync.errorPush', { error: error.message }), type: 'error' });
        } finally {
            isSyncing.value = false;
        }
    }

    async function pullChangesFromCloud() {
        if (isSyncing.value) return;
        const settingsStore = useSettingsStore();
        const hasChanges = localStorage.getItem('hasUnsyncedChanges') === 'true';
        if (hasChanges) {
            if (!window.confirm(i18n.global.t('sync.discardWarning'))) {
                return;
            }
        }

        isSyncing.value = true;
        resetImportState();
        importStatus.inProgress = true;

        try {
            const backup = await downloadBackupFromDrive();
            if (!backup) {
                importStatus.completed = true;
                importStatus.error = true;
                importStatus.message = i18n.global.t('sync.noBackupFound');
                return;
            }

            const importResult = await importStateFromZip(backup.file, progressCallback);
            if (importResult.success) {
                await settingsStore.updateSetting('syncVersion', backup.remoteVersion);
                await reinitializeStoresAfterImport();
                localStorage.setItem('hasUnsyncedChanges', 'false');
            }

            importStatus.completed = true;
            importStatus.error = !importResult.success;
            importStatus.message = importResult.message;
            importStatus.details = importResult.details || '';

        } catch (error: any) {
            importStatus.completed = true;
            importStatus.error = true;
            importStatus.message = i18n.global.t('sync.errorPull', { error: error.message });
        } finally {
            isSyncing.value = false;
            if (importStatus.completed && !importStatus.message.includes("Relaunch")) {
                importStatus.inProgress = false;
            }
        }
    }

    async function reinitializeStoresAfterImport() {
        console.log("Re-initializing all stores after data import...");
        const appStore = useAppStore();
        const settingsStore = useSettingsStore();
        useDictionaryStore().$reset();
        useListViewStore().$reset();
        useCustomMediaStore().$reset();
        appStore.$reset();
        await appStore.checkUserRegistration();
        await appStore.loadGlobalIndex();
        if (appStore.isUserRegistered) {
            await settingsStore.loadSettings();
            appStore.loadLastSelection();
        }
        console.log("Store re-initialization complete.");
    }

    function $reset() {
        isSyncing.value = false;
        resetImportState();
        remoteSyncVersion.value = null;
    }

    return {
        isSyncing, importStatus, remoteSyncVersion,
        checkRemoteSyncVersion, pushChangesToCloud, pullChangesFromCloud,
        resetImportState, reinitializeStoresAfterImport, $reset
    };
});
