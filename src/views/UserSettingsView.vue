<template>
  <PageWrapper size="xl">
    <PageHeader :title="$t('userSettings.title')" :back-to="{ name: 'profile' }" :back-label="$t('userSettings.profileLink')" />

     <div v-if="appStore.isLoadingSettings && !areSettingsLoadedOnce" class="text-center text-gray-500 dark:text-slate-400 p-10">
        <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></span>
        {{ $t('userSettings.loading') }}
     </div>

    <div v-else class="bg-white dark:bg-slate-900 dark:border dark:border-slate-700/60 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none">
        <div class="space-y-3">
            <InterfaceSettings />
            <AiSettings />
            <DisplaySettings />
            <AudioSettings />
            <SrsSettings />
        </div>

        <div class="mt-8 pt-4 border-t border-gray-200 dark:border-slate-700">
            <VersionInfo />
        </div>
    </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/appStore';
import VersionInfo from '@/components/VersionInfo.vue';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import PageHeader from '@/components/layout/PageHeader.vue';

// Import the new modular components
import InterfaceSettings from '@/components/settings/InterfaceSettings.vue';
import AiSettings from '@/components/settings/AiSettings.vue';
import DisplaySettings from '@/components/settings/DisplaySettings.vue';
import AudioSettings from '@/components/settings/AudioSettings.vue';
import SrsSettings from '@/components/settings/SrsSettings.vue';

const appStore = useAppStore();
const areSettingsLoadedOnce = ref(false);

onMounted(async () => {
    if (appStore.isLoadingSettings) await appStore.loadSettings();
    if (!appStore.checkedInitialUserStatus) await appStore.checkUserRegistration();
    areSettingsLoadedOnce.value = true;
});
</script>
