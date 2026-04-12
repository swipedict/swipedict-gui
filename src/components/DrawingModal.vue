<template>
    <transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[1000] bg-black bg-opacity-60 flex items-center justify-center p-4"
        @click.self="closeModal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`modal-title-${uid}`"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden max-h-[80vh] flex flex-col">
          <!-- Header -->
          <div class="p-3 border-b bg-gray-50 flex justify-between items-center">
             <h2 :id="`modal-title-${uid}`" class="text-lg font-semibold text-gray-700">
                 {{ $t('detailView.sections.handwriting', { word: wordHeadword }) }}
              </h2>
            <button @click="closeModal" class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full" :aria-label="$t('general.close')">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
  
          <!-- Content -->
          <div class="p-4 flex-grow overflow-y-auto flex items-center justify-center bg-gray-100 modal-content-area"> 
            <div v-if="isLoading" class="text-gray-500">
              <span class="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></span>
              {{ $t('general.loading') }}
            </div>
            <div v-else-if="drawingDataUrl" class="w-full h-full flex justify-center items-center">
               <img :src="drawingDataUrl" :alt="$t('detailView.sections.handwriting', { word: '' })" class="max-w-full max-h-full object-contain" />
            </div>
            <div v-else class="text-gray-400 italic text-center p-6">
              {{ $t('drawingModal.noDrawing') }}
            </div>
          </div>
  
        </div>
      </div>
    </transition>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { XMarkIcon } from '@heroicons/vue/24/outline';
  
  defineProps<{
    show: boolean;
    drawingDataUrl: string | null | undefined; 
    isLoading: boolean;
    wordHeadword: string; 
  }>();
  
  const emit = defineEmits<{
    (e: 'close'): void;
  }>();

  const { t } = useI18n();
  const uid = Math.random().toString(36).substring(2, 9); 
  
  function closeModal() {
    emit('close');
  }
  </script>
  
  <style scoped>
  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: opacity 0.2s ease-out;
  }
  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }
  
  .modal-content-area img {
    max-height: calc(80vh - 100px); 
  }
  </style>