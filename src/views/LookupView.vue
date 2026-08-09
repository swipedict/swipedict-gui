<template>
    <div class="lookup-view w-full sm:max-w-2xl sm:mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-6 sm:pb-8">
        <PageHeader :title="$t('lookup.title')" />

        <!-- Search input -->
        <div class="relative mb-4">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
                ref="searchInput"
                v-model="query"
                type="search"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
                :placeholder="$t('lookup.placeholder')"
                class="w-full pl-10 pr-4 py-3 text-lg rounded-xl border border-gray-300 dark:border-slate-600
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
        </div>

        <!-- Loading dictionary index -->
        <div v-if="dictionaryStore.isLoadingIndex" class="text-sm text-gray-500 dark:text-slate-400 italic text-center py-6">
            <span class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2 mb-1"></span>
            <br>{{ $t('lookup.loadingIndex') }}
        </div>

        <!-- Results -->
        <ul v-else-if="results.length > 0" class="space-y-2">
            <li v-for="entry in results" :key="entry.id">
                <router-link
                    :to="{ name: 'detail', params: { dictionaryPath: dictionaryPath, wordId: entry.id } }"
                    class="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                           hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                >
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-gray-900 dark:text-slate-100 truncate">
                            {{ entry.target.headword }}
                            <span v-if="entry.target.genus" class="ml-1 text-xs font-normal text-gray-500 dark:text-slate-400">({{ genusAbbreviation(entry.target.genus) }})</span>
                        </p>
                        <p class="text-sm text-gray-600 dark:text-slate-300 truncate">{{ entry.source.headword }}</p>
                    </div>
                    <p v-if="entry.target.pronunciation" class="hidden sm:block text-xs text-gray-400 dark:text-slate-500 italic shrink-0">
                        {{ entry.target.pronunciation }}
                    </p>
                    <button
                        type="button"
                        class="p-2 rounded-full text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-700 shrink-0"
                        :title="$t('lookup.playAudio')"
                        @click.prevent.stop="playAudio(entry)"
                    >
                        <SpeakerWaveIcon class="w-5 h-5" />
                    </button>
                </router-link>
            </li>
        </ul>

        <!-- No results -->
        <div v-else-if="trimmedQuery" class="text-center py-8 space-y-4">
            <p class="text-gray-600 dark:text-slate-300">{{ $t('lookup.noResults', { term: trimmedQuery }) }}</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-2">
                <a
                    :href="`https://dexonline.ro/definitie/${encodeURIComponent(trimmedQuery)}`"
                    target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm
                           text-gray-700 dark:text-slate-200 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                >
                    <ArrowTopRightOnSquareIcon class="w-4 h-4" /> {{ $t('lookup.searchDexonline') }}
                </a>
                <a
                    :href="`https://ro.wiktionary.org/wiki/${encodeURIComponent(trimmedQuery)}`"
                    target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm
                           text-gray-700 dark:text-slate-200 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                >
                    <ArrowTopRightOnSquareIcon class="w-4 h-4" /> {{ $t('lookup.searchWiktionary') }}
                </a>
            </div>
        </div>

        <!-- Empty state -->
        <p v-else class="text-center text-sm text-gray-400 dark:text-slate-500 py-8">
            {{ $t('lookup.hint') }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, useTemplateRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { playSoundForItem } from '@/composables/useWordAudio';
import { normalizeSearchText, stripRomanianInflection, stripRomanianVerbMarker } from '@/utils/textUtils';
import type { WordEntry, GrammaticalGenus } from '@/types';
import PageHeader from '@/components/layout/PageHeader.vue';
import { MagnifyingGlassIcon, SpeakerWaveIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ dictionaryPath: string }>();

const route = useRoute();
const router = useRouter();
const dictionaryStore = useDictionaryStore();

const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const searchInput = useTemplateRef('searchInput');
const trimmedQuery = computed(() => query.value.trim());

// Keep ?q= in the URL so lookups are shareable and the PWA share-target can land here.
watch(trimmedQuery, (q) => {
    router.replace({ query: q ? { q } : {} });
});

onMounted(async () => {
    searchInput.value?.focus();
    // The store's watcher only loads on dictionary *change*; on a fresh page load with
    // the dictionary already selected nothing fires, so load explicitly (same as WordListView).
    await dictionaryStore.loadDictionaryIndex(props.dictionaryPath);
});

const MAX_RESULTS = 50;

/**
 * Ranked matching, Romanian-first: exact hit beats stem hit beats prefix hit beats
 * substring hit. The stem comparison is what lets inflected book forms ("cainelui",
 * "plecase") find their citation-form entries ("caine", "a pleca").
 */
const results = computed<WordEntry[]>(() => {
    const qNorm = normalizeSearchText(trimmedQuery.value);
    if (!qNorm) return [];
    const qStem = stripRomanianInflection(qNorm);

    const ranked: Array<{ entry: WordEntry; rank: number }> = [];
    for (const entry of dictionaryStore.masterList) {
        // normalizedSearch is precomputed as "sourceNorm|targetNorm" at index load.
        const [srcNorm, tgtNorm] = (entry.normalizedSearch ?? '').split('|');
        if (srcNorm === undefined || tgtNorm === undefined) continue;
        const tgtBare = stripRomanianVerbMarker(tgtNorm);

        let rank: number | null = null;
        if (srcNorm === qNorm || tgtNorm === qNorm || tgtBare === qNorm) rank = 0;
        else if (qStem !== qNorm && (tgtBare === qStem || tgtBare.startsWith(qStem))) rank = 1;
        else if (srcNorm.startsWith(qNorm) || tgtNorm.startsWith(qNorm) || tgtBare.startsWith(qNorm)) rank = 2;
        else if (srcNorm.includes(qNorm) || tgtNorm.includes(qNorm)) rank = 3;

        if (rank !== null) ranked.push({ entry, rank });
    }

    ranked.sort((a, b) => a.rank - b.rank || a.entry.target.headword.length - b.entry.target.headword.length);
    return ranked.slice(0, MAX_RESULTS).map(r => r.entry);
});

function genusAbbreviation(genus: GrammaticalGenus): string {
    return genus.charAt(0).toLowerCase();
}

function playAudio(entry: WordEntry) {
    playSoundForItem(entry, 'target', 'lookup-view');
}
</script>
