<template>
    <!-- MODIFICATION: The component's root is a template that conditionally renders the content. -->
    <!-- It will render nothing if the feature is disabled in the build or by the user. -->
    <template v-if="isComponentVisible">
        <div class="p-3 text-center bg-gray-50 border border-gray-200 rounded-lg">
            <!-- Header: Title and Refresh Button -->
            <div class="flex justify-center items-center gap-3">
              <h3 class="text-sm font-semibold text-gray-700">{{ t('sync.title') }}</h3>
              <button @click="syncStore.checkRemoteSyncVersion()" :disabled="syncStore.isSyncing" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50" :title="t('sync.checkStatusTooltip')">
                  <svg v-if="syncStore.remoteSyncVersion === 'loading'" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001a7.5 7.5 0 0 0-4.992-.001ZM2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 14.49 0l3.181-3.183m-4.994 0-3.182-3.182a8.25 8.25 0 0 0-14.49 0l-3.182 3.182" />
                  </svg>
              </button>
            </div>
            
            <!-- Status Text -->
            <p class="text-xs text-gray-500 mt-1 font-mono">{{ syncStatusText }}</p>
            <p v-if="recommendationText" class="text-xs mt-1 font-semibold" :class="recommendationColor">{{ recommendationText }}</p>

            <!-- Push/Pull Buttons -->
            <div class="mt-3 flex justify-center gap-2">
                <button @click="syncStore.pullChangesFromCloud()" :disabled="!canPull" class="sync-button bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300" :title="t('sync.pullTooltip')">
                    <CloudArrowDownIcon class="h-4 w-4 mr-1.5" />
                    {{ t('sync.pull') }}
                </button>
                <button @click="syncStore.pushChangesToCloud()" :disabled="!canPush" class="sync-button bg-green-500 hover:bg-green-600 disabled:bg-green-300" :title="t('sync.pushTooltip')">
                    <CloudArrowUpIcon class="h-4 w-4 mr-1.5" />
                    {{ t('sync.push') }}
                </button>
            </div>

            <!-- Import Progress -->
            <div v-if="syncStore.importStatus.inProgress" class="mt-2">
                <p class="text-xs text-blue-700 mt-1 mb-1">{{ syncStore.importStatus.step }}</p>
                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-blue-600 h-1.5 rounded-full" :style="{ width: syncStore.importStatus.progress + '%' }"></div></div>
            </div>
            <div v-if="syncStore.importStatus.completed" class="mt-2">
                <p class="text-xs" :class="syncStore.importStatus.error ? 'text-red-600' : 'text-green-600'">{{ syncStore.importStatus.message }}</p>
                <button @click="syncStore.resetImportState()" class="text-xs text-gray-500 hover:underline mt-1">{{ t('general.close') }}</button>
            </div>
        </div>
    </template>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSyncStore } from '@/stores/syncStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { isGoogleDriveEnabled } from '@/services/googleDriveService';
import { CloudArrowDownIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline';

const { t } = useI18n();
const syncStore = useSyncStore();
const settingsStore = useSettingsStore();

const hasUnsyncedChanges = ref(localStorage.getItem('hasUnsyncedChanges') === 'true');
let dirtyCheckInterval: number | null = null;
onMounted(() => {
    dirtyCheckInterval = window.setInterval(() => {
        const isDirty = localStorage.getItem('hasUnsyncedChanges') === 'true';
        if (isDirty !== hasUnsyncedChanges.value) {
            hasUnsyncedChanges.value = isDirty;
        }
    }, 1000);
});
onUnmounted(() => {
    if (dirtyCheckInterval) clearInterval(dirtyCheckInterval);
});

const cloudSyncSetting = computed(() => settingsStore.settings?.enableCloudSync ?? false);

// --- MODIFICATION: The component's own visibility logic ---
const isComponentVisible = computed(() => {
    return isGoogleDriveEnabled && cloudSyncSetting.value;
});

const canPull = computed(() => {
    if (!cloudSyncSetting.value || syncStore.isSyncing) return false;
    const remote = syncStore.remoteSyncVersion;
    return typeof remote === 'number' && remote > 0;
});

const canPush = computed(() => {
    if (!cloudSyncSetting.value || syncStore.isSyncing) return false;
    return hasUnsyncedChanges.value;
});

const syncStatusText = computed(() => {
    if (!cloudSyncSetting.value) return t('sync.disabled');
    const localVersion = settingsStore.settings.syncVersion || 1;
    const remoteVersion = syncStore.remoteSyncVersion;
    const pendingText = hasUnsyncedChanges.value ? ` [${t('sync.pendingChanges')}]` : '';
    
    switch (remoteVersion) {
        case 'loading': return t('sync.checking');
        case 'error': return t('sync.statusError', { version: localVersion }) + pendingText;
        case 'no_backup': return t('sync.statusNoBackup', { version: localVersion }) + pendingText;
        case null: return t('sync.statusUnchecked', { version: localVersion }) + pendingText;
        default: return t('sync.statusChecked', { version: localVersion, remoteVersion }) + pendingText;
    }
});

const recommendationText = computed(() => {
    const remote = syncStore.remoteSyncVersion;
    const local = settingsStore.settings.syncVersion || 1;
    const isDirty = hasUnsyncedChanges.value;

    if (syncStore.isSyncing || remote === 'loading' || remote === null) return '';

    if (typeof remote === 'number' && remote > local && isDirty) {
        return t('sync.recommendConflict');
    }
    if (typeof remote === 'number' && remote > local) {
        return t('sync.recommendPull');
    }
    if (isDirty) {
        return t('sync.recommendPush');
    }
    if (remote !== 'error' && remote !== 'no_backup') {
        return t('sync.recommendInSync');
    }
    return '';
});

const recommendationColor = computed(() => {
    const text = recommendationText.value;
    if (text.includes(t('sync.conflictIdentifier'))) return 'text-red-600';
    if (text.includes(t('sync.pullIdentifier'))) return 'text-blue-600';
    if (text.includes(t('sync.pushIdentifier'))) return 'text-green-600';
    return 'text-gray-500';
});
</script>

<style scoped>
@reference "../assets/main.css";
.sync-button {
    @apply px-4 py-1.5 text-white text-xs font-semibold rounded shadow-sm hover:shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm;
}
</style>