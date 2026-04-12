import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AppSettings } from '@/types';
import { getAppSettings, saveAppSettings } from '@/services/db';
import { useI18n } from 'vue-i18n';
import emitter from '@/services/emitter';

export const DEFAULT_SETTINGS: AppSettings = {
    initialListDisplay: 'all',
    playSoundOnTap: true,
    revealOnTap: true,
    revealOnSwipe: true,
    preferUserAudio: true,
    disableTTSFallback: false,
    newCardsPerDay: 20,
    srsQuestionSide: 'source',
    detailViewDefaultVisibility: 'all',
    enableCloudSync: false,
};

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
    const isLoading = ref(false);

    async function loadSettings() {
        if (isLoading.value) return;
        isLoading.value = true;
        try {
            const loaded = await getAppSettings();
            // Merge loaded settings with defaults to ensure new flags exist
            settings.value = { ...DEFAULT_SETTINGS, ...(loaded || {}) };
        } catch (error) {
            console.error("SettingsStore: Error loading settings:", error);
            settings.value = { ...DEFAULT_SETTINGS };
        } finally {
            isLoading.value = false;
        }
    }

    async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
        // Optimistic update
        const oldSettings = { ...settings.value };
        const newSettings = { ...settings.value, [key]: value };
        settings.value = newSettings;

        try {
            await saveAppSettings(newSettings);
            // We use the global i18n instance here via emitter or direct import if needed, 
            // but for architectural purity, we just emit the success.
            emitter.emit('show-notification', { message: "Einstellungen gespeichert.", type: 'success', duration: 1500 });
        } catch (error: any) {
            settings.value = oldSettings; // Rollback
            emitter.emit('show-notification', { message: `Fehler: ${error.message}`, type: 'error' });
        }
    }

    // Explicit Setters for better Type Safety
    function setInitialListDisplay(value: 'all' | 'sourceOnly' | 'targetOnly') { updateSetting('initialListDisplay', value); }
    function setPlaySoundOnTap(value: boolean) { updateSetting('playSoundOnTap', value); }
    function setRevealOnTap(value: boolean) { updateSetting('revealOnTap', value); }
    function setRevealOnSwipe(value: boolean) { updateSetting('revealOnSwipe', value); }
    function setPreferUserAudio(value: boolean) { updateSetting('preferUserAudio', value); }
    function setDisableTTSFallback(value: boolean) { updateSetting('disableTTSFallback', value); }
    function setNewCardsPerDay(value: number) { updateSetting('newCardsPerDay', Math.max(0, value)); }
    function setSrsQuestionSide(value: 'mixed' | 'source' | 'target') { updateSetting('srsQuestionSide', value); }
    function setDetailViewDefaultVisibility(value: 'all' | 'sourceOnly' | 'targetOnly') { updateSetting('detailViewDefaultVisibility', value); }
    function setEnableCloudSync(value: boolean) { updateSetting('enableCloudSync', value); }

    // Reset settings to default (useful for full resets)
    function $reset() {
        settings.value = { ...DEFAULT_SETTINGS };
        isLoading.value = false;
    }

    return {
        settings,
        isLoading,
        loadSettings,
        updateSetting,
        setInitialListDisplay,
        setPlaySoundOnTap,
        setRevealOnTap,
        setRevealOnSwipe,
        setPreferUserAudio,
        setDisableTTSFallback,
        setNewCardsPerDay,
        setSrsQuestionSide,
        setDetailViewDefaultVisibility,
        setEnableCloudSync,
        $reset
    };
});