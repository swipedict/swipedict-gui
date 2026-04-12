<template>
    <transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[1000] bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4"
        @click.self="closeModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="propose-word-title"
      >
        <div class="bg-white dark:bg-[#0d0d26] dark:border dark:border-slate-700/60 rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[95vh]">
          <!-- Header -->
          <div class="p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 flex justify-between items-center flex-shrink-0">
             <h2 id="propose-word-title" class="text-base sm:text-lg font-semibold text-gray-800 dark:text-slate-100">
                 {{ $t('proposeWordModal.title', { dict: dictionaryTitle }) }}
              </h2>
            <button @click="closeModal" class="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full" :aria-label="$t('general.close')">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"></path></svg>
            </button>
          </div>
  
          <!-- Scrollable Content -->
          <div class="p-3 sm:p-4 flex-grow overflow-y-auto space-y-4 text-sm">
              <div class="form-section space-y-3">
                  <div>
                      <label for="propose-source" class="section-title mb-1 block">{{ $t('proposeWordModal.sourceWord') }}</label>
                      <input id="propose-source" v-model.trim="sourceText" :placeholder="$t('proposeWordModal.sourcePlaceholder')" class="form-input" />
                  </div>
                  <div>
                      <label for="propose-target" class="section-title mb-1 block">{{ $t('proposeWordModal.targetWord') }}</label>
                      <input id="propose-target" v-model.trim="targetText" :placeholder="$t('proposeWordModal.targetPlaceholder')" class="form-input" />
                  </div>
                  <div>
                      <label for="propose-notes" class="section-title mb-1 block">{{ $t('feedbackEditor.notesLabel') }}</label>
                      <textarea id="propose-notes" v-model.trim="notes" :placeholder="$t('feedbackEditor.notesPlaceholder')" class="form-textarea" rows="3"></textarea>
                  </div>
              </div>

              <!-- Contribution Checkbox -->
              <div class="form-section">
                  <div class="flex items-start">
                      <div class="flex items-center h-5">
                          <input id="propose-contribution-checkbox" v-model="contributionAccepted" type="checkbox" class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"/>
                      </div>
                      <div class="ml-3 text-xs">
                          <label for="propose-contribution-checkbox" class="text-gray-600 dark:text-slate-400">
                              {{ $t('feedbackEditor.contributionCheckbox') }}</label>
                      </div>
                  </div>
              </div>
          </div>
  
          <!-- Footer -->
          <div class="px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
              <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600">
                  {{ $t('general.cancel') }}
              </button>
              <button
                @click="handleSubmit"
                :disabled="isSubmitting || !contributionAccepted || !sourceText || !targetText"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                  <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ isSubmitting ? $t('general.submitting') : $t('general.submit') }}
              </button>
          </div>
        </div>
      </div>
    </transition>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, watch } from 'vue';
import emitter from '@/services/emitter';

const props = defineProps<{
    show: boolean;
    isSubmitting: boolean;
    dictionaryTitle: string | undefined;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', payload: { sourceText: string; targetText: string; notes: string }): void;
}>();

const { t } = useI18n();

const sourceText = ref('');
const targetText = ref('');
const notes = ref('');
const contributionAccepted = ref(false);

watch(() => props.show, (newVal) => {
    if (newVal) {
        // Reset form when modal opens
        sourceText.value = '';
        targetText.value = '';
        notes.value = '';
        contributionAccepted.value = false;
    }
});

function closeModal() {
    emit('close');
}

function handleSubmit() {
    // --- FIX: Access isSubmitting via the props object ---
    if (props.isSubmitting || !contributionAccepted.value || !sourceText.value || !targetText.value) {
        return;
    }
    emit('submit', {
        sourceText: sourceText.value,
        targetText: targetText.value,
        notes: notes.value
    });
}
</script>

<style scoped>
@reference "../assets/main.css";
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease-out; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.form-section { @apply bg-gray-50 dark:bg-slate-800/50 p-3 rounded-md border border-gray-200 dark:border-slate-700; }
.section-title { @apply text-xs font-bold uppercase text-gray-500 dark:text-slate-400; }
.form-input, .form-textarea { @apply w-full p-1.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500; }
</style>