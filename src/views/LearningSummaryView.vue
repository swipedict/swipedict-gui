<template>
  <PageWrapper size="3xl">
    <!-- Header -->
    <PageHeader
      :title="$t('learningSummary.pageTitle')"
      :back-to="{ name: 'topicSelection', params: { dictionaryPath: currentDictionaryPath } }"
      :back-label="$t('learningSummary.goToTopics')"
    >
      <template #action>
        <button @click="loadAllSrsStats" :disabled="isLoading" class="btn-icon disabled:opacity-50" :title="$t('learningSummary.updateButtonTitle')">
          <svg v-if="isLoading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0115.357 2m0 0H15" /></svg>
        </button>
      </template>
    </PageHeader>
       <p v-if="dictionaryTitle" class="text-sm text-gray-500 text-center -mt-4 mb-6">{{ $t('learningSummary.dictionaryContext', { title: dictionaryTitle }) }}</p>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center text-gray-500 p-10">
             <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></span>
              {{ $t('learningSummary.loadingStatistics') }}
        </div>
        <!-- Error State -->
        <div v-else-if="loadError" class="text-center text-red-500 p-6 border border-red-200 bg-red-50 rounded shadow">
            {{ $t('learningSummary.errorLoadingStatistics', { error: loadError }) }}
            <button @click="loadAllSrsStats" class="block mx-auto mt-3 text-xs text-blue-600 hover:underline">
                {{ $t('general.tryAgain', 'Try again') }}
            </button>
        </div>
        <!-- No Data State (after successful load but no data) -->
        <div v-else-if="!allSrsDataForDict || allSrsDataForDict.length === 0" class="text-center text-gray-500 p-6 border border-gray-200 bg-gray-50 rounded shadow">
             {{ $t('learningSummary.noSrsDataMessage') }}
             <div class="mt-4">
                <RouterLink :to="{ name: 'topicSelection', params: { dictionaryPath: currentDictionaryPath } }" class="text-sm text-blue-600 hover:underline">
                    {{ $t('learningSummary.goToTopics') }}
                </RouterLink>
             </div>
        </div>

        <!-- Stats Display (only if data is loaded successfully and exists) -->
        <div v-else class="space-y-6 sm:space-y-8">
            <!-- Key Summary Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                <div class="bg-yellow-100 p-3 sm:p-4 rounded-lg shadow">
                    <div class="text-2xl sm:text-3xl font-bold text-yellow-700">{{ summaryStats.dueToday }}</div>
                    <div class="text-xs sm:text-sm text-yellow-800 mt-1">{{ $t('learningSummary.dueToday') }}</div>
                </div>
                <div class="bg-blue-100 p-3 sm:p-4 rounded-lg shadow">
                    <div class="text-2xl sm:text-3xl font-bold text-blue-700">{{ summaryStats.newCount }}</div>
                    <div class="text-xs sm:text-sm text-blue-800 mt-1">{{ $t('learningSummary.newCards') }}</div>
                </div>
                 <div class="bg-indigo-100 p-3 sm:p-4 rounded-lg shadow">
                    <div class="text-2xl sm:text-3xl font-bold text-indigo-700">{{ summaryStats.learningCount }}</div>
                    <div class="text-xs sm:text-sm text-indigo-800 mt-1">{{ $t('learningSummary.learningCards') }}</div>
                </div>
                 <div class="bg-green-100 p-3 sm:p-4 rounded-lg shadow">
                    <div class="text-2xl sm:text-3xl font-bold text-green-700">{{ summaryStats.matureCount }}</div>
                    <div class="text-xs sm:text-sm text-green-800 mt-1">{{ $t('learningSummary.matureCards', { days: MATURE_INTERVAL_DAYS }) }}</div>
                </div>
            </div>
            <div class="text-center text-sm text-gray-600">
                {{ $t('learningSummary.totalActiveCards') }} <span class="font-bold">{{ summaryStats.totalActive }}</span>
            </div>

            <!-- Leeches: words that keep being forgotten -->
            <div v-if="summaryStats.leechCount > 0" class="bg-rose-50 border border-rose-200 p-3 sm:p-4 rounded-lg">
                <div class="flex items-baseline gap-2">
                    <span class="text-2xl sm:text-3xl font-bold text-rose-700">{{ summaryStats.leechCount }}</span>
                    <span class="text-sm font-semibold text-rose-800">{{ $t('learningSummary.leechCards') }}</span>
                </div>
                <p class="text-xs text-rose-700/80 mt-1">{{ $t('learningSummary.leechHint', { count: LEECH_THRESHOLD }) }}</p>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mt-4">
                <!-- Forecast Chart -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="text-lg font-semibold text-gray-700 mb-3">{{ $t('learningSummary.forecastTitle') }}</h2>
                    <div class="chart-container h-64 md:h-72">
                        <Bar v-if="forecastChartData.labels.length > 0 && forecastChartData.datasets.length > 0 && forecastChartData.datasets[0].data.some(d => d > 0)" :data="forecastChartData" :options="chartOptions" />
                        <p v-else class="text-sm text-gray-500 italic flex items-center justify-center h-full">{{ $t('learningSummary.noDataForForecast') }}</p>
                    </div>
                </div>

                <!-- Card Distribution Chart -->
                 <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="text-lg font-semibold text-gray-700 mb-3">{{ $t('learningSummary.distributionTitle') }}</h2>
                    <div class="chart-container h-64 md:h-72">
                        <Pie v-if="distributionChartData.labels.length > 0 && distributionChartData.datasets.length > 0 && distributionChartData.datasets[0].data.some(d => d > 0)" :data="distributionChartData" :options="pieChartOptions" />
                         <p v-else class="text-sm text-gray-500 italic flex items-center justify-center h-full">{{ $t('learningSummary.noDataForDistribution') }}</p>
                    </div>
                </div>
            </div>

            <div class="text-center pt-4">
                <RouterLink :to="{ name: 'srsReview', params: { dictionaryPath: currentDictionaryPath } }" class="px-6 py-2.5 bg-yellow-500 text-white rounded-md shadow hover:bg-yellow-600 transition text-base font-semibold disabled:opacity-50" :class="{ 'opacity-60 cursor-not-allowed hover:bg-yellow-500': summaryStats.dueToday === 0 }" :event="summaryStats.dueToday === 0 ? '' : 'click'">
                    {{ $t('learningSummary.startReviewButtonText', { count: summaryStats.dueToday }) }}
                </RouterLink>
            </div>
        </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { db } from '@/services/db';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import type { SrsData } from '@/types';
