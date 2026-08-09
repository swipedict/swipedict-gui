<template>
    <!-- Glassmorphism Sticky Header for Lists -->
    <div class="w-full px-3 sm:px-4 py-3 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700 transition-all duration-300
                bg-white/80 dark:bg-surface-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        
        <!-- Row 1: Title + Actions -->
        <div class="flex items-center gap-2 mb-3 min-w-0">
            <h1 class="text-base sm:text-lg font-heading font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0">
                {{ dictionaryTitle || dictionaryPath }}
            </h1>
            
            <!-- Actions -->
            <div class="flex items-center gap-1.5 shrink-0">
                <!-- "+ Wort vorschlagen": show icon-only on xs, full label on sm+ -->
                <button @click="$emit('propose-new-word')"
                    class="text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/50 hover:bg-primary-100 dark:hover:bg-primary-900 px-2 sm:px-3 py-1.5 rounded-lg transition-colors flex items-center whitespace-nowrap active:scale-95">
                    <PlusIcon class="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
                    <span class="hidden sm:inline">{{ $t('dictionaryList.proposeWord') }}</span>
                </button>
                <button @click="toggleFilterBarVisibility" class="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-surface-800 rounded-md transition-colors active:scale-95 shrink-0">
                    <AdjustmentsHorizontalIcon class="w-5 h-5" />
                </button>
            </div>
        </div>

        <transition name="collapse">
            <div v-show="localIsFilterBarVisible" class="space-y-2">
                <!-- Search Input -->
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon class="h-4 w-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input 
                        type="search" 
                        id="browser-search" 
                        :value="searchTerm"
                        @input="$emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
                        :placeholder="searchPlaceholder" 
                        class="filter-input pl-9 py-2 bg-slate-50 dark:bg-surface-800 border-transparent focus:bg-white dark:focus:bg-surface-900"
                    >
                </div>
                
                <!-- Row 2: Result count + display mode toggle -->
                <div class="flex items-center justify-between gap-2 pt-0.5">
                    <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0 overflow-hidden">
                         <span class="shrink-0">{{ totalFilteredCount }}</span>
                         <span v-if="activeFilterCount > 0" class="flex items-center gap-1 text-primary-600 font-medium bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded shrink-0">
                            <FunnelIcon class="w-3 h-3" /> {{ activeFilterCount }}
                         </span>
                         <button v-if="activeFilterCount > 0" @click="$emit('clear-filters')" class="hover:text-red-500 hover:underline shrink-0">Reset</button>
                    </div>

                    <button
                        @click="$emit('cycle-display-mode')"
                        :title="$t('dictionaryList.displayMode.tooltip')"
                        class="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors shrink-0 whitespace-nowrap"
                    >
                        <span v-if="displayMode === 'all'">{{ sourceLangCode }}/{{ targetLangCode }}</span>
                        <span v-else-if="displayMode === 'sourceOnly'">{{ sourceLangCode }}</span>
                        <span v-else>{{ targetLangCode }}</span>
                    </button>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, FunnelIcon, PlusIcon } from '@heroicons/vue/24/outline';

const { dictionaryTitle, dictionaryPath, searchTerm, totalFilteredCount, renderedCount, isLoadingSrs = false, activeFilterCount = 0, displayMode, sourceLangCode, targetLangCode } = defineProps<{
    dictionaryTitle: string;
    dictionaryPath: string;
    searchTerm: string;
    totalFilteredCount: number;
    renderedCount: number;
    isLoadingSrs?: boolean;
    activeFilterCount?: number;
    displayMode: 'all' | 'sourceOnly' | 'targetOnly';
    sourceLangCode: string;
    targetLangCode: string;
}>();

const emit = defineEmits<{
    (e: 'update:searchTerm', value: string): void;
    (e: 'open-drawer'): void; // Can be triggered by the filter icon if needed, though mostly handled inline now
    (e: 'clear-filters'): void;
    (e: 'cycle-display-mode'): void;
    (e: 'propose-new-word'): void;
}>();

const { t } = useI18n();
const localIsFilterBarVisible = ref(true);

const searchPlaceholder = computed(() => t('dictionaryList.searchPlaceholder', { source: sourceLangCode, target: targetLangCode }));

function toggleFilterBarVisibility() {
    if (!localIsFilterBarVisible.value) {
        localIsFilterBarVisible.value = true;
    } else {
        // If closing, maybe trigger the advanced filter drawer instead?
        emit('open-drawer');
    }
}
</script>