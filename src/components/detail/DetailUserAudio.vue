<template>
    <CustomMediaSection
        :title="$t('detailView.sections.myAudioNote')"
        :initial-content="initialUserAudioDataUrl"
        :save-button-text="$t('detailView.userAudio.saveButton')"
        :clear-button-text="$t('detailView.userAudio.clearButton')"
        @save="handleSaveUserAudio"
        @clear="handleClearUserAudio"
    >
        <template #default="{ currentContent }">
             <AudioRecorder
                ref="userAudioRecorderRef"
                lang="user"
                :initial-audio-data-url="currentContent"
            />
        </template>
    </CustomMediaSection>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import AudioRecorder from '@/components/AudioRecorder.vue';
import CustomMediaSection from './CustomMediaSection.vue';
import type { AudioRecorderInstance } from '@/types';
import emitter from '@/services/emitter';

const props = defineProps<{
    initialUserAudioDataUrl: string | null | undefined;
    wordId: string;
    dictionaryPath: string;
}>();

const emit = defineEmits<{
    (e: 'user-audio-updated', newUserAudioDataUrl: string | null | undefined): void;
}>();

const { t } = useI18n();
const customMediaStore = useCustomMediaStore();
const userAudioRecorderRef = ref<AudioRecorderInstance | null>(null);

async function handleSaveUserAudio() {
    if (!userAudioRecorderRef.value || customMediaStore.isSavingMediaGlobally) return;

    const audioDataUrlFromRecorder = await userAudioRecorderRef.value.getAudioDataUrl();

    if (!audioDataUrlFromRecorder) {
        emitter.emit('show-notification', { message: t('detailView.userAudio.notificationNoneRecorded'), type: 'error', duration: 2000 });
        return;
    }

    const result = await customMediaStore.saveCustomMediaAction(
        props.dictionaryPath,
        props.wordId,
        { userAudioDataUrl: audioDataUrlFromRecorder }
    );

    if (result.success && result.updatedMedia) {
        emit('user-audio-updated', result.updatedMedia.userAudioDataUrl);
        userAudioRecorderRef.value.clearRecording();
    }
}

async function handleClearUserAudio() {
    if (customMediaStore.isSavingMediaGlobally) return;
    userAudioRecorderRef.value?.clearRecording();

    const result = await customMediaStore.saveCustomMediaAction(
        props.dictionaryPath,
        props.wordId,
        { userAudioDataUrl: undefined }
    );

    if (result.success) {
        emit('user-audio-updated', undefined);
    }
}
</script>