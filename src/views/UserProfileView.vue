<template>
  <PageWrapper size="lg">
    <PageHeader :title="$t('userProfile.title')" :back-to="{ name: 'welcome' }" />

       <div v-if="appStore.isLoadingUserInfo" class="text-center text-gray-500 dark:text-slate-400 p-6">
         <span class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></span>
         {{ $t('general.loading') }} Profil...
       </div>
       
      <div v-else-if="appStore.currentUserInfo" class="bg-white dark:bg-slate-900 dark:border dark:border-slate-700/60 p-6 rounded-lg shadow-md dark:shadow-none space-y-6">
          <!-- Username Display Section -->
          <div class="border-b dark:border-slate-700 pb-4">
              <h2 class="text-lg font-semibold mb-2 text-gray-700 dark:text-slate-200">{{ $t('register.usernameLabel') }}</h2>
              <p class="text-gray-800 dark:text-slate-100 font-medium bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-md">{{ appStore.userName }}</p>
          </div>

           <!-- Settings Link -->
          <div class="pb-4 border-b dark:border-slate-700">
               <h2 class="text-lg font-semibold mb-3 text-gray-700 dark:text-slate-200">{{ $t('userProfile.appSettingsTitle') }}</h2>
               <RouterLink :to="{ name: 'settings' }" class="block text-blue-600 hover:underline"> {{ $t('userProfile.changeAppSettingsLink') }} </RouterLink>
           </div>

           <!-- About/Legal Link -->
           <div class="pb-4 border-b dark:border-slate-700">
               <h2 class="text-lg font-semibold mb-3 text-gray-700 dark:text-slate-200">{{ $t('userProfile.aboutLegalTitle') }}</h2>
               <RouterLink :to="{ name: 'about' }" class="block text-blue-600 hover:underline"> {{ $t('userProfile.aboutLegalLink') }} </RouterLink>
           </div>

           <!-- Data Actions Section -->
          <div class="pt-4 space-y-4">
                <h2 class="text-lg font-semibold mb-3 text-gray-700 dark:text-slate-200">{{ $t('userProfile.accountDataTitle') }}</h2>

                <!-- Cloud Sync Component -->
                <SyncStatus />
                
                <!-- Classic Export Section -->
                <div v-if="!syncStore.importStatus.inProgress && !syncStore.importStatus.completed" class="pt-4 border-t dark:border-slate-700">
                    <h3 class="text-md font-medium text-gray-600 dark:text-slate-300 mb-2">{{ $t('userProfile.backupAndExport') }}</h3>
                     <div class="flex flex-wrap gap-2">
                        <button @click="handleFullStateExport" :disabled="isAnyActionInProgress" class="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition disabled:opacity-50 text-sm">{{ $t('userProfile.saveToDevice') }}</button>
                        <button @click="handleAnkiExport" :disabled="isAnyActionInProgress || !appStore.selectedDictionaryPath" class="px-4 py-2 bg-sky-600 text-white rounded-md shadow hover:bg-sky-700 transition disabled:opacity-50 text-sm">{{ isExportingAnki ? $t('userProfile.ankiExporting') : $t('userProfile.ankiExportButton') }}</button>
                    </div>
                </div>

                 <!-- Danger Zone -->
                 <div v-if="!syncStore.importStatus.inProgress && !syncStore.importStatus.completed" class="pt-4 border-t dark:border-slate-700">
                     <h3 class="text-md font-medium text-red-700 dark:text-red-400 mb-2">{{ $t('userProfile.dangerZone') }}</h3>
                     <button @click="resetUserConfirm" :disabled="isAnyActionInProgress" class="px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition disabled:opacity-50 text-sm">{{ isResetting ? $t('userProfile.resettingData') : $t('userProfile.resetDataButton') }}</button>
                 </div>
          </div>
      </div>
       <div v-else class="text-center text-red-500 p-4">
            {{ $t('userProfile.errorLoadingProfile') }}
            <RouterLink :to="{ name: 'register' }" class="underline">{{ $t('userProfile.registerAgainLink') }}</RouterLink>
        </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { useSyncStore } from '@/stores/syncStore';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { clearAllLocalData } from '@/services/db';
import { exportDataForAnki } from '@/services/ankiExportService';
import { exportFullState } from '@/services/stateService';
import emitter from '@/services/emitter';
import SyncStatus from '@/components/SyncStatus.vue';
import { isGoogleDriveEnabled } from '@/services/googleDriveService';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import PageHeader from '@/components/layout/PageHeader.vue';

const { t } = useI18n();
const appStore = useAppStore();
const syncStore = useSyncStore();
const dictionaryStore = useDictionaryStore();
const router = useRouter();

const isExportingAnki = ref(false);
const isResetting = ref(false);
const isExportingState = ref(false);

const isAnyActionInProgress = computed(() => 
    isExportingAnki.value || isResetting.value || isExportingState.value || 
    syncStore.isSyncing || syncStore.importStatus.inProgress
);

onMounted(async () => { if (!appStore.checkedInitialUserStatus) await appStore.checkUserRegistration(); });

async function resetUserConfirm() {
    if (isAnyActionInProgress.value) return;
    if (window.confirm(t('userProfile.resetDataConfirm'))) {
        isResetting.value = true;
        try {
            await clearAllLocalData(); 
            localStorage.clear(); sessionStorage.clear();
            // --- MODIFICATION: Call $reset with the hardReset flag ---
            appStore.$reset(true);
            dictionaryStore.$reset(); 
            emitter.emit('show-notification', { message: t('app.notificationResetSuccess'), type: 'success'});
            await router.replace({ name: 'register' });
        } catch (error: any) {
            emitter.emit('show-notification', { message: t('app.notificationResetFailed', { error: error.message }), type: 'error' });
        } finally {
            isResetting.value = false;
        }
    }
}

async function handleAnkiExport() {
    if (isAnyActionInProgress.value || !appStore.selectedDictionaryPath) return;
    isExportingAnki.value = true;
    try {
        const result = await exportDataForAnki();
        emitter.emit('show-notification', { message: result.message, type: result.success ? 'success' : 'error' });
    } finally {
        isExportingAnki.value = false;
    }
}

async function handleFullStateExport() {
    if (isAnyActionInProgress.value) return;
    isExportingState.value = true;
    try {
        const result = await exportFullState();
        if (result.success && result.data) {
            const { zipBlob, filename } = result.data;
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            emitter.emit('show-notification', { message: t('app.notificationBackupPrepared'), type: 'success' });
        } else {
            emitter.emit('show-notification', { message: t('app.notificationBackupError', { error: result.message }), type: 'error' });
        }
    } finally {
        isExportingState.value = false;
    }
}
</script>