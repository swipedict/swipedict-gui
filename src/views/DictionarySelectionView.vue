<template>
  <PageWrapper size="lg">
    <PageHeader
      :title="$t('dictionarySelection.title')"
      :back-to="appStore.isUserRegistered ? { name: 'welcome' } : undefined"
      :hide-back="!appStore.isUserRegistered"
    >
      <template #action>
        <button @click="refreshDictionaryList" :disabled="appStore.isCheckingForUpdates"
                class="btn-icon disabled:opacity-50 disabled:cursor-wait"
                :title="$t('dictionarySelection.checkUpdatesTitle')">
          <svg v-if="appStore.isCheckingForUpdates" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          <span class="sr-only">{{ $t('dictionarySelection.checkUpdatesTitle') }}</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="appStore.isLoadingGlobalIndex && !appStore.globalIndexLoaded" class="text-gray-500 p-4 my-4">
      <span class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></span>
      {{ $t('dictionarySelection.loading') }}
    </div>

    <div v-else-if="appStore.availableDictionaries.length === 0 && appStore.globalIndexLoaded" class="text-red-500 p-4 border border-red-300 bg-red-100 rounded-lg shadow">
      <p><strong>{{ $t('general.error') }}:</strong> {{ $t('dictionarySelection.errorLoading') }}</p>
      <p class="text-sm">
        <button @click="forceInitialLoad" class="underline font-semibold hover:text-red-700">
            {{ $t('dictionarySelection.tryAgain') }}
        </button>
        {{ $t('general.or') }} {{ $t('dictionarySelection.checkConnection') }}.
      </p>
    </div>

    <div v-else class="space-y-4">
        <div v-if="downloader.isDownloading.value" class="fixed bottom-4 left-4 right-4 z-[2000] bg-gray-700 p-3 rounded-lg shadow-xl text-white text-sm">
            <div class="flex justify-between items-center mb-1">
                <span>{{ downloader.currentAction.value }}</span>
                <span>{{ downloader.progressPercentage.value }}%</span>
            </div>
            <div class="w-full bg-gray-500 rounded-full h-2.5 overflow-hidden">
                <div class="bg-blue-500 h-2.5 rounded-full transition-all duration-150" :style="{ width: downloader.progressPercentage.value + '%' }"></div>
            </div>
            <button @click="downloader.abortDownload()" class="text-xs text-gray-300 hover:text-white underline mt-2 float-right">
                {{ $t('dictionarySelection.prefetchCancel') }}
            </button>
        </div>

       <div v-if="appStore.dictionariesWithUpdates.length > 0" class="p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm text-yellow-800 dark:text-yellow-200 shadow">
           <p class="font-semibold mb-1">{{ $t('dictionarySelection.updatesAvailable', { count: appStore.dictionariesWithUpdates.length }) }}</p>
           <button @click="applyDiscoveredUpdates" class="mt-1 px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 font-semibold">
               {{ $t('dictionarySelection.applyUpdatesButton') }}
           </button>
       </div>
       
       <div v-if="appStore.updateCheckError" class="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md text-sm text-red-800 dark:text-red-200 shadow">
           {{ $t('dictionarySelection.errorCheckingUpdates', { error: appStore.updateCheckError }) }}
       </div>

       <div v-for="dict in appStore.availableDictionaries" :key="dict.path"
            @focusin="activeDropdown = dict.path" @focusout="activeDropdown = null"
            class="block glass-card p-4 hover:shadow-card-hover hover:-translate-y-px transition-all duration-150 ease-in-out text-left group relative focus-within:ring-2 focus-within:ring-primary-400 focus-within:ring-offset-1"
            :class="{ 'z-10': activeDropdown === dict.path }">
            <div @click="navigateToTopicSelection(dict.path)"
                 class="cursor-pointer"
                 role="button" tabindex="0" @keyup.enter="navigateToTopicSelection(dict.path)" @keyup.space="navigateToTopicSelection(dict.path)">
                <div class="flex justify-between items-start gap-2">
                   <div class="flex-grow min-w-0">
                       <span class="text-lg font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate block">{{ dict.message }}</span>
                       <span class="block text-xs text-gray-500 dark:text-slate-400 group-hover:text-gray-600">({{ dict.type }})</span>
                       <span v-if="dict.author" class="block text-xs text-gray-500 dark:text-slate-400 truncate">{{ $t('dictionarySelection.authorPrefix', 'by') }} {{ dict.author }}</span>
                        
                        <div v-if="dict.origin?.text" class="text-xs text-gray-500 mt-2 flex flex-wrap items-center gap-2 group-hover:text-gray-600">
                           <span class="sr-only">Herkunft des Wörterbuchs:</span>
                           <span class="italic">{{ dict.origin.text }}</span>
                           <MetadataTag v-if="dict.origin.source" :text="dict.origin.source" color="gray" icon="source" />
                        </div>

                        <a v-if="dict.feedback"
                           :href="generateFeedbackLink(dict.feedback)"
                           :target="isHttpLink(dict.feedback) ? '_blank' : '_self'"
                           rel="noopener noreferrer"
                           @click.stop
                           class="text-xs text-indigo-500 hover:text-indigo-700 hover:underline mt-1.5 inline-flex items-center">
                            {{ $t('dictionarySelection.feedback') }}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                   </div>
                   <div class="text-right flex-shrink-0 pl-2">
                       <span v-if="dict.version && String(dict.version).trim()" class="block text-xs font-mono text-gray-400 dark:text-slate-500 group-hover:text-gray-500" :title="$t('dictionarySelection.currentVersionTitle')">
                           v.{{ String(dict.version).trim() }}
                       </span>
                       <span v-else class="block text-xs font-mono text-gray-400 italic" :title="$t('dictionarySelection.versionUnknownTitle')">v.?</span>
                       
                       <span v-if="dict.buildVersion" class="block text-xs font-mono text-gray-500 group-hover:text-gray-600" :title="$t('dictionarySelection.buildVersionTitle')">
                           ({{ dict.buildVersion }})
                       </span>

                        <span v-if="dict.audioFiles !== undefined && dict.audioFiles > 0"
                              class="block text-xs font-mono text-gray-400 group-hover:text-gray-500 mt-0.5"
                              :title="$t('dictionarySelection.audioFilesDefined', { count: dict.audioFiles })">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 inline -mt-px text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3.055A7.001 7.001 0 004.94 8.343L2.657 6.06A1 1 0 001.243 7.474l2.344 2.344A6.962 6.962 0 003 11c0 1.01.214 1.96.592 2.828l-2.014 2.014a1 1 0 101.414 1.414l2.014-2.014A6.967 6.967 0 007 16.951V18a1 1 0 002 0v-1.05A7.002 7.002 0 0015.06 9.657l2.283 2.283a1 1 0 001.414-1.414l-2.283-2.283A6.962 6.962 0 0017 9c0-1.01-.214-1.96-.592-2.828l2.014-2.014a1 1 0 10-1.414-1.414l-2.014 2.014A6.967 6.967 0 0013 4.049V3a1 1 0 10-2 0v1.055zM10 13a2 2 0 100-4 2 2 0 000 4z" />
                                <path fill-rule="evenodd" d="M10 15a4 4 0 100-8 4 4 0 000 8zm0 1.5a5.5 5.5 0 100-11 5.5 5.5 0 000 11z" clip-rule="evenodd" />
                            </svg>
                            {{ dict.audioFiles }}
                       </span>
                       <span v-if="getUpdateInfo(dict.path) as DictionaryMeta | undefined" class="block text-xs text-yellow-600 font-semibold mt-0.5" :title="$t('dictionarySelection.updateAvailableTitle')">
                          » v.{{ getUpdateInfo(dict.path)?.version }} {{ $t('dictionarySelection.availableSuffix') }}
                       </span>
                       <div v-if="dict.lastUpdate" class="text-xs text-gray-400 mt-0.5" :title="'Server Last Update: ' + new Date(dict.lastUpdate).toLocaleString()">
                           Aktualisiert: {{ new Date(dict.lastUpdate).toLocaleDateString() }}
                       </div>
                   </div>
                </div>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                 <RouterLink :to="{ name: 'dictionaryBrowser', params: { dictionaryPath: dict.path } }"
                             class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-md transition-colors flex items-center"
                             :title="$t('dictionarySelection.browseDictionaryTooltip')"
                             @click.stop> 
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1.5">
                      <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Zm0 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8Zm0 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Z" />
                    </svg>
                    {{ $t('dictionarySelection.browseDictionary') }}
                 </RouterLink>
                 
                 <ActionDropdown button-text="Offline herunterladen" button-class="bg-blue-500 text-white hover:bg-blue-600 text-xs px-3 py-1.5">
                    <a href="#" @click.prevent="handleDownload(dict, 'audio')" class="text-gray-700 dark:text-slate-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-surface-700">Audio</a>
                    <a href="#" @click.prevent="handleDownload(dict, 'details')" class="text-gray-700 dark:text-slate-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-surface-700">Details</a>
                    <a href="#" @click.prevent="handleDownload(dict, 'all')" class="text-gray-700 dark:text-slate-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-surface-700">Alles</a>
                 </ActionDropdown>
            </div>
       </div>
    </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, RouterLink } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import type { DictionaryMeta } from '@/types';