import { useI18n } from 'vue-i18n';
import { MATURE_INTERVAL_DAYS, LEECH_THRESHOLD } from '@/services/srsConstants'; // <-- MODIFIED: Import constant

import { Bar, Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement);

interface SummaryStats { dueToday: number; dueTomorrow: number; newCount: number; learningCount: number; matureCount: number; totalActive: number; leechCount: number; }
interface ChartData { labels: string[]; datasets: { label: string; backgroundColor: string | string[]; data: number[]; borderColor?: string | string[]; borderWidth?: number; }[]; }

const { t } = useI18n();
const route = useRoute();
const appStore = useAppStore();

const isLoading = ref(true);
const loadError = ref<string | null>(null);
const currentDictionaryPath = ref(route.params.dictionaryPath as string || appStore.selectedDictionaryPath || '');
const dictionaryTitle = computed(() => appStore.availableDictionaries.find(d => d.path === currentDictionaryPath.value)?.message || currentDictionaryPath.value);

const allSrsDataForDict = ref<SrsData[]>([]);
const summaryStats = ref<SummaryStats>({ dueToday: 0, dueTomorrow: 0, newCount: 0, learningCount: 0, matureCount: 0, totalActive: 0, leechCount: 0 });
const forecastChartData = ref<ChartData>({ labels: [], datasets: [] });
const distributionChartData = ref<ChartData>({ labels: [], datasets: [] });

const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } };
const pieChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const } } };

