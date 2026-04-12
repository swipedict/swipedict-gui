<template>
    <div ref="detailViewRoot" class="w-full overflow-hidden bg-white dark:bg-[#0d0d26] dark:border dark:border-slate-700/60 rounded-lg shadow-lg dark:shadow-none p-3 sm:p-4 md:p-6 relative">
       <!-- Loading Indicator & Error States -->
       <div v-if="isLoadingPageData" class="absolute inset-0 bg-white/75 dark:bg-[#0d0d26]/80 flex items-center justify-center z-20 rounded-lg">
           <div class="text-center">
               <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></span>
               <p class="text-gray-500 text-lg">{{ $t('detailView.loadingDetails') }}</p>
           </div>
       </div>
       <div v-else-if="pageError" class="text-center text-red-500 p-6">
            <p class="font-semibold">{{ $t('detailView.errorLoading') }}</p>
           <p class="text-sm mb-4">{{ $t('detailView.errorGeneric', { error: pageError }) }}</p>
           <button @click="goBack" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center justify-center mx-auto">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 mr-1.5"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg>
             {{ $t('detailView.backButton') }}
           </button>
       </div>
       <div v-else-if="!wordDetailData" class="text-center text-gray-500 p-6">
           <p class="font-semibold">{{ $t('detailView.errorNotFound') }}</p>
           <p class="text-sm mb-4">{{ $t('detailView.errorNotFoundMessage', { wordId: props.wordId }) }}</p>
            <button @click="goBack" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center justify-center mx-auto">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 mr-1.5"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg>
             {{ $t('detailView.backButton') }}
           </button>
       </div>

      <!-- Main Content Area -->
      <div v-else class="space-y-6">
         <!-- Header Section with Buttons -->
         <div class="flex items-center w-full gap-2 min-w-0">
            <button @click="goBack" class="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm -ml-2 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 mr-0.5"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg>
                {{ $t('detailView.backButton') }}
            </button>
            <div class="flex-grow"></div>
            <div class="flex items-center justify-end flex-wrap gap-x-3 gap-y-2 min-w-0">
                 <div class="flex items-center gap-1">
                    <button @click="cycleExampleVisibility" class="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors" :title="visibilityToggleTitle">
                        <svg v-if="exampleVisibility === 'all'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>
                        <span v-else class="font-bold text-sm w-5 h-5 flex items-center justify-center">
                            {{ (exampleVisibility === 'sourceOnly' ? wordDetailData.sourceLanguage : wordDetailData.targetLanguage).toUpperCase() }}
                        </span>
                    </button>
                 </div>
                 <div class="flex items-center gap-1">
                    <span class="text-xs text-blue-600 font-semibold">{{ $t('detailView.onlineSearch') }}</span>
                    <RouterLink :to="{ name: 'externalSearch', params: { searchTerm: wordDetailData.target.headword || wordDetailData.source.headword } }" class="text-blue-600 dark:text-blue-400 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30" :title="$t('detailView.searchInApp', { term: wordDetailData.target.headword || wordDetailData.source.headword })">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>
                    </RouterLink>
                    <a :href="`https://www.google.com/search?q=${encodeURIComponent(wordDetailData.target.headword || wordDetailData.source.headword)}`" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30" :title="$t('detailView.searchInNewTab', { term: wordDetailData.target.headword || wordDetailData.source.headword })">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-4.5 0V6.375c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125-1.125h-4.5A1.125 1.125 0 0 1 9 10.5Z" /></svg>
                    </a>
                </div>
                 <button @click="openFeedbackModal" class="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:underline font-semibold flex items-center" :title="$t('detailView.proposeCorrection')">
                    {{ $t('detailView.proposeCorrection') }}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5 ml-1"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg>
                </button>
            </div>
        </div>

        <div class="flex flex-col md:flex-row justify-between items-start border-b dark:border-slate-700 pb-4 gap-4 md:gap-6">
            <LanguageDetailCard :content="wordDetailData.source" :lang="wordDetailData.sourceLanguage" :source-language="wordDetailData.sourceLanguage" :target-language="wordDetailData.targetLanguage" :audio-availability="getAudioAvailability('source')" :etymology-audio-availability="getEtymologyAudioAvailability('source')" @play-audio="playHeadwordAudio('source')" @play-etymology-audio="playEtymologyAudio('source')" />
            <div class="w-full md:w-px h-px md:h-auto bg-gray-200 dark:bg-slate-700 md:self-stretch my-2 md:my-0"></div>
            <LanguageDetailCard :content="wordDetailData.target" :lang="wordDetailData.targetLanguage" :source-language="wordDetailData.sourceLanguage" :target-language="wordDetailData.targetLanguage" :audio-availability="getAudioAvailability('target')" :etymology-audio-availability="getEtymologyAudioAvailability('target')" @play-audio="playHeadwordAudio('target')" @play-etymology-audio="playEtymologyAudio('target')" />
        </div>

        <div class="text-xs text-gray-500 dark:text-slate-400 border-b dark:border-slate-700 pb-3 space-y-1">
            <div v-if="wordDetailData.part_of_speech" class="flex items-center"><span class="font-medium w-[90px] inline-block flex-shrink-0 text-gray-400 dark:text-slate-500">{{ $t('detailView.metadata.type') }}</span><span class="capitalize text-gray-600 dark:text-slate-300">{{ wordDetailData.part_of_speech }}</span></div>
            <div v-if="hasContent(wordDetailData.tags)" class="flex items-start"><span class="font-medium w-[90px] inline-block flex-shrink-0 text-gray-400 dark:text-slate-500 mt-px">{{ $t('detailView.metadata.tags') }}</span><div class="flex flex-wrap gap-x-1.5 gap-y-0.5"><span v-for="tag in wordDetailData.tags" :key="tag" class="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-px rounded-sm text-[0.7rem] leading-tight">{{ tag }}</span></div></div>
        </div>
        
        <CollapsibleSection
            v-if="wordDetailData.senses && wordDetailData.senses.length > 0"
            :title="$t('detailView.sections.nuancesOf') + ' ' + (wordDetailData.target?.headword || wordDetailData.source.headword)"
            :start-open="true"
        >
            <DetailSensesSection :senses="wordDetailData.senses" :word-detail="wordDetailData" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" :visibility-control="exampleVisibility" />
        </CollapsibleSection>

        <div v-if="hasContent(wordDetailData.relatedWords) || hasContent(wordDetailData.antonyms)" class="border-b border-gray-200 dark:border-slate-700 pb-4">
             <div v-if="hasContent(wordDetailData.relatedWords)" class="mb-4 last:mb-0"><h4 class="text-md font-semibold text-gray-600 dark:text-slate-300 mb-2">{{ $t('detailView.sections.relatedWords') }}</h4><HorizontalWordList :items="wordDetailData.relatedWords!" :word-detail="wordDetailData" item-type="related" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" :source-lang-label="wordDetailData.sourceLanguage.toUpperCase()" :target-lang-label="wordDetailData.targetLanguage.toUpperCase()" :source-lang-code="wordDetailData.sourceLanguage" :target-lang-code="wordDetailData.targetLanguage" /></div>
             <hr v-if="hasContent(wordDetailData.relatedWords) && hasContent(wordDetailData.antonyms)" class="my-3 border-gray-200"><div v-if="hasContent(wordDetailData.antonyms)"><h4 class="text-md font-semibold text-gray-600 mb-2">{{ $t('detailView.sections.antonyms') }}</h4><HorizontalWordList :items="wordDetailData.antonyms!" :word-detail="wordDetailData" item-type="antonym" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" :source-lang-label="wordDetailData.sourceLanguage.toUpperCase()" :target-lang-label="wordDetailData.targetLanguage.toUpperCase()" :source-lang-code="wordDetailData.sourceLanguage" :target-lang-code="wordDetailData.targetLanguage" /></div>
        </div>
         <div class="space-y-3 pt-2">
            <CollapsibleSection :title="$t('detailView.sections.examples')" :start-open="true" v-if="hasContent(wordDetailData.examples)">
                <div class="space-y-2 text-sm"><div v-for="(item, index) in wordDetailData.examples" :key="`main-ex-${index}`" class="border-b border-gray-100 pb-2 last:border-b-0"><p v-if="item.label" class="text-xs text-gray-500 italic mb-1">{{ item.label }}</p><TextPairDisplay :source-text="item.sourceText" :target-text="item.targetText" :source-lang-label="wordDetailData.sourceLanguage.toUpperCase()" :target-lang-label="wordDetailData.targetLanguage.toUpperCase()" :source-lang-code="wordDetailData.sourceLanguage" :target-lang-code="wordDetailData.targetLanguage" :audio-identifier="`example-${props.wordId}-${index}`" :audio-context="{ dictionaryPath: props.dictionaryPath, wordId: props.wordId }" :audio-manifest="wordDetailData.media?.audio || []" :audio-path-prefix="`examples.${index}`" layout="block" :visibility-control="exampleVisibility" /></div></div>
            </CollapsibleSection>
            <CollapsibleSection :title="$t('detailView.sections.learningTips')" v-if="hasContent(wordDetailData.learningTips)"><WordInfoSection :items="wordDetailData.learningTips" :word-detail="wordDetailData" type="learningTip" :word-id="props.wordId" :dictionary-path="props.dictionaryPath"/></CollapsibleSection>
            <DetailUserTextNote :initial-text-note="localMediaData?.userTextNote" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" @text-note-updated="handleMediaUpdate('userTextNote', $event)"/>
            <DetailUserAudio :initial-user-audio-data-url="localMediaData?.userAudioDataUrl" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" @user-audio-updated="handleMediaUpdate('userAudioDataUrl', $event)"/>
            <DetailHandwriting :initial-drawing-data-url="localMediaData?.drawingDataUrl" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" :word-headword="wordDetailData.target?.headword || wordDetailData.source.headword" @drawing-updated="handleMediaUpdate('drawingDataUrl', $event)"/>
            <DetailImageAssociation :initial-image-data-url="localMediaData?.imageDataUrl" :word-id="props.wordId" :dictionary-path="props.dictionaryPath" :word-detail="wordDetailData" @image-updated="handleMediaUpdate('imageDataUrl', $event)" />
         </div>
        <DetailActionButtons :current-state="currentWordState" :is-saving-state="isSavingState" @update-state="updateWordState"/>
        <div class="mt-6 pt-2 text-center text-xs text-gray-500 dark:text-slate-500">
            <span v-if="dictionaryStore.currentDictionaryMeta?.version" :title="`${$t('detailView.metadata.dictVersionLabel')}: ${dictionaryStore.currentDictionaryMeta.version}`">{{ $t('detailView.metadata.dictVersionLabel') }}: {{ dictionaryStore.currentDictionaryMeta.version }}</span>
            <span v-if="dictionaryStore.currentDictionaryMeta?.version && currentContentVersion" class="mx-1">|</span>
            <span v-if="currentContentVersion" :title="`${$t('detailView.metadata.contentVersionLabel')}: ${currentContentVersion}`">{{ $t('detailView.metadata.contentVersionLabel') }}: {{ currentContentVersion }}</span>
        </div>
      </div>
       <FeedbackEditorModal v-if="wordDetailData" :show="isFeedbackModalOpen" :word-detail="wordDetailData" :is-submitting="isSubmittingFeedback" :available-categorized-tags="dictionaryStore.availableCategorizedTags" @close="isFeedbackModalOpen = false" @submit="handleFeedbackSubmit" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, RouterLink } from 'vue-router';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCustomMediaStore } from '@/stores/customMediaStore';
