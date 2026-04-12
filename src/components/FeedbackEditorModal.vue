<template>
    <transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[1000] bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4"
        @click.self="closeModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-editor-title"
      >
        <div v-if="editableWord" class="bg-white dark:bg-[#0d0d26] dark:border dark:border-slate-700/60 rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[95vh]">
          <!-- Header -->
          <div class="p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 flex justify-between items-center flex-shrink-0">
             <h2 id="feedback-editor-title" class="text-base sm:text-lg font-semibold text-gray-800 dark:text-slate-100">
                 {{ $t('feedbackEditor.title', { term: originalWordDetail.target.headword }) }}
              </h2>
            <button @click="closeModal" class="p-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full" :aria-label="$t('general.close')">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"></path></svg>
            </button>
          </div>
  
          <!-- Scrollable Content -->
          <div class="p-3 sm:p-4 flex-grow overflow-y-auto space-y-4 text-sm">
              <!-- Core Details (Always Visible) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="form-section">
                      <h3 class="section-title">{{ $t('feedbackEditor.sourceLang', { lang: originalWordDetail.sourceLanguage.toUpperCase() }) }}</h3>
                      <input v-model="editableWord.source.headword" :placeholder="$t('feedbackEditor.headword')" class="form-input" />
                      <input v-model="editableWord.source.pronunciation" :placeholder="$t('feedbackEditor.pronunciation')" class="form-input mt-1" />
                  </div>
                  <div class="form-section">
                      <h3 class="section-title">{{ $t('feedbackEditor.targetLang', { lang: originalWordDetail.targetLanguage.toUpperCase() }) }}</h3>
                      <input v-model="editableWord.target.headword" :placeholder="$t('feedbackEditor.headword')" class="form-input" />
                      <input v-model="editableWord.target.headword_definite" :placeholder="$t('feedbackEditor.definiteForm')" class="form-input mt-1" />
                      <input v-model="editableWord.target.pronunciation" :placeholder="$t('feedbackEditor.pronunciation')" class="form-input mt-1" />
                  </div>
              </div>

              <CollapsibleSection :title="$t('feedbackEditor.metadata')">
                <div class="pt-2 space-y-4">
                  <!-- Part of Speech Dropdown -->
                  <div class="form-section">
                      <label for="pos-select" class="section-title mb-1 block">{{ $t('feedbackEditor.pos') }}</label>
                      <select id="pos-select" v-model="editableWord.part_of_speech" class="form-input">
                          <option value="">{{ $t('feedbackEditor.selectEmpty') }}</option>
                          <option v-for="pos in availablePartsOfSpeech" :key="pos" :value="pos">{{ pos }}</option>
                      </select>
                  </div>
                  <!-- Tags Dropdown List -->
                  <div class="form-section">
                      <h3 class="section-title">{{ $t('feedbackEditor.tags') }}</h3>
                      <div v-for="(tag, tIndex) in editableWord.tags" :key="tIndex" class="flex items-center gap-2 mb-1.5">
                           <select v-model="editableWord.tags[tIndex]" class="form-input flex-grow">
                               <option value="">{{ $t('feedbackEditor.selectTag') }}</option>
                               <option v-for="availableTag in allAvailableTags" :key="availableTag" :value="availableTag">
                                   {{ availableTag }}
                               </option>
                           </select>
                           <button @click="removeTag(tIndex)" class="remove-btn-icon" :title="$t('feedbackEditor.removeTag')">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                           </button>
                      </div>
                      <button @click="addTag" class="add-btn mt-1">{{ $t('feedbackEditor.addTag') }}</button>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection :title="$t('feedbackEditor.senses')">
                  <div class="pt-2 space-y-3">
                    <div v-for="(sense, sIndex) in editableWord.senses" :key="sIndex" class="border-l-2 border-blue-200 dark:border-blue-800/50 pl-3 pt-2 pb-3 space-y-2 relative form-section bg-white dark:bg-slate-800/40">
                        <button @click="removeSense(sIndex)" class="absolute top-1 right-1 remove-btn-icon" :title="$t('feedbackEditor.removeSense')">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                        </button>
                        <input v-model="sense.gloss" :placeholder="$t('feedbackEditor.gloss')" class="form-input font-semibold" />
                        <textarea v-model="sense.explanation.sourceText" :placeholder="$t('feedbackEditor.explanationSource')" class="form-textarea" rows="2"></textarea>
                        <textarea v-model="sense.explanation.targetText" :placeholder="$t('feedbackEditor.explanationTarget')" class="form-textarea" rows="2"></textarea>
                    </div>
                    <button @click="addSense" class="add-btn">{{ $t('feedbackEditor.addSense') }}</button>
                  </div>
              </CollapsibleSection>

              <CollapsibleSection :title="$t('feedbackEditor.examples')">
                  <div class="pt-2 space-y-3">
                      <div v-for="(example, eIndex) in editableWord.examples" :key="eIndex" class="border-l-2 border-green-200 dark:border-green-800/50 pl-3 pt-2 pb-3 space-y-1 relative form-section bg-white dark:bg-slate-800/40">
                          <button @click="removeExample(eIndex)" class="absolute top-1 right-1 remove-btn-icon" :title="$t('feedbackEditor.removeExample')">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                          </button>
                          <textarea v-model="example.sourceText" :placeholder="$t('feedbackEditor.examplePlaceholder', { index: eIndex+1, lang: 'Source' })" class="form-textarea"></textarea>
                          <textarea v-model="example.targetText" :placeholder="$t('feedbackEditor.examplePlaceholder', { index: eIndex+1, lang: 'Target' })" class="form-textarea"></textarea>
                      </div>
                      <button @click="addExample" class="add-btn">{{ $t('feedbackEditor.addExample') }}</button>
                  </div>
              </CollapsibleSection>

              <CollapsibleSection :title="$t('feedbackEditor.relatedWords')">
                  <div class="form-section pt-2 space-y-2">
                      <div v-for="(item, rIndex) in editableWord.relatedWords" :key="rIndex" class="related-item">
                           <button @click="removeItem('relatedWords', rIndex)" class="remove-btn-icon" :title="$t('feedbackEditor.removeItem')">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                           </button>
                           <input v-model="item.sourceText" :placeholder="$t('feedbackEditor.explanationSource')" class="form-input" />
                           <input v-model="item.targetText" :placeholder="$t('feedbackEditor.explanationTarget')" class="form-input mt-1" />
                      </div>
                      <button @click="addItem('relatedWords')" class="add-btn">{{ $t('feedbackEditor.addRelated') }}</button>
                  </div>
              </CollapsibleSection>

              <CollapsibleSection :title="$t('feedbackEditor.antonyms')">
                  <div class="form-section pt-2 space-y-2">
                      <div v-for="(item, aIndex) in editableWord.antonyms" :key="aIndex" class="related-item">
                           <button @click="removeItem('antonyms', aIndex)" class="remove-btn-icon" :title="$t('feedbackEditor.removeItem')">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                           </button>
                           <input v-model="item.sourceText" :placeholder="$t('feedbackEditor.explanationSource')" class="form-input" />
                           <input v-model="item.targetText" :placeholder="$t('feedbackEditor.explanationTarget')" class="form-input mt-1" />
                      </div>
                      <button @click="addItem('antonyms')" class="add-btn">{{ $t('feedbackEditor.addAntonym') }}</button>
                  </div>
              </CollapsibleSection>
              
              <CollapsibleSection :title="$t('feedbackEditor.notesAndConfirmation')">
                  <div class="form-section pt-2 space-y-4">
                      <div>
                          <label for="correction-notes" class="section-title mb-1 block">{{ $t('feedbackEditor.notesLabel') }}</label>
                          <textarea id="correction-notes" v-model="notes" :placeholder="$t('feedbackEditor.notesPlaceholder')" class="form-textarea" rows="3"></textarea>
                      </div>
                      <div class="flex items-start">
                          <div class="flex items-center h-5">
                              <input id="contribution-checkbox" v-model="contributionAccepted" type="checkbox" class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"/>
                          </div>
                          <div class="ml-3 text-xs">
                              <label for="contribution-checkbox" class="text-gray-600 dark:text-slate-400">{{ $t('feedbackEditor.contributionCheckbox') }}</label>
                          </div>
                      </div>
                  </div>
              </CollapsibleSection>
          </div>
  
          <!-- Footer -->
          <div class="px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
              <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600">
                  {{ $t('general.cancel') }}
              </button>
              <button
                @click="handleSubmit"
                :disabled="isSubmitting || !contributionAccepted"
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
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PropType } from 'vue';
import type { WordDetail, CategorizedTags } from '@/types';
import emitter from '@/services/emitter';
import CollapsibleSection from '@/components/CollapsibleSection.vue';

