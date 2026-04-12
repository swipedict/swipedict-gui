<template>
    <CustomMediaSection
        :title="$t('detailView.sections.myTextNote')"
        :initial-content="initialTextNote"
        :save-button-text="$t('detailView.textNote.saveButton')"
        :clear-button-text="$t('detailView.textNote.clearButton')"
        @save="handleSave"
        @clear="handleClear"
    >
        <template #default>
            <textarea
                ref="textareaRef"
                v-model="localNote"
                :placeholder="$t('detailView.textNote.placeholder')"
                class="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors text-sm min-h-[80px]"
                rows="4"
            ></textarea>
        </template>
    </CustomMediaSection>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import CustomMediaSection from './CustomMediaSection.vue';
import emitter from '@/services/emitter';

const props = defineProps<{
    initialTextNote: string | null | undefined;
    wordId: string;
    dictionaryPath: string;
}>();

const emit = defineEmits<{
    (e: 'text-note-updated', newTextNote: string | null | undefined): void;
}>();

const { t } = useI18n();
const customMediaStore = useCustomMediaStore();
const localNote = ref(props.initialTextNote || '');

watch(() => props.initialTextNote, (newVal) => {
    localNote.value = newVal || '';
});

async function handleSave() {
    if (customMediaStore.isSavingMediaGlobally) return;

    const noteToSave = localNote.value.trim();
    if (noteToSave === (props.initialTextNote || '').trim()) {
        emitter.emit('show-notification', { message: t('detailView.textNote.noChanges'), type: 'info', duration: 1500 });
        return;
    }

    const result = await customMediaStore.saveCustomMediaAction(
        props.dictionaryPath,
        props.wordId,
        { userTextNote: noteToSave || undefined }
    );

    if (result.success) {
        emit('text-note-updated', noteToSave || undefined);
    }
}

async function handleClear() {
    if (customMediaStore.isSavingMediaGlobally || !props.initialTextNote) return;

    localNote.value = '';
    const result = await customMediaStore.saveCustomMediaAction(
        props.dictionaryPath,
        props.wordId,
        { userTextNote: undefined }
    );

    if (result.success) {
        emit('text-note-updated', undefined);
    }
}
</script>