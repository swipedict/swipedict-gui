<template>
    <div class="captured-words-view w-full sm:max-w-2xl sm:mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-6 sm:pb-8">
        <PageHeader :title="$t('captures.title')" />

        <div v-if="captureStore.captureCount > 0" class="flex items-center justify-between mb-4">
            <p class="text-sm text-gray-500 dark:text-slate-400">{{ $t('captures.count', captureStore.captureCount) }}</p>
            <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm
                       text-gray-700 dark:text-slate-200 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                @click="downloadExport"
            >
                <ArrowDownTrayIcon class="w-4 h-4" /> {{ $t('captures.export') }}
            </button>
        </div>

        <ul v-if="captureStore.captureCount > 0" class="space-y-2">
            <li
                v-for="word in captureStore.capturedWords"
                :key="word.id"
                class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
            >
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <p class="font-semibold text-gray-900 dark:text-slate-100">{{ word.term }}</p>
                        <p v-if="word.context" class="text-sm text-gray-600 dark:text-slate-300 italic mt-0.5">“{{ word.context }}”</p>
                        <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">{{ formatDate(word.createdAt) }}</p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <a
                            :href="`https://dexonline.ro/definitie/${encodeURIComponent(word.term)}`"
                            target="_blank" rel="noopener noreferrer"
                            class="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                            :title="$t('captures.openDexonline')"
                        >
                            <ArrowTopRightOnSquareIcon class="w-4 h-4" />
                        </a>
                        <button
                            type="button"
                            class="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-slate-700"
                            :title="$t('captures.delete')"
                            @click="captureStore.remove(word.id)"
                        >
                            <TrashIcon class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </li>
        </ul>

        <p v-else class="text-center text-sm text-gray-400 dark:text-slate-500 py-10">
            {{ $t('captures.empty') }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useCaptureStore } from '@/stores/captureStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';

const captureStore = useCaptureStore();

onMounted(() => { if (!captureStore.isLoaded) captureStore.loadCapturedWords(); });

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function downloadExport() {
    const blob = new Blob([captureStore.exportAsJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swipedict_captures_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
</script>
