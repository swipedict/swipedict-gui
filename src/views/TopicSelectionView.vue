<template>
  <PageWrapper size="lg">
    <!-- Header -->
    <header class="text-center mb-6">
        <h1 class="text-xl sm:text-2xl font-heading font-bold text-slate-800 dark:text-white mb-1">{{ $t('topicSelection.title') }}</h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ dictionaryTitle || dictionaryPath }}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ $t('topicSelection.subtitle') }}</p>
    </header>

    <!-- Top Navigation -->
     <div class="mb-6 flex justify-between items-center bg-white dark:bg-surface-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
         <RouterLink :to="{ name: 'dictionarySelection' }" class="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-colors flex items-center" :title="$t('topicSelection.backToDictionariesTitle')">
           <ChevronLeftIcon class="h-4 w-4 mr-1" />
           {{ $t('topicSelection.changeDictionary') }}
         </RouterLink>
         <button @click="refreshDictionaryList" :disabled="appStore.isCheckingForUpdates || appStore.isLoadingGlobalIndex"
                 class="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-surface-700 rounded-full transition-colors disabled:opacity-50"
                 :title="$t('dictionarySelection.checkUpdatesTitle')">
            <ArrowPathIcon v-if="appStore.isCheckingForUpdates || appStore.isLoadingGlobalIndex" class="animate-spin h-5 w-5" />
            <ArrowPathIcon v-else class="h-5 w-5" />
         </button>
     </div>

    <!-- Loading -->
    <div v-if="store.isLoadingIndex || isLoadingDueCount" class="flex flex-col items-center justify-center py-10 text-slate-400">
        <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mb-3"></span>
        {{ $t('topicSelection.loadingIndexAndSrs') }}
    </div>

    <!-- Error -->
    <div v-else-if="store.dictionaryError && store.masterList.length === 0" class="my-4 text-center p-6 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-xl">
        <p class="font-bold text-red-600 dark:text-red-400 mb-2">{{ $t('topicSelection.errorLoadingDictionary') }}</p>
        <p class="text-sm text-red-500 dark:text-red-300 mb-4">{{ store.dictionaryError }}</p>
        <button @click="loadDictionaryAndDueCount" class="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
            {{ $t('topicSelection.tryAgain') }}
        </button>
    </div>

    <!-- Main Content -->
    <div v-else-if="store.masterList.length > 0" class="space-y-6">

        <!-- 1. SRS & Learning Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- SRS Card -->
            <div
                @click="startSrsReview"
                role="button"
                :tabindex="dueCardCount !== null && dueCardCount > 0 ? 0 : -1"
                class="relative overflow-hidden p-4 sm:p-5 rounded-2xl text-center transition-all duration-200 group border"
                :class="[
                    dueCardCount && dueCardCount > 0 
                        ? 'bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/20 border-amber-200 dark:border-amber-700 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0' 
                        : 'bg-slate-50 dark:bg-surface-800 border-slate-100 dark:border-slate-700 opacity-80 cursor-default'
                ]"
            >
                <div class="flex flex-col items-center relative z-10">
                    <div class="p-2.5 rounded-full mb-2" :class="dueCardCount && dueCardCount > 0 ? 'bg-white dark:bg-amber-800 text-amber-500' : 'bg-white dark:bg-surface-700 text-slate-400'">
                        <ClockIcon class="h-6 w-6" />
                    </div>
                    <h2 class="text-base font-bold mb-1" :class="dueCardCount && dueCardCount > 0 ? 'text-amber-900 dark:text-amber-100' : 'text-slate-500 dark:text-slate-400'">
                        {{ $t('topicSelection.srsFastReview.title') }}
                    </h2>
                    
                    <div v-if="isLoadingDueCount" class="text-xs text-slate-400 animate-pulse">Checking...</div>
                    <div v-else-if="dueCardCount !== null && dueCardCount > 0">
                        <span class="text-3xl font-heading font-bold text-amber-600 dark:text-amber-400">{{ dueCardCount }}</span>
                        <p class="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide mt-1">Cards Due</p>
                    </div>
                    <div v-else>
                        <p class="text-sm font-medium text-slate-400 dark:text-slate-500">{{ $t('topicSelection.srsFastReview.noneDue') }}</p>
                    </div>
                </div>
            </div>

            <!-- Learning Summary Card -->
            <RouterLink
                :to="{ name: 'learningSummary', params: { dictionaryPath: props.dictionaryPath } }"
                class="relative overflow-hidden p-4 sm:p-5 rounded-2xl text-center bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 group active:scale-95"
            >
                <div class="flex flex-col items-center">
                    <div class="p-2.5 bg-primary-50 dark:bg-surface-700 rounded-full mb-2 text-primary-500 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                        <ChartBarIcon class="h-6 w-6" />
                    </div>
                    <h2 class="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
                        {{ $t('topicSelection.learningSummary.linkText') }}
                    </h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('topicSelection.learningSummary.description') }}</p>
                </div>
            </RouterLink>
        </div>

        <!-- 2. Topics List -->
        <div class="space-y-4">
             <RouterLink
                :to="{ name: 'exploreTopic', params: { dictionaryPath: props.dictionaryPath, topicId: 'all' } }"
             class="flex items-center p-4 bg-gradient-to-r from-primary-500 to-indigo-600 rounded-xl shadow-md shadow-primary-500/25 text-white hover:shadow-lg hover:shadow-primary-500/35 hover:scale-[1.01] transition-all active:scale-[0.98] group"
            >
                <div class="p-2 bg-white/20 rounded-lg mr-4">
                    <RectangleStackIcon class="h-6 w-6 text-white" />
                </div>
                <div class="flex-grow">
                    <span class="text-lg font-bold block">{{ $t('topicSelection.allWords') }}</span>
                    <span class="text-xs text-primary-100 font-medium">
                        {{ $t('topicSelection.allWordsNew', { count: allWordsNoneCount }) }}
                    </span>
                </div>
                <ChevronRightIcon class="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </RouterLink>

            <!-- Filter label -->
            <p class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">{{ $t('topicSelection.studyByFilter') }}</p>

            <!-- Dynamic Grouped Topics -->
            <CollapsibleSection
                v-for="group in topicData.grouped"
                :key="group.key"
                :title="formatGroupKey(group.key)"
                :start-open="false"
                header-class="bg-white dark:bg-surface-800 border-slate-200 dark:border-slate-700 !text-sm !font-bold !py-3 !rounded-lg"
            >
                 <div class="grid gap-2 pt-2">
                    <RouterLink
                      v-for="topic in group.topics"
                      :key="topic.id"
                      :to="{ name: 'exploreTopic', params: { dictionaryPath: props.dictionaryPath, topicId: topic.id } }"
                      class="flex justify-between items-center p-3 bg-slate-50 dark:bg-surface-700/50 rounded-lg hover:bg-white dark:hover:bg-surface-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all group"
                    >
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize group-hover:text-primary-600 dark:group-hover:text-primary-400">{{ topic.name }}</span>
                        <span class="text-xs font-medium text-slate-400 bg-white dark:bg-surface-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-600 group-hover:border-primary-100 dark:group-hover:border-primary-900 transition-colors">
                            {{ topic.count }}
                        </span>
                    </RouterLink>
                 </div>
            </CollapsibleSection>

            <!-- Other Topics -->
            <CollapsibleSection
                v-if="topicData.other.length > 0"
                :title="$t('topicSelection.moreTopics', { count: topicData.other.length })"
                :start-open="false"
                header-class="bg-white dark:bg-surface-800 border-slate-200 dark:border-slate-700 !text-sm !font-bold !py-3 !rounded-lg"
            >
                 <div class="grid gap-2 pt-2">
                    <RouterLink
                      v-for="topic in topicData.other"
                      :key="topic.id"
                      :to="{ name: 'exploreTopic', params: { dictionaryPath: props.dictionaryPath, topicId: topic.id } }"
                      class="flex justify-between items-center p-3 bg-slate-50 dark:bg-surface-700/50 rounded-lg hover:bg-white dark:hover:bg-surface-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all group"
                    >
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize group-hover:text-primary-600 dark:group-hover:text-primary-400">{{ topic.name }}</span>
                        <span class="text-xs font-medium text-slate-400 bg-white dark:bg-surface-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-600">
                            {{ topic.count }}
                        </span>
                    </RouterLink>
                 </div>
            </CollapsibleSection>
        </div>
    </div>
     <div v-else-if="!store.isLoadingIndex && !store.dictionaryError" class="text-slate-500 mt-10 text-center italic">
        {{ $t('topicSelection.noWordsOrTopicsFound', { dict: dictionaryTitle || dictionaryPath }) }}
    </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useAppStore } from '@/stores/appStore';