const props = defineProps<{
    show: boolean;
    wordDetail: WordDetail;
    isSubmitting: boolean;
    availableCategorizedTags: CategorizedTags;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', payload: { modifiedData: WordDetail; notes: string }): void;
}>();

const { t } = useI18n();

const originalWordDetail = ref<WordDetail>(JSON.parse(JSON.stringify(props.wordDetail)));
const editableWord = ref<WordDetail>(JSON.parse(JSON.stringify(props.wordDetail)));
const notes = ref('');
const contributionAccepted = ref(false);

const availablePartsOfSpeech = computed(() => {
    if (!props.availableCategorizedTags) return [];
    const posSet = props.availableCategorizedTags.categories.get('pos');
    return posSet ? Array.from(posSet).sort() : [];
});

const allAvailableTags = computed(() => {
    if (!props.availableCategorizedTags) return [];
    const allTags = new Set(props.availableCategorizedTags.simpleTags);
    props.availableCategorizedTags.categories.forEach((values, key) => {
        if (key !== 'pos') {
            values.forEach(value => allTags.add(`${key}:${value}`));
        }
    });
    return Array.from(allTags).sort();
});

watch(() => props.show, (newVal) => {
    if (newVal) {
        originalWordDetail.value = JSON.parse(JSON.stringify(props.wordDetail));
        const newEditable = JSON.parse(JSON.stringify(props.wordDetail));
        
        if (!newEditable.senses) newEditable.senses = [];
        if (!newEditable.examples) newEditable.examples = [];
        if (!newEditable.tags) newEditable.tags = [];
        if (!newEditable.relatedWords) newEditable.relatedWords = [];
        if (!newEditable.antonyms) newEditable.antonyms = [];
        
        editableWord.value = newEditable;
        notes.value = '';
        contributionAccepted.value = false;
    }
});

