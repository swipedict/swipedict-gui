<template>
  <PageWrapper size="lg" class="flex flex-col min-h-full">

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center pt-20 text-slate-400">
        <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mb-3"></span>
        {{ $t('general.loading') }}
    </div>

    <!-- Registered User Dashboard -->
    <div v-else-if="appStore.userName" class="w-full space-y-4 sm:space-y-6">
      
      <!-- 1. Header Section -->
      <section class="text-center space-y-0.5 py-1">
        <h1 class="text-xl sm:text-2xl font-heading font-bold text-slate-800 dark:text-white tracking-tight">
            {{ $t('welcome.title', { name: appStore.userName }) }}
        </h1>
        <p class="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Ready to expand your vocabulary?</p>
      </section>

      <!-- 2. Quick Actions Grid -->
      <section class="grid grid-cols-2 gap-2 sm:gap-3">
        <RouterLink :to="{ name: 'profile' }" 
          class="flex flex-col items-center justify-center p-3 sm:p-4 glass-card hover:shadow-card-hover hover:scale-[1.02] transition-all group active:scale-95 duration-200 text-center">
          <div class="p-2 sm:p-2.5 bg-primary-50 dark:bg-surface-700 rounded-full mb-1.5 sm:mb-2 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
            <UserCircleIcon class="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <span class="text-[11px] sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">{{ $t('welcome.profileButton') }}</span>
        </RouterLink>

        <RouterLink :to="{ name: 'about' }"
          class="flex flex-col items-center justify-center p-3 sm:p-4 glass-card hover:shadow-card-hover hover:scale-[1.02] transition-all group active:scale-95 duration-200 text-center">
          <div class="p-2 sm:p-2.5 bg-primary-50 dark:bg-surface-700 rounded-full mb-1.5 sm:mb-2 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
            <InformationCircleIcon class="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <span class="text-[11px] sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">{{ $t('welcome.aboutAndLegal') }}</span>
        </RouterLink>
      </section>
      
      <!-- Sync Status -->
      <SyncStatus />

      <!-- 3. Dictionary List Section -->
      <section class="space-y-2 sm:space-y-3 pt-1">
        <div class="flex flex-wrap justify-between items-center px-1 gap-2">
          <h2 class="text-base sm:text-lg font-bold font-heading text-slate-800 dark:text-slate-100">{{ $t('welcome.myDictionaries') }}</h2>
          <RouterLink :to="{ name: 'dictionarySelection' }" class="text-[11px] sm:text-xs font-semibold text-primary-700 dark:text-primary-300 flex items-center bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors active:scale-95 shrink-0">
            <PlusIcon class="h-3.5 w-3.5 mr-1" />
            <span>{{ $t('general.choose') }}</span>
          </RouterLink>
        </div>

        <div v-if="appStore.availableDictionaries.length > 0" class="grid gap-3">
          <div
            v-for="dict in appStore.availableDictionaries"
            :key="dict.path"
            class="glass-card overflow-hidden"
          >
            <!-- Dict Info — clicks to Browse -->
            <RouterLink
              :to="{ name: 'dictionaryBrowser', params: { dictionaryPath: dict.path } }"
              class="flex items-center gap-3 px-4 pt-4 pb-3 hover:bg-slate-50 dark:hover:bg-surface-700/50 transition-colors"
            >
              <div class="shrink-0 w-9 h-9 rounded-xl bg-primary-50 dark:bg-surface-700 flex items-center justify-center text-primary-500 dark:text-primary-400 shadow-sm">
                <BookOpenIcon class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight truncate">{{ dict.message }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">{{ dict.type }}</span>
                  <span v-if="dict.version" class="text-[10px] text-slate-400 dark:text-slate-500">v{{ dict.version }}</span>
                </div>
              </div>
            </RouterLink>

            <!-- Split CTAs -->
            <div class="flex border-t border-slate-100 dark:border-surface-700 divide-x divide-slate-100 dark:divide-surface-700">
              <RouterLink
                :to="{ name: 'topicSelection', params: { dictionaryPath: dict.path } }"
                class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:bg-primary-100 transition-colors"
              >
                <AcademicCapIcon class="h-4 w-4" />
                {{ $t('welcome.studyButton') }}
              </RouterLink>
              <RouterLink
                :to="{ name: 'dictionaryBrowser', params: { dictionaryPath: dict.path } }"
                class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-700 active:bg-slate-100 transition-colors"
              >
                <MagnifyingGlassIcon class="h-4 w-4" />
                {{ $t('welcome.browseButton') }}
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center p-8 glass-card border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
            <BookOpenIcon class="h-10 w-10 text-slate-300 mb-3" />
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">{{ $t('dictionarySelection.noDictsFound', 'No dictionaries found.') }}</p>
            <button @click="appStore.loadGlobalIndex()" class="text-sm font-semibold text-primary-600 hover:underline">{{ $t('general.tryAgain') }}</button>
        </div>
      </section>
    </div>

     <!-- Fallback for non-registered users (Guest) -->
     <div v-else class="flex flex-col items-center justify-center flex-grow text-center p-6 space-y-8">
        <div class="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-surface-800 dark:to-surface-700 p-8 rounded-full shadow-inner">
            <UserIcon class="h-16 w-16 text-primary-500 dark:text-primary-400" />
        </div>
        <div class="space-y-3 max-w-xs mx-auto">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{{ $t('welcome.userNotFound') }}</h2>
            <p class="text-slate-500 dark:text-slate-400 leading-relaxed">Create a free account to start tracking your progress and syncing your data across devices.</p>
        </div>
         <RouterLink :to="{ name: 'register' }" class="btn-primary w-full max-w-xs justify-center flex items-center shadow-primary-500/30 text-lg">
            {{ $t('welcome.registerLink') }}
         </RouterLink>
     </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { 
    UserCircleIcon, 
    InformationCircleIcon, 
    BookOpenIcon, 
    PlusIcon, 
    AcademicCapIcon,
    MagnifyingGlassIcon,
    UserIcon
} from '@heroicons/vue/24/outline';
import SyncStatus from '@/components/SyncStatus.vue';

const { t } = useI18n();
const appStore = useAppStore();

const isLoading = computed(() => !appStore.checkedInitialUserStatus || !appStore.globalIndexLoaded);
</script>