import { getDueSrsCardsCount } from '@/services/db';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import { 
    ChevronLeftIcon, 
    ArrowPathIcon, 
    ClockIcon, 
    ChartBarIcon,
    RectangleStackIcon,
    ChevronRightIcon
} from '@heroicons/vue/24/outline'; // Using outline icons for cleaner look

interface SimpleTopicInfo { id: string; name: string; count: number; }
interface TopicGroup {
  key: string;
  order: number;
  topics: SimpleTopicInfo[];
}

const props = defineProps<{ dictionaryPath: string }>();
const router = useRouter();
const { t } = useI18n();

const store = useDictionaryStore();
const appStore = useAppStore();
const isLoadingDueCount = ref(true);
const dueCardCount = ref<number | null>(null);

const dictionaryTitle = computed(() => appStore.selectedDictionary?.message);

const GROUP_CONFIG = computed(() => {
    return {
        'level': { order: 1, name: t('topicSelection.groups.level'), sorter: (a: SimpleTopicInfo, b: SimpleTopicInfo) => a.id.localeCompare(b.id) },
        'pos': { order: 2, name: t('topicSelection.groups.pos') },
        'etymology': { order: 3, name: t('topicSelection.groups.etymology') }
    };
});

const allWordsNoneCount = computed(() => {
    if (store.isLoadingIndex || !store.masterList) return 0;
    return store.masterList.filter(entry => entry.metadata.state === 'NONE').length;
});