import { useDataDownloader } from '@/composables/useDataDownloader';
import { downloadDictionaryAudio, downloadDictionaryDetails, type DownloadType } from '@/services/offlineDataService';
import emitter from '@/services/emitter';
import MetadataTag from '@/components/MetadataTag.vue';
import ActionDropdown from '@/components/ActionDropdown.vue';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import PageHeader from '@/components/layout/PageHeader.vue';

const { t } = useI18n();
const appStore = useAppStore();
const router = useRouter();
const downloader = useDataDownloader();

const activeDropdown = ref<string | null>(null);

function isHttpLink(link: string): boolean {
  return link.startsWith('http');
}

function generateFeedbackLink(feedbackValue: string): string {
  if (isHttpLink(feedbackValue)) {
    return feedbackValue;
  }
  return `mailto:${feedbackValue}`;
}

function getUpdateInfo(dictionaryPath: string): DictionaryMeta | undefined {
  return appStore.dictionariesWithUpdates.find(d => d.path === dictionaryPath);
}
async function refreshDictionaryList() {
  await appStore.checkForUpdates();
}
async function applyDiscoveredUpdates() {
  const updatesCount = appStore.dictionariesWithUpdates.length;
  if (updatesCount > 0 && window.confirm(t('dictionarySelection.applyUpdatesConfirm', { count: updatesCount }))) {
      await appStore.applyDiscoveredUpdates();
  } else if (updatesCount === 0) {
      emitter.emit('show-notification', { message: t('dictionarySelection.noUpdatesFound'), type: 'info' });
  }
}
async function forceInitialLoad() {
  appStore.globalIndexLoaded = false;
  await appStore.loadGlobalIndex();
}

