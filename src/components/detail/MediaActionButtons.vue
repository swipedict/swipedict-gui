<template>
    <div class="mt-3 flex justify-end space-x-2">
        <button
            v-if="clearable"
            @click="$emit('clear')"
            :disabled="isSaving || !hasContent"
            class="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs rounded shadow hover:bg-gray-300 dark:hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
            <TrashIcon class="h-4 w-4 mr-1" />
            {{ clearButtonText }}
        </button>
        <button
            @click="$emit('save')"
            :disabled="isSaving"
            class="px-4 py-1.5 bg-blue-500 text-white text-xs rounded shadow hover:bg-blue-600 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <ArrowPathIcon v-if="isSaving" class="animate-spin h-4 w-4 -ml-1 mr-2" />
            <CheckCircleIcon v-else class="h-4 w-4 mr-1" />
            {{ isSaving ? savingButtonText : saveButtonText }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { TrashIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/vue/20/solid';

interface Props {
  isSaving: boolean;
  hasContent: boolean;
  clearable?: boolean;
  saveButtonText: string;
  clearButtonText: string;
  savingButtonText?: string;
}

const { clearable = true } = defineProps<Props>();

defineEmits(['save', 'clear']);
</script>