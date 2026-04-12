<template>
    <CustomMediaSection
        :title="$t('detailView.sections.associateImage')"
        :initial-content="initialImageDataUrl"
        :save-button-text="$t('detailView.image.saveButton')"
        :clear-button-text="$t('detailView.image.clearButton')"
        @save="handleSaveImage"
        @clear="handleClearImage"
    >
        <template #default>
            <div
                @dragover.prevent
                @drop.prevent="handleDropImage"
                class="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center mb-3 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer min-h-[100px] flex flex-col justify-center items-center"
                role="button"
                tabindex="0"
                @click="triggerImageFileInput"
                @keyup.enter="triggerImageFileInput"
                :title="$t('detailView.tooltips.uploadImage')"
            >
                <img
                    v-if="imageDataToDisplay"
                    :src="imageDataToDisplay"
                    alt="Associated image preview"
                    class="max-w-full h-auto max-h-48 rounded mx-auto mb-2 shadow"
                />
                <p v-if="!imageDataToDisplay" class="text-gray-500 dark:text-slate-400 text-sm px-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-8 w-8 mx-auto text-gray-400 mb-1">
                      <path fill-rule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clip-rule="evenodd" />
                    </svg>
                    {{ $t('detailView.image.dropzonePlaceholder') }}
                </p>
                <p v-else class="text-gray-500 dark:text-slate-400 text-xs mt-1">
                    {{ $t('detailView.image.dropzoneReplace') }}
                </p>
                <input type="file" ref="fileInputRef" @change="handleUploadImage" accept="image/*" class="hidden" />
            </div>
            
            <AiImageGenerator
                v-if="hasApiKeys"
                :initial-prompt="aiPrompt"
                @image-generated="openEditor"
                @generation-error="handleGenerationError"
            />
            
            <p v-if="imageError" class="text-red-500 text-xs mt-1 text-right">{{ imageError }}</p>
        </template>
    </CustomMediaSection>
    
    <ImageEditorModal 
        :show="isEditorOpen"
        :image-url="imageForEditing"
        @confirm="onEditorConfirm"
        @cancel="onEditorCancel"
    />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/appStore';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import CustomMediaSection from './CustomMediaSection.vue';
import ImageEditorModal from '@/components/ImageEditorModal.vue';
import AiImageGenerator from '@/components/ai/AiImageGenerator.vue';
import emitter from '@/services/emitter';
import type { WordDetail } from '@/types';

const props = defineProps<{
    initialImageDataUrl: string | null | undefined;
    wordId: string;
    dictionaryPath: string;
    wordDetail: WordDetail | null;
}>();

const emit = defineEmits<{
    (e: 'image-updated', newImageDataUrl: string | null | undefined): void;
}>();

const { t } = useI18n();
const appStore = useAppStore();
const customMediaStore = useCustomMediaStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingImageDataUrl = ref<string | null>(null); 
const currentImageDataUrl = ref<string | null | undefined>(props.initialImageDataUrl); 
const imageError = ref<string | null>(null);

const isEditorOpen = ref(false);
const imageForEditing = ref<string | null>(null);
const aiPrompt = ref('');

const imageDataToDisplay = computed<string | undefined | null>(() => pendingImageDataUrl.value || currentImageDataUrl.value);
const hasApiKeys = computed(() => Object.keys(appStore.apiKeys).length > 0 && Object.values(appStore.apiKeys).some(key => !!key));

watch(() => props.initialImageDataUrl, (newVal) => { if (!pendingImageDataUrl.value) { currentImageDataUrl.value = newVal; } });

watch(() => props.wordDetail, (newDetail) => {
    if (newDetail) {
        aiPrompt.value = `A simple, clear icon of "${newDetail.target.headword || newDetail.source.headword}", digital art, on a pure white background.`;
    }
}, { immediate: true });

function openEditor(dataUrl: string) { imageForEditing.value = dataUrl; isEditorOpen.value = true; }
function onEditorConfirm(croppedDataUrl: string) { pendingImageDataUrl.value = croppedDataUrl; isEditorOpen.value = false; imageForEditing.value = null; imageError.value = null; }
function onEditorCancel() { isEditorOpen.value = false; imageForEditing.value = null; }

function handleImageInput(imageObject: Blob | File | null) {
    imageError.value = null; if (!imageObject) return; if (!imageObject.type.startsWith('image/')) { imageError.value = t('detailView.image.errorNotImage'); return; }
    const reader = new FileReader(); reader.onload = (e) => { openEditor(e.target?.result as string); }; reader.onerror = () => { imageError.value = t('detailView.image.errorReading'); }; reader.readAsDataURL(imageObject);
}

function handlePasteImage(event: ClipboardEvent) {
    const items = event.clipboardData?.items; if (!items) return;
    for (const item of items) { if (item.type.indexOf('image') !== -1) { const blob = item.getAsFile(); if (blob) { handleImageInput(blob); event.preventDefault(); return; } } }
    imageError.value = t('detailView.image.errorNoClipboard');
}

function handleDropImage(event: DragEvent) {
    imageError.value = null; event.preventDefault();
    if (event.dataTransfer?.files?.[0]) { handleImageInput(event.dataTransfer.files[0]); } 
    else { imageError.value = t('detailView.image.errorDrop'); }
}

function handleUploadImage(event: Event) {
    const target = event.target as HTMLInputElement; if (target.files?.[0]) { handleImageInput(target.files[0]); } target.value = ''; 
}

function triggerImageFileInput() { fileInputRef.value?.click(); }
function handleGenerationError(errorMessage: string) { imageError.value = errorMessage; if (errorMessage) emitter.emit('show-notification', { message: errorMessage, type: 'error' }); }

async function handleSaveImage() {
    if (!pendingImageDataUrl.value || customMediaStore.isSavingMediaGlobally) return;
    const result = await customMediaStore.saveCustomMediaAction(props.dictionaryPath, props.wordId, { imageDataUrl: pendingImageDataUrl.value });
    if (result.success) { currentImageDataUrl.value = pendingImageDataUrl.value; pendingImageDataUrl.value = null; imageError.value = null; emit('image-updated', currentImageDataUrl.value); }
}

async function handleClearImage() {
    if (customMediaStore.isSavingMediaGlobally) return;
    pendingImageDataUrl.value = null; imageError.value = null;
    const result = await customMediaStore.saveCustomMediaAction(props.dictionaryPath, props.wordId, { imageDataUrl: undefined });
    if (result.success) { currentImageDataUrl.value = undefined; emit('image-updated', undefined); }
}
</script>