async function loadAllSrsStats() {
    isLoading.value = true;
    loadError.value = null;
    allSrsDataForDict.value = [];
    forecastChartData.value = { labels: [], datasets: [] };
    distributionChartData.value = { labels: [], datasets: [] };
    summaryStats.value = { dueToday: 0, dueTomorrow: 0, newCount: 0, learningCount: 0, matureCount: 0, totalActive: 0, leechCount: 0 };

    const dictPath = currentDictionaryPath.value;

    if (!dictPath) {
        loadError.value = t('userProfile.noDictionarySelected'); // Using an existing key, can be more specific
        isLoading.value = false;
        return;
    }
    try {
        allSrsDataForDict.value = await db.srsData.where('dictionaryPath').equals(dictPath).toArray();
        if (allSrsDataForDict.value.length > 0) {
            processSrsData();
        } else {
            summaryStats.value = { dueToday: 0, dueTomorrow: 0, newCount: 0, learningCount: 0, matureCount: 0, totalActive: 0, leechCount: 0 };
        }
    } catch (error: any) {
        console.error("LearningSummaryView: Error loading SRS data:", error);
        loadError.value = error.message || t('general.error');
    } finally {
        isLoading.value = false;
    }
}

function processSrsData() {
    if (!allSrsDataForDict.value || allSrsDataForDict.value.length === 0) {
        summaryStats.value = { dueToday: 0, dueTomorrow: 0, newCount: 0, learningCount: 0, matureCount: 0, totalActive: 0, leechCount: 0 };
        forecastChartData.value = { labels: [], datasets: [] };
        distributionChartData.value = { labels: [], datasets: [] };
        return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
    
    let dueToday = 0;
    let newC = 0;
    let learningOrLapsedC = 0; 
    let youngC = 0;
    let matureC = 0;
    let leechC = 0;
    
    const forecastCounts: number[] = Array(7).fill(0);
    const dayLabels: string[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(todayStart + i * 24 * 60 * 60 * 1000);
        dayLabels.push(d.toLocaleDateString(appStore.currentLocale, { weekday: 'short', day: 'numeric', month: 'numeric' }));
    }

    allSrsDataForDict.value.forEach(card => {
        if (card.nextReviewDate <= todayEnd) {
            dueToday++;
        }

        for (let i = 0; i < 7; i++) {
            const dayStartLoop = todayStart + i * 24 * 60 * 60 * 1000;
            const dayEndLoop = dayStartLoop + 24 * 60 * 60 * 1000 - 1;
            if (card.nextReviewDate >= dayStartLoop && card.nextReviewDate <= dayEndLoop) {
                forecastCounts[i]++;
                break; 
            }
        }

        // Count leeches by the same rule the service applies, so cards that crossed the
        // threshold before this feature existed are picked up too.
        if (card.isLeech || card.lapses >= LEECH_THRESHOLD) {
            leechC++;
        }

        if (card.state === 'new') {
            newC++;
        } else if (card.state === 'learning' || card.state === 'lapsed') {
            learningOrLapsedC++;
        } else if (card.state === 'review') {
            if (card.interval >= MATURE_INTERVAL_DAYS) {
                matureC++;
            } else {
                youngC++;
            }
        }
    });

    summaryStats.value = {
        dueToday: dueToday,
        dueTomorrow: forecastCounts[1] || 0,
        newCount: newC,
        learningCount: learningOrLapsedC, 
        matureCount: matureC,
        totalActive: allSrsDataForDict.value.length,
        leechCount: leechC
    };

    forecastChartData.value = {
        labels: dayLabels,
        datasets: [{
            label: t('learningSummary.dueCardsAxisLabel'),
            backgroundColor: 'rgba(59, 130, 246, 0.7)', // blue-500
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            data: forecastCounts
        }]
    };

    distributionChartData.value = {
        labels: [t('learningSummary.newCards'), t('learningSummary.learningCards'), t('dictionaryList.status.NONE'), t('learningSummary.matureCards', { days: MATURE_INTERVAL_DAYS })], // Using 'Neu' for young, as there isn't a specific i18n key yet.
        datasets: [{
            label: t('learningSummary.distributionTitle'),
            backgroundColor: ['#60A5FA', '#FBBF24', '#A78BFA', '#34D399'], // Tailwind blue-400, amber-400, indigo-400, green-400
            borderColor: ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981'],
            borderWidth: 1,
            data: [newC, learningOrLapsedC, youngC, matureC] 
        }]
    };
}

onMounted(loadAllSrsStats);
</script>

<style scoped>
.chart-container {
  position: relative;
}
</style>