import { useWordDetail } from '@/composables/useWordDetail';
import type { UserState, WordDetail, WordMediaData, AudioManifestItem } from '@/types';
import LanguageDetailCard from '@/components/LanguageDetailCard.vue';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import WordInfoSection from '@/components/WordInfoSection.vue';
import HorizontalWordList from '@/components/HorizontalWordList.vue';
import DetailActionButtons from './DetailActionButtons.vue';
import { playAudio } from '@/composables/useAudioPlayer';
import emitter from '@/services/emitter';
import DetailHandwriting from './DetailHandwriting.vue';
import DetailUserAudio from './DetailUserAudio.vue';
import DetailUserTextNote from './DetailUserTextNote.vue';
import DetailImageAssociation from './DetailImageAssociation.vue';
import FeedbackEditorModal from '@/components/FeedbackEditorModal.vue';
import TextPairDisplay from '@/components/TextPairDisplay.vue';
import DetailSensesSection from './DetailSensesSection.vue';
import { submitFeedback } from '@/services/feedbackService';
import { generateGitDiffString } from '@/utils/diffUtils';

type VisibilityMode = 'all' | 'sourceOnly' | 'targetOnly';

const props = defineProps<{ dictionaryPath: string; wordId: string }>();
const { t } = useI18n();
const router = useRouter();
const dictionaryStore = useDictionaryStore();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const customMediaStore = useCustomMediaStore();
const detailViewRoot = ref<HTMLDivElement | null>(null);

