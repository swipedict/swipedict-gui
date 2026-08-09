import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { DictionaryMeta, GlobalIndex, UserInfo } from '@/types';
import {
    getCachedGlobalDicts, cacheGlobalDicts,
    getUserInfo, saveUserInfo, deleteUserInfo,
    saveAppSettings
} from '@/services/db';
import emitter from '@/services/emitter';
import { useSettingsStore, DEFAULT_SETTINGS } from './settingsStore';
import i18n, { setLocale, DEFAULT_LOCALE, SUPPORT_LOCALES } from '@/i18n';
import { BASE_SERVER_URL } from '@/config';
import { isGoogleDriveEnabled } from '@/services/googleDriveService';

export const useAppStore = defineStore('app', () => {
    // --- Dependencies ---
    const settingsStore = useSettingsStore();

    // --- State ---
    const availableDictionaries = ref<DictionaryMeta[]>([]);
    const selectedDictionaryPath = ref<string | null>(null);
    const isLoadingGlobalIndex = ref(false);
    const globalIndexLoaded = ref(false);
    const globalIndexServerInfo = ref<string | null>(null);
    const globalIndexGeneratedAt = ref<number | null>(null);
    const currentUserInfo = ref<UserInfo | null>(null);
    const isLoadingUserInfo = ref(false);
    const checkedInitialUserStatus = ref(false);

    const apiKeys = ref<Record<string, string>>({});

    const _lastFetchedRemoteIndex = ref<GlobalIndex | null>(null);
    const isCheckingForUpdates = ref(false);
    const updateCheckError = ref<string | null>(null);

    let _userInfoPromise: Promise<void> | null = null;
    let _globalIndexPromise: Promise<void> | null = null;

    // --- Computed Properties ---

    const selectedDictionary = computed(() =>
        availableDictionaries.value.find(dict => dict.path === selectedDictionaryPath.value)
    );
    const isUserRegistered = computed(() => !!currentUserInfo.value?.userName);
    const userName = computed(() => currentUserInfo.value?.userName || null);
    
    
    const currentLocale: ComputedRef<string> = computed({
        get: () => i18n.global.locale.value as string,
        set: (locale: string) => {
            const finalLocale = SUPPORT_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
            setLocale(finalLocale);
            if (isUserRegistered.value) {
                updateUserLocale(finalLocale);
            } else {
                sessionStorage.setItem('guestLocale', finalLocale);
            }
        }
    });

    const dictionariesWithUpdates = computed<DictionaryMeta[]>(() => {
        if (!_lastFetchedRemoteIndex.value?.dictionaries) return [];
        const localMap = new Map(availableDictionaries.value.map(d => [d.path, d]));
        return _lastFetchedRemoteIndex.value.dictionaries.reduce((updates: DictionaryMeta[], remoteDict) => {
            const localDict = localMap.get(remoteDict.path);
            // New dictionary not in local cache, or existing one with newer version
            if (!localDict || remoteDict.lastUpdate > (localDict.lastUpdate || 0)) {
                updates.push(remoteDict);
            }
            return updates;
        }, []);
    });

    // --- Main Actions ---

    async function _fetchRemoteIndex(): Promise<boolean> {
        try {
            const url = `${BASE_SERVER_URL}/dictionaries.json?t=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const fetchedIndex: GlobalIndex = await response.json();
            if (!fetchedIndex?.dictionaries || typeof fetchedIndex.generatedAt !== 'number') {
                throw new Error("Invalid remote index format");
            }
            _lastFetchedRemoteIndex.value = fetchedIndex;
            return true;
        } catch (error: any) {
            console.error("AppStore: Failed to fetch remote index:", error);
            updateCheckError.value = error.message;
            return false;
        }
    }
    
    async function loadGlobalIndex(): Promise<void> {
        if (_globalIndexPromise) return _globalIndexPromise;
        const promise = (async () => {
            if (globalIndexLoaded.value) return;
            isLoadingGlobalIndex.value = true;
            try {
                const cachedData = await getCachedGlobalDicts();
                if (cachedData?.dictionaries?.length) {
                    availableDictionaries.value = cachedData.dictionaries;
                    globalIndexServerInfo.value = cachedData.serverInfo || null;
                    globalIndexGeneratedAt.value = cachedData.generatedAt || null;
                    globalIndexLoaded.value = true;
                    isLoadingGlobalIndex.value = false;
                    _fetchRemoteIndex();
                } else {
                    if (await _fetchRemoteIndex()) {
                        const remoteIndex = _lastFetchedRemoteIndex.value!;
                        availableDictionaries.value = remoteIndex.dictionaries;
                        globalIndexServerInfo.value = remoteIndex.serverInfo || null;
                        globalIndexGeneratedAt.value = remoteIndex.generatedAt || null;
                        await cacheGlobalDicts(remoteIndex);
                    }
                }
            } catch (error) {
                console.error("AppStore: Critical error in loadGlobalIndex", error);
            } finally {
                isLoadingGlobalIndex.value = false;
                globalIndexLoaded.value = true;
                _globalIndexPromise = null;
            }
        })();
        _globalIndexPromise = promise;
        return promise;
    }

    async function checkForUpdates() {
        if (isCheckingForUpdates.value) return;
        isCheckingForUpdates.value = true;
        updateCheckError.value = null;
        await _fetchRemoteIndex();
        isCheckingForUpdates.value = false;
    }

    async function applyDiscoveredUpdates() {
        if (!_lastFetchedRemoteIndex.value) {
            emitter.emit('show-notification', { message: i18n.global.t('dictionarySelection.errorCheckingUpdates', { error: 'No update data available' }), type: 'error' });
            return;
        }
        if (dictionariesWithUpdates.value.length === 0) {
            emitter.emit('show-notification', { message: i18n.global.t('dictionarySelection.noUpdatesFound'), type: 'info' });
            return;
        }
        try {
            const newIndexData = _lastFetchedRemoteIndex.value!;
            availableDictionaries.value = [...newIndexData.dictionaries];
            globalIndexServerInfo.value = newIndexData.serverInfo || null;
            globalIndexGeneratedAt.value = newIndexData.generatedAt || null;
            await cacheGlobalDicts(newIndexData);
            _lastFetchedRemoteIndex.value = null;
            emitter.emit('show-notification', { message: "Wörterbuch-Updates angewendet.", type: 'success' });
        } catch (error: any) {
            emitter.emit('show-notification', { message: `Fehler beim Anwenden der Updates: ${error.message}`, type: 'error' });
        }
    }
    
    function selectDictionary(path: string | null) {
        if (path && (availableDictionaries.value.length === 0 || !availableDictionaries.value.some(d => d.path === path))) {
            selectedDictionaryPath.value = null;
            localStorage.removeItem('lastSelectedDictionaryPath');
            return;
        }
        selectedDictionaryPath.value = path;
        if (path) localStorage.setItem('lastSelectedDictionaryPath', path);
        else localStorage.removeItem('lastSelectedDictionaryPath');
    }

    function loadLastSelection() {
        const l = localStorage.getItem('lastSelectedDictionaryPath');
        if (l && availableDictionaries.value.some(d => d.path === l)) {
             selectedDictionaryPath.value = l;
        } else if (l) {
             selectedDictionaryPath.value = null;
             localStorage.removeItem('lastSelectedDictionaryPath');
        }
    }

    async function checkUserRegistration(): Promise<void> {
        if (_userInfoPromise) return _userInfoPromise;
        const promise = (async () => {
            if (checkedInitialUserStatus.value) return;
            isLoadingUserInfo.value = true;
            try {
                loadApiKeys();
                const userInfo = await getUserInfo();
                currentUserInfo.value = userInfo || null;
                
                if (userInfo?.locale) {
                    setLocale(SUPPORT_LOCALES.includes(userInfo.locale) ? userInfo.locale : DEFAULT_LOCALE);
                }
            } catch (error) {
                console.error("AppStore: Error checking user registration:", error);
                currentUserInfo.value = null; setLocale(DEFAULT_LOCALE);
            } finally {
                isLoadingUserInfo.value = false;
                checkedInitialUserStatus.value = true;
                _userInfoPromise = null;
            }
        })();
        _userInfoPromise = promise;
        return promise;
    }

    async function registerUser(name: string, locale: string = DEFAULT_LOCALE, enableSync: boolean) {
        const finalLocale = SUPPORT_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
        const newUserInfo: UserInfo = { userName: name, locale: finalLocale };
        try {
            await saveUserInfo(newUserInfo);
            sessionStorage.removeItem('guestLocale');
            currentUserInfo.value = newUserInfo;
            checkedInitialUserStatus.value = true;
            setLocale(finalLocale);
            
            const initialSettings = { ...DEFAULT_SETTINGS, enableCloudSync: enableSync };
            await saveAppSettings(initialSettings);
            
            await settingsStore.loadSettings(); 
            
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationWelcome', { name }), type: 'success' });
        } catch (error: any) {
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationRegistrationFailed', { error: error.message }), type: 'error' });
            throw error;
        }
    }
    
    async function updateUser(updatedInfo: Partial<Omit<UserInfo, 'locale'>>) {
        if (!currentUserInfo.value) return;
        const infoToSave: UserInfo = { ...currentUserInfo.value, ...updatedInfo };
        try {
            await saveUserInfo(infoToSave); 
            currentUserInfo.value = infoToSave;
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationProfileUpdated'), type: 'success' });
        } catch (error: any) {
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationUpdateFailed', { error: error.message }), type: 'error' });
            throw error;
        }
    }

    async function updateUserLocale(locale: string) {
        if (!currentUserInfo.value || locale === currentUserInfo.value.locale) return;
        const finalLocale = SUPPORT_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
        const infoToSave: UserInfo = { ...currentUserInfo.value, locale: finalLocale };
        try {
            await saveUserInfo(infoToSave); 
            currentUserInfo.value = infoToSave; 
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationSettingsSaved'), type: 'success' });
        } catch (error: any) {
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationUpdateFailed', { error: error.message }), type: 'error' });
        }
    }

    async function resetUserData() {
        try {
            await deleteUserInfo(); currentUserInfo.value = null; checkedInitialUserStatus.value = true; setLocale(DEFAULT_LOCALE);
        } catch (error: any) {
            emitter.emit('show-notification', { message: i18n.global.t('app.notificationGenericError', { error: error.message }), type: 'error' });
            throw error;
        }
    }
    
    function loadApiKeys() {
        const storedKeys = localStorage.getItem('apiKeys');
        if (storedKeys) {
            try { apiKeys.value = JSON.parse(storedKeys); } catch (e) { apiKeys.value = {}; }
        }
    }
    
    function setApiKey(provider: string, key: string) {
        apiKeys.value = { ...apiKeys.value, [provider]: key };
        localStorage.setItem('apiKeys', JSON.stringify(apiKeys.value));
        emitter.emit('show-notification', { message: i18n.global.t('app.notificationApiKeySaved', { provider: provider.toUpperCase() }), type: 'success' });
    }

    function clearApiKey(provider: string) {
        const newKeys = { ...apiKeys.value };
        delete newKeys[provider];
        apiKeys.value = newKeys;
        localStorage.setItem('apiKeys', JSON.stringify(newKeys));
        emitter.emit('show-notification', { message: i18n.global.t('app.notificationApiKeyRemoved', { provider: provider.toUpperCase() }), type: 'success' });
    }
    
    function $reset(hardReset: boolean = false) {
        _userInfoPromise = null;
        _globalIndexPromise = null;
        availableDictionaries.value = [];
        selectedDictionaryPath.value = null;
        isLoadingGlobalIndex.value = false;
        globalIndexLoaded.value = false;
        globalIndexServerInfo.value = null;
        globalIndexGeneratedAt.value = null;
        currentUserInfo.value = null;
        isLoadingUserInfo.value = false;
        checkedInitialUserStatus.value = false;
        settingsStore.$reset();
        
        _lastFetchedRemoteIndex.value = null;
        isCheckingForUpdates.value = false;
        updateCheckError.value = null;
        localStorage.removeItem('lastSelectedDictionaryPath');
        setLocale(DEFAULT_LOCALE);

        if (hardReset) {
            apiKeys.value = {};
            localStorage.removeItem('apiKeys');
        }
    }

    return {
        availableDictionaries, selectedDictionaryPath, isLoadingGlobalIndex, globalIndexLoaded,
        globalIndexServerInfo, globalIndexGeneratedAt,
        currentUserInfo, isLoadingUserInfo, checkedInitialUserStatus,
        apiKeys,
        isCheckingForUpdates, updateCheckError,
        selectedDictionary, isUserRegistered, userName, currentLocale,
        dictionariesWithUpdates,
        loadGlobalIndex,
        checkForUpdates,
        applyDiscoveredUpdates,
        selectDictionary, loadLastSelection,
        loadApiKeys, setApiKey, clearApiKey,
        checkUserRegistration, registerUser, updateUser, resetUserData, updateUserLocale,
        $reset
    };
});