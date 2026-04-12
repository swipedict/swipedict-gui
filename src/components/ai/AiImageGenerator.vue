<template>
  <div class="mt-4 pt-4 border-t">
    <button @click="showAIGenerationUI = !showAIGenerationUI" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-2">
      <SparklesIcon class="w-5 h-5" />
      {{ $t('ai.generateWithAi') }}
    </button>
    <transition name="collapse">
      <div v-if="showAIGenerationUI" class="mt-3 p-3 bg-gray-50 border rounded-md space-y-3">
        <div>
          <label for="ai-prompt" class="block text-xs font-medium text-gray-600 mb-1">{{ $t('ai.prompt') }}</label>
          <textarea id="ai-prompt" v-model="aiPrompt" rows="3" class="w-full p-2 border border-gray-300 rounded-md text-sm shadow-sm"></textarea>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label for="ai-provider" class="block text-xs font-medium text-gray-600 mb-1">{{ $t('ai.provider') }}</label>
            <select id="ai-provider" v-model="aiProvider" class="w-full p-2 border border-gray-300 rounded-md text-sm shadow-sm">
              <option v-for="provider in availableProvidersWithKeys" :key="provider.providerName" :value="provider.providerName">{{ provider.displayName }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label for="ai-model" class="block text-xs font-medium text-gray-600 mb-1">{{ $t('ai.model') }}</label>
            <select id="ai-model" v-model="aiModel" class="w-full p-2 border border-gray-300 rounded-md text-sm shadow-sm">
              <option value="dall-e-2">DALL-E 2</option>
              <option value="dall-e-3">DALL-E 3</option>
            </select>
          </div>
        </div>
        <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ $t('ai.orientation') }}</label>
            <div class="flex items-center gap-4">
            <div class="flex items-center">
                <input type="checkbox" id="orientation-landscape" :checked="aiOrientation === 'landscape'" @change="handleOrientationChange('landscape')" :disabled="aiModel === 'dall-e-2'" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <label for="orientation-landscape" class="ml-2 text-sm text-gray-700" :class="{ 'text-gray-400': aiModel === 'dall-e-2' }">{{ $t('ai.landscape') }}</label>
            </div>
            <div class="flex items-center">
                <input type="checkbox" id="orientation-square" :checked="aiOrientation === 'square'" @change="handleOrientationChange('square')" :disabled="aiModel === 'dall-e-2'" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <label for="orientation-square" class="ml-2 text-sm text-gray-700" :class="{ 'text-gray-400': aiModel === 'dall-e-2' }">{{ $t('ai.square') }}</label>
            </div>
            </div>
            <p v-if="aiModel === 'dall-e-2'" class="text-xs text-gray-400 mt-1">{{ $t('ai.orientationNote') }}</p>
        </div>
        <button @click="generateAiImage" :disabled="isGenerating" class="w-full px-4 py-2 bg-indigo-500 text-white text-sm rounded-md shadow hover:bg-indigo-600 transition flex items-center justify-center disabled:opacity-50">
          <svg v-if="isGenerating" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isGenerating ? $t('ai.generating') : $t('ai.generateImage') }}
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SparklesIcon } from '@heroicons/vue/24/outline';
import { useAppStore } from '@/stores/appStore';
import { getAiImageService, getAvailableProviders } from '@/services/ai/AiImageFactory';
import type { AiImageOptions } from '@/types';

const props = defineProps<{
  initialPrompt: string;
}>();

const emit = defineEmits<{
  (e: 'image-generated', dataUrl: string): void;
  (e: 'generation-error', message: string): void;
}>();

const { t } = useI18n();
const appStore = useAppStore();
const showAIGenerationUI = ref(false);
const isGenerating = ref(false);
const aiPrompt = ref(props.initialPrompt);
const availableProvidersWithKeys = computed(() => getAvailableProviders().filter(p => !!appStore.apiKeys[p.providerName]));
const aiProvider = ref(availableProvidersWithKeys.value[0]?.providerName || '');
const aiModel = ref('dall-e-3');
const aiOrientation = ref<'landscape' | 'square' | null>('landscape');

watch(() => props.initialPrompt, (newVal) => {
  aiPrompt.value = newVal;
});

watch(aiModel, (newModel) => {
    if (newModel === 'dall-e-2') {
        aiOrientation.value = null; 
    } else {
        if(aiOrientation.value === null) aiOrientation.value = 'landscape';
    }
});

function handleOrientationChange(value: 'landscape' | 'square') {
    if (aiOrientation.value === value) {
        aiOrientation.value = null;
    } else {
        aiOrientation.value = value;
    }
}

const dalleSize = computed((): AiImageOptions['size'] => {
    if (aiModel.value === 'dall-e-3') {
        if (aiOrientation.value === 'landscape') return '1792x1024';
        return '1024x1024';
    }
    return '512x512';
});

async function generateAiImage() {
  if (isGenerating.value || !aiPrompt.value) return;
  isGenerating.value = true;
  emit('generation-error', '');

  try {
    const service = getAiImageService(aiProvider.value);
    const apiKey = appStore.apiKeys[aiProvider.value];
    if (!service || !apiKey) throw new Error("AI provider or API key not configured.");
    
    const generatedDataUrl = await service.generateImage(apiKey, {
        prompt: aiPrompt.value,
        model: aiModel.value,
        size: dalleSize.value,
        quality: 'standard'
    });
    
    emit('image-generated', generatedDataUrl);

  } catch (error: any) {
    emit('generation-error', t('ai.error', { error: error.message }));
  } finally {
    isGenerating.value = false;
  }
}
</script>