const { dictionaryPath, wordId } = toRefs(props);
const { 
    wordDetailData, 
    mediaData: localMediaData,
    isLoading: isLoadingPageData,
    error: pageError,
    contentVersion: currentContentVersion
} = useWordDetail(dictionaryPath, wordId);

const isSavingState = ref(false);
const isFeedbackModalOpen = ref(false);
const isSubmittingFeedback = ref(false);
const exampleVisibility = ref<VisibilityMode>(settingsStore.settings.detailViewDefaultVisibility);

watch(() => settingsStore.settings.detailViewDefaultVisibility, (newVal) => { exampleVisibility.value = newVal; });

const currentWordState = computed<UserState>(() => {
    if (dictionaryStore.currentDictionaryPath !== props.dictionaryPath) return 'NONE';
    return dictionaryStore.masterList.find(w => w.id === props.wordId)?.metadata.state || 'NONE';
});

const visibilityToggleTitle = computed(() => {
    switch (exampleVisibility.value) {
        case 'all': return 'Show Source Language Only';
        case 'sourceOnly': return 'Show Target Language Only';
        case 'targetOnly': return 'Show Both Languages';
        default: return 'Toggle Visibility';
    }
});

function cycleExampleVisibility() {
    if (exampleVisibility.value === 'all') exampleVisibility.value = 'sourceOnly';
    else if (exampleVisibility.value === 'sourceOnly') exampleVisibility.value = 'targetOnly';
    else exampleVisibility.value = 'all';
}