const topicData = computed(() => {
    const groups: Record<string, TopicGroup> = {};
    const otherTopics: SimpleTopicInfo[] = [];

    if (store.isLoadingIndex || !store.masterList || store.masterList.length === 0) {
        return { grouped: [], other: [] };
    }

    const topicsWithNewWords = store.masterList.filter(e => e.metadata.state === 'NONE');
    const topicCounts = new Map<string, number>();

    topicsWithNewWords.forEach(entry => {
        const allTags = new Set<string>(entry.tags || []);
        if (entry.part_of_speech) {
            allTags.add(`pos:${entry.part_of_speech}`);
        }
        allTags.forEach(tag => {
            topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
        });
    });

    topicCounts.forEach((count, rawTag) => {
        if (!rawTag) return;
        const parts = rawTag.split(':');
        if (parts.length === 2) {
            const key = parts[0].trim();
            const value = parts[1].trim();
            if (!key || !value) return;

            if (!groups[key]) {
                 const config = GROUP_CONFIG.value[key] || { order: 99, name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
                 groups[key] = { key, order: config.order, topics: [] };
            }
            groups[key].topics.push({ id: rawTag, name: value, count });
        } else {
            otherTopics.push({ id: rawTag, name: rawTag, count });
        }
    });
    
    Object.values(groups).forEach(group => {
        const sorter = GROUP_CONFIG.value[group.key]?.sorter;
        group.topics.sort(sorter || ((a, b) => a.name.localeCompare(b.name)));
    });
    
    const sortedGroups = Object.values(groups).sort((a, b) => a.order - b.order);
    otherTopics.sort((a, b) => a.name.localeCompare(b.name));

    return { grouped: sortedGroups, other: otherTopics };
});

function formatGroupKey(key: string): string {
    return GROUP_CONFIG.value[key]?.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function startSrsReview() {
    if (dueCardCount.value !== null && dueCardCount.value > 0) {
        router.push({ name: 'srsReview', params: { dictionaryPath: props.dictionaryPath } });
    }
}

async function loadDictionaryAndDueCount() {
  isLoadingDueCount.value = true;
  dueCardCount.value = null;

  if (!props.dictionaryPath) {
      isLoadingDueCount.value = false;
      return;
  }

  if (appStore.selectedDictionaryPath !== props.dictionaryPath) {
      appStore.selectDictionary(props.dictionaryPath);
  }
  
  if (store.currentDictionaryPath !== props.dictionaryPath || store.masterList.length === 0) {
      await store.loadDictionaryIndex(props.dictionaryPath);
  }

  if (store.dictionaryError && store.masterList.length === 0) { 
      isLoadingDueCount.value = false;
      return;
  }
  try {
      dueCardCount.value = await getDueSrsCardsCount(props.dictionaryPath, Date.now());
  } catch (error) {
      console.error("TopicSelectionView: Failed to fetch due SRS card count", error);
      dueCardCount.value = 0; 
  } finally {
       isLoadingDueCount.value = false;
  }
}

async function refreshDictionaryList() {
  await appStore.checkForUpdates(); 
  await loadDictionaryAndDueCount();
}

onMounted(() => {
  loadDictionaryAndDueCount();
});

watch(() => props.dictionaryPath, (newPath, oldPath) => {
  if (newPath && newPath !== oldPath) {
      isLoadingDueCount.value = true;
      dueCardCount.value = null;
      loadDictionaryAndDueCount(); 
  }
}, { immediate: false }); 
</script>