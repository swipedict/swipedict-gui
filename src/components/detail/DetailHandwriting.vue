<template>
    <CustomMediaSection
        :title="`${$t('detailView.sections.practiceWriting')} ${wordHeadword}`"
        :initial-content="initialDrawingDataUrl"
        :save-button-text="$t('detailView.handwriting.saveButton')"
        :clear-button-text="$t('detailView.handwriting.clearButton')"
        @save="handleSaveDrawing"
        @clear="handleClearDrawing"
    >
        <template #default="{ currentContent }">
            <HandwritingCanvas
                ref="canvasRef"
                :initial-drawing-data-url="currentContent"
            />
        </template>
    </CustomMediaSection>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import HandwritingCanvas from '@/components/HandwritingCanvas.vue';
import CustomMediaSection from './CustomMediaSection.vue';
import type { HandwritingCanvasInstance } from '@/types';
import emitter from '@/services/emitter';

const props = defineProps<{
    initialDrawingDataUrl: string | null | undefined;
    wordId: string;
    dictionaryPath: string;
    wordHeadword: string;
}>();

const emit = defineEmits<{
    (e: 'drawing-updated', newDrawingDataUrl: string | null | undefined): void;
}>();

const { t } = useI18n();
const customMediaStore = useCustomMediaStore();
const canvasRef = ref<HandwritingCanvasInstance | null>(null);

async function handleSaveDrawing() {
    if (!canvasRef.value || customMediaStore.isSavingMediaGlobally) return;

    const drawingDataUrlFromCanvas = canvasRef.value.exportDrawing();

    if (drawingDataUrlFromCanvas === "" && !props.initialDrawingDataUrl) {
        emitter.emit('show-notification', {
            message: t('detailView.errorGeneric', { error: 'Zeichenfläche ist leer.' }),
            type: 'error',
            duration: 2000
        });
        return;
    }

    const result = await customMediaStore.saveCustomMediaAction(
        props.dictionaryPath,
        props.wordId,
        { drawingDataUrl: drawingDataUrlFromCanvas || undefined }
    );

    if (result.success) {
        emit('drawing-updated', drawingDataUrlFromCanvas || undefined);
    }
}

async function handleClearDrawing() {
    if (customMediaStore.isSavingMediaGlobally) return;
    canvasRef.value?.clearCanvas();

    const result = await customMediaStore.saveCustomMediaAction(
        props.dictionaryPath,
        props.wordId,
        { drawingDataUrl: undefined }
    );

    if (result.success) {
        emit('drawing-updated', undefined);
    }
}
</script>