<template>
  <div class="app-container font-sans">
    <!-- TopBar is now the header of our grid -->
    <TopBar
      :selected-dictionary="appStore.selectedDictionary"
      :topic-title="currentTopicTitle"
     />

    <!-- Main Content Area is the main part of our grid, and it is the only part that scrolls -->
    <main class="app-main-content">
      <RouterView v-slot="{ Component, route }">
         <div v-if="!initialLoadComplete && route.name !== 'register' && !appStore.isUserRegistered" class="w-full h-full flex items-center justify-center text-gray-500">
                <span class="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mr-2"></span>
                {{ $t('app.loadingApp') }}
           </div>
        <template v-else>
          <keep-alive :include="['WordListView', 'SRSFastReviewView']">
            <component :is="Component" />
          </keep-alive>
        </template>
      </RouterView>
    </main>

     <!-- Notifications and banners remain outside the grid flow, fixed to the viewport -->
     <!-- Notification now driven by NotificationStore -->
     <transition name="notif-from-top">
       <div
            v-if="notificationStore.isVisible"
            :class="notificationStore.classes"
            class="fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 max-w-md text-center text-white text-sm font-medium"
            role="alert"
        >
         {{ notificationStore.activeNotification.message }}
       </div>
     </transition>

      <transition name="slide-up">
         <div
            v-if="showConsentBanner"
            class="fixed bottom-0 left-0 right-0 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-4 shadow-up z-[1000] flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-700/50"
            >
            <p class="text-sm text-slate-300 flex-grow">
                 {{ $t('app.cookieConsentText') }}
                <router-link :to="{ name: 'about' }" class="underline hover:text-primary-300 transition-colors">{{ $t('app.cookieConsentLink') }}</router-link>
            </p>
            <div class="flex-shrink-0 flex gap-3">
                 <button @click="acceptConsent" class="px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 rounded-xl transition-colors font-medium">
                    {{ $t('app.cookieConsentAccept') }}
                 </button>
            </div>
         </div>
      </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { RouterView, useRoute, RouterLink } from 'vue-router';
import { hasCookie, setCookie } from '@/utils/cookieUtils';
import { useI18n } from 'vue-i18n';
import TopBar from '@/components/TopBar.vue';
import emitter from '@/services/emitter';
import type { NotificationPayload } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { cleanupOldIntroducedCards } from '@/services/db'; 
import { COOKIE_NAME } from '@/config'; 

const { t } = useI18n();
const appStore = useAppStore();
const settingsStore = useSettingsStore();
const dictionaryStore = useDictionaryStore();
const notificationStore = useNotificationStore();
const route = useRoute();
const initialLoadComplete = ref(false);

const showConsentBanner = ref(false);

const currentTopicTitle = computed(() => {
    const topicId = route.params.topicId as string | undefined;
    if (!topicId || topicId.toLowerCase() === 'all') {
        return topicId === 'all' ? t('general.all') : null; 
    }
    return topicId;
});

// Bridge emitter to store for backwards compatibility
const showNotificationBridge = (payload: NotificationPayload) => {
  notificationStore.show(payload);
};

async function performInitialSetup() {
    try {
        if (!appStore.checkedInitialUserStatus) {
            await appStore.checkUserRegistration();
        }
        // Load settings if not yet loaded
        if (appStore.isUserRegistered && (Object.keys(settingsStore.settings).length === 0 || settingsStore.settings.initialListDisplay === undefined)) {
             await settingsStore.loadSettings();
        }

        if (appStore.isUserRegistered) { 
            if(!appStore.globalIndexLoaded) await appStore.loadGlobalIndex();
            if(!appStore.selectedDictionaryPath) appStore.loadLastSelection();
            await cleanupOldIntroducedCards(); 
        }
    } catch (error) {
         console.error("App: Critical error during initial setup:", error);
         notificationStore.show({ message: t('app.notificationGenericError', { error: (error as Error).message || 'Unknown init error' }), type: 'error' });
    } finally {
        initialLoadComplete.value = true;
    }
}

function checkConsent() { showConsentBanner.value = !hasCookie(COOKIE_NAME); }
function acceptConsent() { setCookie(COOKIE_NAME, 'true', 365); showConsentBanner.value = false; }

onMounted(async () => {
  checkConsent();
  // Listen to legacy emitter events and pipe them to the store
  emitter.on('show-notification', showNotificationBridge);
  
  if (route.name !== 'register' || appStore.isUserRegistered) {
    await performInitialSetup();
  } else {
    initialLoadComplete.value = true;
  }
});

watch(route, async (to, from) => {
    if (from.name === 'register' && to.name !== 'register' && appStore.isUserRegistered && !initialLoadComplete.value) {
        await performInitialSetup();
    }
});


onUnmounted(() => {
  emitter.off('show-notification', showNotificationBridge);
  if (window.speechSynthesis?.speaking) { window.speechSynthesis.cancel(); }
});

watch(() => appStore.selectedDictionaryPath, (newPath, oldPath) => {
    if (newPath !== oldPath && dictionaryStore.currentDictionaryPath !== newPath) {
         dictionaryStore.$reset();
    }
});

 watch(
     () => [appStore.checkedInitialUserStatus, appStore.globalIndexLoaded, appStore.isUserRegistered, appStore.isLoadingGlobalIndex],
     ([checkedUser, globalIndexLoaded, isRegistered, isLoadingIndex]) => {
         if (checkedUser) {
             if (isRegistered) {
                 if (globalIndexLoaded && !isLoadingIndex) {
                     initialLoadComplete.value = true;
                 }
             } else {
                 initialLoadComplete.value = true;
             }
         }
     },
     { immediate: true }
 );

</script>
