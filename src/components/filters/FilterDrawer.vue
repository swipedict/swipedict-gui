<template>
    <teleport to="body">
        <transition name="drawer-fade">
            <div
                v-if="isOpen"
                class="fixed inset-0 z-[2000] bg-black bg-opacity-50"
                @click.self="closeDrawer"
                aria-hidden="true"
            ></div>
        </transition>
        <transition name="drawer-slide">
            <div
                v-if="isOpen"
                ref="drawerPanel"
                class="fixed inset-y-0 right-0 z-[2001] w-full max-w-sm bg-white dark:bg-surface-900 shadow-xl flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="filter-drawer-title"
            >
                <!-- Header -->
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-surface-800">
                    <h2 id="filter-drawer-title" class="text-lg font-semibold text-gray-700 dark:text-slate-200">
                        Filter Wörterbuch
                    </h2>
                    <button @click="closeDrawer" class="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-full hover:bg-gray-200 dark:hover:bg-surface-700" aria-label="Filter schließen">
                        <XMarkIcon class="h-6 w-6" />
                    </button>
                </div>

                <!-- Scrollable Content Area -->
                <div class="flex-grow overflow-y-auto p-4 space-y-5">
                    <!-- Status Filter -->
                    <div class="filter-group-drawer">
                        <label class="filter-label-drawer">{{ $t('filterDrawer.status') }}</label>
                        <div class="filter-pill-group-drawer">
                            <button
                                v-for="option in localStatusOptions" :key="option.value"
                                @click="tempFilters.status = option.value"
                                :class="['filter-pill-drawer', tempFilters.status === option.value ? 'filter-pill-active-drawer' : 'filter-pill-inactive-drawer']">
                                {{ option.label }}
                            </button>
                        </div>
                    </div>

                    <!-- SRS Lernstatus Filter -->
                    <div class="filter-group-drawer">
                        <label class="filter-label-drawer">{{ $t('filterDrawer.srsStatus') }}</label>
                        <div class="filter-pill-group-drawer">
                            <button
                                v-for="option in localSrsOptions" :key="option.value"
                                @click="tempFilters.srsMode = option.value"
                                :class="['filter-pill-drawer', tempFilters.srsMode === option.value ? 'filter-pill-active-drawer' : 'filter-pill-inactive-drawer']">
                                {{ option.label }}
                            </button>
                        </div>
                    </div>
                    
                    <!-- Categorized Tag Filters (Now includes Part of Speech) -->
                    <div v-for="[category, values] in Array.from(availableCategorizedTags.categories.entries()).sort((a, b) => a[0].localeCompare(b[0]))" :key="category" class="filter-group-drawer">
                        <label :for="`drawer-category-${category}`" class="filter-label-drawer capitalize">{{ category.replace(/_/g, ' ') }}</label>
                        <select :id="`drawer-category-${category}`" v-model="tempFilters.categorized[category]" class="filter-select-drawer">
                            <option :value="null">Alle</option>
                            <option v-for="value in Array.from(values).sort()" :key="value" :value="value">{{ value }}</option>
                        </select>
                    </div>
                    
                    <!-- Simple Tag Filter -->
                    <div v-if="availableCategorizedTags.simpleTags.size > 0" class="filter-group-drawer">
                        <label for="drawer-simple-tag-filter" class="filter-label-drawer">{{ $t('filterDrawer.otherTags') }}</label>
                        <select id="drawer-simple-tag-filter" v-model="tempFilters.simpleTag" class="filter-select-drawer">
                            <option :value="null">Alle</option>
                            <option v-for="tagItem in Array.from(availableCategorizedTags.simpleTags).sort()" :key="tagItem" :value="tagItem">{{ tagItem }}</option>
                        </select>
                    </div>


                </div>

                <!-- Footer Actions -->
                <div class="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-surface-800 flex justify-end space-x-3">
                    <button
                        @click="clearAndClose"
                        type="button"
                        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-surface-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Filter zurücksetzen
                    </button>
                    <button
                        @click="applyAndClose"
                        type="button"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Anwenden
                    </button>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { watch, reactive, onMounted, onUnmounted, computed, useTemplateRef } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { useI18n } from 'vue-i18n';
import type { UserState, SrsFilterMode, CategorizedTags } from '@/types';

type FilterValues = {
    status: UserState | 'ALL';
    srsMode: SrsFilterMode;
    simpleTag: string | null;
    categorized: Record<string, string>;
};

const { isOpen, currentFilters, availableCategorizedTags = { categories: new Map(), simpleTags: new Set() } } = defineProps<{
    isOpen: boolean;
    currentFilters: FilterValues;
    availableCategorizedTags?: CategorizedTags;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'apply-filters', filters: FilterValues): void;
    (e: 'clear-filters'): void;
}>();

const { t } = useI18n();
const drawerPanel = useTemplateRef('drawerPanel');

// Temporary filters within the drawer
const tempFilters = reactive<FilterValues>({
    status: currentFilters.status,
    srsMode: currentFilters.srsMode,
    simpleTag: currentFilters.simpleTag,
    categorized: { ...currentFilters.categorized },
});

const localStatusOptions = computed(() => [
    { value: 'ALL' as const, label: t('general.all') },
    { value: 'NONE' as const, label: t('dictionaryList.status.NONE') },
    { value: 'KEEP' as const, label: t('dictionaryList.status.KEEP') },
    { value: 'IGNORED' as const, label: t('dictionaryList.status.IGNORED') }
 ]);

 const localSrsOptions = computed(() => [
    { value: 'all' as const, label: 'Alle (SRS)' },
    { value: 'in_srs' as const, label: 'Im SRS' },
    { value: 'not_in_srs' as const, label: 'Nicht im SRS' }
 ]);

// Update temporary filters when props change (e.g., if parent clears filters)
watch(() => currentFilters, (newFilters) => {
    tempFilters.status = newFilters.status;
    tempFilters.srsMode = newFilters.srsMode;
    tempFilters.simpleTag = newFilters.simpleTag;
    tempFilters.categorized = { ...newFilters.categorized };
}, { deep: true });


function closeDrawer() {
    emit('close');
}

function applyAndClose() {
    const cleanCategorized: Record<string, string> = {};
    for (const [key, value] of Object.entries(tempFilters.categorized)) {
        if (value) {
            cleanCategorized[key] = value;
        }
    }
    emit('apply-filters', { ...tempFilters, categorized: cleanCategorized });
    closeDrawer();
}

function clearAndClose() {
    emit('clear-filters');
    closeDrawer();
}

// Handle Escape key to close
const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
        closeDrawer();
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
});

</script>