function openFeedbackModal() { isFeedbackModalOpen.value = true; }

async function handleFeedbackSubmit(payload: { modifiedData: WordDetail; notes: string }) {
    if (isSubmittingFeedback.value || !wordDetailData.value) return;
    const diff = generateGitDiffString(`${props.wordId}.json`, wordDetailData.value, payload.modifiedData);
    if (!diff && !payload.notes) {
        emitter.emit('show-notification', { message: t('app.notificationNoChanges'), type: 'info' });
        return;
    }
    isSubmittingFeedback.value = true;
    const result = await submitFeedback({ type: 'correction', dictionaryPath: props.dictionaryPath, wordId: props.wordId, correctionData: diff, notes: payload.notes });
    if (result.success) isFeedbackModalOpen.value = false;
    isSubmittingFeedback.value = false;
}

function handleMediaUpdate(mediaType: 'drawingDataUrl' | 'imageDataUrl' | 'userAudioDataUrl' | 'userTextNote', newData: string | null | undefined) {
    if (!localMediaData.value) localMediaData.value = {};
    if (newData === undefined) delete localMediaData.value[mediaType];
    else localMediaData.value[mediaType] = newData;
}

function goBack() {
    if (window.history.length > 1) router.back();
    else router.push({ name: 'topicSelection', params: { dictionaryPath: props.dictionaryPath } });
}

