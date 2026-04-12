<template>
    <CollapsibleSection :title="$t('userSettings.tabs.ai')">
        <div class="space-y-6 pt-3">
            <!-- Cloud Sync Toggle -->
            <div v-if="isGoogleDriveEnabled" class="setting-item toggle-item">
                 <label for="cloudSyncToggle" class="toggle-label">
                   <span class="setting-label-main flex items-center">
                       Cloud Sync (Google Drive)
                   </span>
                   <div class="setting-description">
                       Aktivieren, um Ihren Fortschritt und Ihre Einstellungen in Ihrem privaten Google Drive zu sichern.
                   </div>
                 </label>
                 <button id="cloudSyncToggle" @click="toggleCloudSync" role="switch" :aria-checked="cloudSyncSetting.toString()" :class="cloudSyncSetting ? 'bg-blue-600' : 'bg-gray-300'" class="toggle-switch" ><span class="sr-only">Cloud Sync Toggle</span><span aria-hidden="true" :class="cloudSyncSetting ? 'translate-x-5' : 'translate-x-0'" class="toggle-knob"></span></button>
            </div>

            <div class="setting-item">
                <span class="setting-label-main flex items-center">
                    {{ $t('userSettings.aiProviderLabel') }}
                </span>
                <span class="setting-description">{{ $t('userSettings.aiProviderDescription') }}</span>
                <div class="mt-2 space-y-3">
                    <div v-for="provider in availableProviders" :key="provider.providerName">
                        <label :for="`api-key-${provider.providerName}`" class="block text-sm font-medium text-gray-700 mb-1">
                            {{ $t('userSettings.apiKeyLabel', { provider: provider.displayName }) }}
                        </label>
                        <div class="flex items-center gap-2">
                            <input :id="`api-key-${provider.providerName}`" type="password" :placeholder="$t('userSettings.apiKeyPlaceholder', { provider: provider.displayName })" :value="apiKeys[provider.providerName] || ''" @input="newApiKeys[provider.providerName] = ($event.target as HTMLInputElement).value" class="setting-input flex-grow"/>
                            <button @click="saveApiKey(provider.providerName)" class="px-3 py-1.5 text-xs bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition">{{ $t('general.save') }}</button>
                            <button v-if="apiKeys[provider.providerName]" @click="appStore.clearApiKey(provider.providerName)" class="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded shadow hover:bg-gray-300 transition">{{ $t('general.delete') }}</button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">{{ $t('userSettings.keyStoredLocally') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </CollapsibleSection>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import { getAvailableProviders } from '@/services/ai/AiImageFactory';
import { isGoogleDriveEnabled } from '@/services/googleDriveService';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const appStore = useAppStore();

const availableProviders = ref(getAvailableProviders());
const apiKeys = computed(() => appStore.apiKeys);
const newApiKeys = reactive<Record<string, string>>({});

const cloudSyncSetting = computed(() => settingsStore.settings?.enableCloudSync ?? false);
function toggleCloudSync() {
    settingsStore.updateSetting('enableCloudSync', !cloudSyncSetting.value);
}

function saveApiKey(providerName: string) {
    const keyToSave = newApiKeys[providerName];
    if (keyToSave && keyToSave.trim()) {
        appStore.setApiKey(providerName, keyToSave.trim());
        newApiKeys[providerName] = '';
    }
}
</script>

<style scoped>
</style>