<template>
  <div class="text-xs text-gray-600 dark:text-slate-400 space-y-2">
    <!-- App Version -->
    <div>
      <h3 class="font-semibold text-gray-700 dark:text-slate-200">{{ $t('versionInfo.appVersion') }}</h3>
      <p v-if="!isLoadingAppInfo && appInfo.version" class="font-mono">{{ appInfo.version }}</p>
      <p v-else class="italic">{{ $t('general.loading') }}</p>
    </div>
    
    <!-- Dictionary Versions -->
    <div>
      <div class="flex justify-between items-baseline">
        <h3 class="font-semibold text-gray-700 dark:text-slate-200">{{ $t('versionInfo.installedDicts') }}</h3>
        <span v-if="appStore.globalIndexGeneratedAt" class="font-mono text-gray-500 dark:text-slate-400" :title="new Date(appStore.globalIndexGeneratedAt).toString()">
            {{ $t('versionInfo.dataAsOf') }} {{ formatUnixTimestamp(appStore.globalIndexGeneratedAt) }}
        </span>
      </div>
      <ul v-if="appStore.availableDictionaries.length > 0" class="list-none mt-1 space-y-0.5">
        <li v-for="dict in appStore.availableDictionaries" :key="dict.path" class="flex justify-between items-baseline">
          <span class="text-gray-800 dark:text-slate-200 truncate pr-2">{{ dict.message }}</span>
          <span class="font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap">{{ dict.buildVersion || `v.${dict.version}` }}</span>
        </li>
      </ul>
      <p v-else class="italic mt-1">{{ $t('versionInfo.noDictsLoaded') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/appStore';
import { formatUnixTimestamp } from '@/utils/dateUtils';

const { t } = useI18n();
const appStore = useAppStore();
const appInfo = ref({ version: '' });
const isLoadingAppInfo = ref(true);

async function fetchAppInfo() {
    isLoadingAppInfo.value = true;
    try {
        const response = await fetch('/cicd.json?t=' + Date.now()); 
        if (response.ok) {
            const config = await response.json();
            appInfo.value = { version: config.appVersion || 'N/A' };
        } else {
            appInfo.value = { version: 'N/A' };
        }
    } catch (error) {
        appInfo.value = { version: 'N/A' };
    } finally {
        isLoadingAppInfo.value = false;
    }
}

onMounted(() => {
    fetchAppInfo();
    if (!appStore.globalIndexLoaded) {
        appStore.loadGlobalIndex();
    }
});
</script>