async function updateWordState(newState: UserState) {
    if (dictionaryStore.currentDictionaryPath !== props.dictionaryPath) {
        emitter.emit('show-notification', { message: "Wörterbuch nicht geladen...", type: 'error' }); return;
    }
    if (isSavingState.value || newState === currentWordState.value) return;
    isSavingState.value = true;
    try {
        await dictionaryStore.updateWordState({ id: props.wordId, newState });
        emitter.emit('show-notification', { message: t('detailView.state.notificationSuccess', { newState }), type: 'success', duration: 1500 });
        if (newState === 'IGNORED' || newState === 'NONE') goBack();
    } catch (error) {
        emitter.emit('show-notification', { message: t('detailView.state.notificationError'), type: 'error' });
    } finally {
        isSavingState.value = false;
    }
}

function getAudioAvailability(languageType: 'source' | 'target'): 'opus' | 'tts' | 'none' {
    if (!wordDetailData.value) return 'none';
    const audioPath = languageType === 'source' ? 'source.headword' : 'target.headword';
    const hasOfficialFile = wordDetailData.value.media?.audio?.some((a: AudioManifestItem) => a.path === audioPath);
    if (hasOfficialFile) return 'opus';
    const headwordText = languageType === 'source' ? wordDetailData.value.source.headword : wordDetailData.value.target.headword;
    if (headwordText && !settingsStore.settings.disableTTSFallback) return 'tts';
    return 'none';
}

function playHeadwordAudio(languageType: 'source' | 'target') {
    if (isLoadingPageData.value || !wordDetailData.value) return;
    const detail = wordDetailData.value;
    const content = languageType === 'source' ? detail.source : detail.target;
    const langSimple = languageType === 'source' ? detail.sourceLanguage : detail.targetLanguage;
    const headword = content?.headword;
    if (!headword || !langSimple) return;
    
    let specificAudioUrl: string | undefined = undefined;
    const audioPath = languageType === 'source' ? 'source.headword' : 'target.headword';
    if (detail.media?.audio) {
        const audioEntry = detail.media.audio.find((a: AudioManifestItem) => a.path === audioPath);
        if (audioEntry?.url) {
            specificAudioUrl = audioEntry.url;
        }
    }
    
    playAudio('headword', {
        sourceUrl: specificAudioUrl,
        identifier: `headword-${props.wordId}-${langSimple}`,
        textToSpeak: headword,
        langCode: langSimple,
        disableTTSFallback: settingsStore.settings.disableTTSFallback,
        dictionaryPath: props.dictionaryPath,
        wordId: props.wordId
    });
}

function getEtymologyAudioAvailability(languageType: 'source' | 'target'): 'opus' | 'tts' | 'none' {
    if (!wordDetailData.value) return 'none';
    const audioPath = `${languageType}.etymology`;
    const hasOfficialFile = wordDetailData.value.media?.audio?.some((a: AudioManifestItem) => a.path === audioPath);
    if (hasOfficialFile) return 'opus';
    const etymologyText = wordDetailData.value[languageType]?.etymology?.explanation?.targetText;
    if (etymologyText && !settingsStore.settings.disableTTSFallback) return 'tts';
    return 'none';
}

function playEtymologyAudio(languageType: 'source' | 'target') {
    if (isLoadingPageData.value || !wordDetailData.value) return;
    const detail = wordDetailData.value;
    const langSimple = languageType === 'source' ? detail.sourceLanguage : detail.targetLanguage;
    const etymologyText = detail[languageType]?.etymology?.explanation?.targetText;
    if (!etymologyText || !langSimple) return;

    let specificAudioUrl: string | undefined = undefined;
    const audioPath = `${languageType}.etymology`;
    if (detail.media?.audio) {
        const audioEntry = detail.media.audio.find((a: AudioManifestItem) => a.path === audioPath);
        if (audioEntry?.url) {
            specificAudioUrl = audioEntry.url;
        }
    }

    playAudio('etymology', {
        sourceUrl: specificAudioUrl,
        identifier: `etymology-${props.wordId}-${languageType}`,
        textToSpeak: etymologyText,
        langCode: detail.targetLanguage,
        disableTTSFallback: settingsStore.settings.disableTTSFallback,
        dictionaryPath: props.dictionaryPath,
        wordId: props.wordId
    });
}

function hasContent(arr: any[] | undefined): boolean { return Array.isArray(arr) && arr.length > 0; }
</script>