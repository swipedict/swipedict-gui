<template>
    <div v-if="appStore.isUserRegistered" class="mt-6 border-t dark:border-slate-700 pt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
        <!-- Ignore Button -->
        <button
            @click="$emit('update-state', 'IGNORED')"
            :disabled="isSavingState || currentState === 'IGNORED'"
            class="action-button bg-red-500 hover:bg-red-600 disabled:opacity-50"
        >
            <ArrowPathIcon v-if="isSavingState" class="animate-spin h-5 w-5 mr-1.5" />
            <NoSymbolIcon v-else class="h-5 w-5 mr-1.5" />
            {{ isSavingState ? $t('detailView.state.saving') : $t('detailView.state.ignoreButton') }}
        </button>

        <!-- Keep Button -->
        <button
            @click="$emit('update-state', 'KEEP')"
            :disabled="isSavingState || currentState === 'KEEP'"
            class="action-button bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
             <ArrowPathIcon v-if="isSavingState" class="animate-spin h-5 w-5 mr-1.5" />
             <CheckIcon v-else class="h-5 w-5 mr-1.5" />
            {{ isSavingState ? $t('detailView.state.saving') : $t('detailView.state.keepButton') }}
        </button>

        <!-- Reset Button -->
        <button
            v-if="currentState !== 'NONE'"
            @click="$emit('update-state', 'NONE')"
            :disabled="isSavingState"
            class="action-button bg-gray-400 hover:bg-gray-500 disabled:opacity-50"
        >
            <ArrowPathIcon v-if="isSavingState" class="animate-spin h-5 w-5 mr-1.5" />
            <ArrowUturnLeftIcon v-else class="h-5 w-5 mr-1.5" />
            {{ isSavingState ? $t('detailView.state.saving') : $t('detailView.state.resetButton') }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { PropType } from 'vue';
import { ArrowPathIcon, NoSymbolIcon, CheckIcon, ArrowUturnLeftIcon } from '@heroicons/vue/20/solid';
import type { UserState } from '@/types';
import { useAppStore } from '@/stores/appStore';

const { t } = useI18n();
const appStore = useAppStore();

defineProps({
  currentState: {
    type: String as PropType<UserState>,
    required: true
  },
  isSavingState: {
    type: Boolean,
    default: false
  }
});

defineEmits<{
  (e: 'update-state', newState: UserState): void
}>();
</script>

<style scoped>
@reference "../../assets/main.css";
.action-button {
    @apply w-full sm:flex-1 sm:shrink-0 px-5 py-2 text-white rounded shadow transition duration-150 ease-in-out flex items-center justify-center font-semibold disabled:cursor-not-allowed;
}
</style>