function addTag() { editableWord.value.tags.push(''); }
function removeTag(index: number) { editableWord.value.tags.splice(index, 1); }

function addSense() {
    editableWord.value.senses.push({
        gloss: '',
        explanation: { sourceText: '', targetText: '' },
        examples: []
    });
}
function removeSense(index: number) { editableWord.value.senses.splice(index, 1); }

function addExample() {
    if (!editableWord.value.examples) {
        editableWord.value.examples = [];
    }
    editableWord.value.examples.push({ sourceText: '', targetText: '' });
}
function removeExample(index: number) { editableWord.value.examples?.splice(index, 1); }


function addItem(type: 'relatedWords' | 'antonyms') {
    if (!editableWord.value[type]) {
        editableWord.value[type] = [];
    }
    editableWord.value[type]?.push({ sourceText: '', targetText: '' });
}
function removeItem(type: 'relatedWords' | 'antonyms', index: number) { editableWord.value[type]?.splice(index, 1); }

function closeModal() { emit('close'); }

function handleSubmit() {
    if (editableWord.value.tags) {
        editableWord.value.tags = editableWord.value.tags.filter(tag => tag && tag.trim() !== '');
    }

    if (JSON.stringify(originalWordDetail.value) === JSON.stringify(editableWord.value) && !notes.value.trim()) {
        emitter.emit('show-notification', { message: t('app.notificationNoChanges'), type: 'info', duration: 2000 });
        closeModal();
        return;
    }

    if (!props.isSubmitting) {
        emit('submit', { modifiedData: editableWord.value, notes: notes.value.trim() });
    }
}
</script>

<style scoped>
@reference "../assets/main.css";
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease-out; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.form-section { @apply bg-gray-50 dark:bg-slate-800/50 p-3 rounded-md border border-gray-200 dark:border-slate-700; }
.section-title { @apply text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mb-2; }
.form-input, .form-textarea { @apply w-full p-1.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500; }
.related-item { @apply relative flex items-center gap-2 border-t border-gray-200 dark:border-slate-700 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0; }
.related-item .form-input { @apply flex-grow; }
.remove-btn-icon { @apply p-0.5 text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0; }
.add-btn { @apply text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2; }
</style>