function navigateToTopicSelection(dictionaryPath: string) {
  appStore.selectDictionary(dictionaryPath);
  router.push({ name: 'topicSelection', params: { dictionaryPath } }); 
}

async function handleDownload(dict: DictionaryMeta, type: DownloadType) {
    const totalItems = dict.audioFiles || 0;
    const signal = downloader.startDownload(`Lade ${type} für ${dict.message}...`, totalItems);
    if (!signal) {
        emitter.emit('show-notification', { message: 'Ein anderer Download läuft bereits.', type: 'error'});
        return;
    }

    try {
        if (type === 'audio') {
            await downloadDictionaryAudio(dict, (p) => downloader.updateProgress(p.current), signal);
        } else if (type === 'details') {
            await downloadDictionaryDetails(dict, (p) => downloader.updateProgress(p.current), signal);
        } else if (type === 'all') {
            await downloadDictionaryDetails(dict, (p) => downloader.updateProgress(p.current * 0.5), signal);
            if (signal.aborted) throw new Error("Aborted");
            await downloadDictionaryAudio(dict, (p) => downloader.updateProgress((totalItems * 0.5) + (p.current * 0.5)), signal);
        }
        emitter.emit('show-notification', { message: `Download für '${dict.message}' abgeschlossen!`, type: 'success'});
    } catch (error: any) {
        if (error.message !== 'Aborted') {
            emitter.emit('show-notification', { message: `Download fehlgeschlagen: ${error.message}`, type: 'error'});
        } else {
             emitter.emit('show-notification', { message: `Download abgebrochen.`, type: 'info'});
        }
    } finally {
        downloader.finishDownload();
    }
}

onMounted(() => {
    if (!appStore.globalIndexLoaded) {
        appStore.loadGlobalIndex();
    }
});
</script>