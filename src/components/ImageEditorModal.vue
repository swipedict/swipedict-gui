<template>
  <transition name="modal-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[2000] bg-black bg-opacity-70 flex items-center justify-center p-4"
      @click.self="cancel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`image-editor-title`"
      data-no-swipe="true"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="p-3 border-b bg-gray-50 flex justify-between items-center">
          <h2 id="image-editor-title" class="text-lg font-semibold text-gray-700">
            {{ $t('imageEditor.title') }}
          </h2>
          <div class="flex items-center gap-2">
            <!-- Rotate 90° Button -->
            <button @click="rotateImage" class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-full" :aria-label="$t('imageEditor.rotate')">
              <ArrowPathIcon class="h-6 w-6 transform -scale-x-100" />
            </button>
            <!-- Confirm Button -->
            <button @click="confirm" class="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-full" :aria-label="$t('general.confirm')">
              <CheckIcon class="h-6 w-6" />
            </button>
            <!-- Cancel Button -->
            <button @click="cancel" class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full" :aria-label="$t('general.cancel')">
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
        </div>

        <!-- Cropper -->
        <div class="cropper-container flex-grow min-h-0 bg-gray-200">
          <cropper
            v-if="imageUrl"
            ref="cropperRef"
            class="transparent-background-cropper"
            :src="imageUrl"
            :stencil-props="{ aspectRatio: 16 / 9 }"
            :canvas="{ maxWidth: 512 }"
            image-restriction="none"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Cropper } from 'vue-advanced-cropper';
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import 'vue-advanced-cropper/dist/style.css';

const props = defineProps<{
  show: boolean;
  imageUrl: string | null;
}>();

const emit = defineEmits<{
  (e: 'confirm', dataUrl: string): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const rotation = ref(0);

function cancel() {
  emit('cancel');
}

function confirm() {
  if (cropperRef.value) {
    const { canvas } = cropperRef.value.getResult();
    if (canvas) {
      const resultDataUrl = canvas.toDataURL('image/webp', 0.75);
      emit('confirm', resultDataUrl);
    }
  }
}

function rotateImage() {
  if (cropperRef.value) {
    rotation.value = (rotation.value + 90) % 360;
    cropperRef.value.rotate(rotation.value);
  }
}
</script>

<style>
/* This style must be global (not scoped) to override the library's default styles */
.transparent-background-cropper .vue-advanced-cropper__background {
  background: transparent;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>