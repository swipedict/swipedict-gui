<template>
  <PageWrapper size="lg">
    <!-- Header / Nav -->
    <div class="flex items-center justify-between mb-6">
       <button @click="goBack" class="page-back-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4">
             <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {{ t('general.back') }}
       </button>
    </div>

    <!-- Main Content Card -->
    <div class="bg-white dark:bg-surface-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      
      <!-- Title Area -->
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-surface-900/30">
        <h1 class="text-2xl font-heading font-bold text-slate-900 dark:text-white text-center">
          {{ t('about.title') }}
        </h1>
      </div>

      <div class="p-6 space-y-8">
        <!-- About Section -->
        <section>
          <h2 class="text-lg font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <InformationCircleIcon class="h-5 w-5 text-primary-500" />
            {{ t('about.aboutAppTitle') }}
          </h2>
          <div class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
            <p>{{ t('about.aboutText1') }}</p>
            <p>
              <i18n-t keypath="about.aboutText2" tag="span">
                <template #link>
                  <a href="https://discord.gg/k9m7uvrC" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 font-medium hover:underline">{{ t('about.discordLink') }}</a>
                </template>
              </i18n-t>
            </p>
          </div>
        </section>

        <!-- Liability Section (Warning Style) -->
        <section class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl">
          <h2 class="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
             <ExclamationTriangleIcon class="h-5 w-5 text-amber-500" />
             {{ t('about.liabilityTitle') }}
          </h2>
          <div class="text-xs sm:text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed space-y-2">
              <p>{{ t('about.liabilityText1') }}</p>
              <p>{{ t('about.liabilityText2') }}</p>
              <p>{{ t('about.liabilityText3') }}</p>
          </div>
        </section>

        <!-- Version Info -->
        <section>
          <h2 class="text-lg font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {{ t('about.versionInfoTitle') }}
          </h2>
          <div class="bg-slate-50 dark:bg-surface-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <VersionInfo />
          </div>
        </section>
        
        <!-- Privacy -->
        <section>
          <h2 class="text-lg font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
             <ShieldCheckIcon class="h-5 w-5 text-primary-500" />
             {{ t('about.privacyTitle') }}
          </h2>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-6 leading-relaxed">
            <p>{{ t('about.privacyText1') }}</p>
            
            <!-- Sub-sections for Privacy -->
            <div class="space-y-4 pl-2 border-l-2 border-slate-100 dark:border-slate-700">
                <!-- Controller -->
                <div class="pl-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">{{ t('about.privacyController') }}</h3>
                    <p class="text-xs" v-html="t('about.imprintAddress')"></p>
                    <p class="text-xs mt-1">
                        <span class="font-semibold">{{ t('about.imprintEmailLabel') }}</span>
                        <a :href="`mailto:${t('about.imprintEmailValue')}`" class="text-primary-600 dark:text-primary-400 hover:underline ml-1">{{ t('about.imprintEmailValue') }}</a>
                    </p>
                </div>

                <!-- Scope -->
                <div class="pl-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">{{ t('about.privacyDataScope') }}</h3>
                    <p v-html="t('about.privacyDataText1')"></p>
                    <p class="mt-2" v-html="t('about.privacyDataText2')"></p>
                    <ul class="list-disc list-inside ml-2 mt-1 space-y-1 marker:text-slate-400">
                    <li v-for="(item, index) in tm('about.privacyDataList')" :key="index">{{ item }}</li>
                    </ul>
                    <p class="mt-2">{{ t('about.privacyDataText3') }}</p>
                    <p class="mt-2" v-html="t('about.privacyDataText4')"></p>
                </div>

                <!-- Cookies -->
                <div class="pl-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">{{ t('about.privacyCookies') }}</h3>
                    <p>{{ t('about.privacyCookiesText') }}</p>
                </div>
                
                <!-- Drive -->
                <div class="pl-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">{{ t('about.privacyGoogleDrive') }}</h3>
                    <p>{{ t('about.privacyGoogleDriveText') }}</p>
                </div>

                <!-- Feedback -->
                <div class="pl-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">{{ t('about.privacyFeedback') }}</h3>
                    <p>{{ t('about.privacyFeedbackText') }}</p>
                </div>

                <!-- Rights -->
                <div class="pl-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-1">{{ t('about.privacyRights') }}</h3>
                    <p>{{ t('about.privacyRightsText') }}</p>
                </div>
            </div>
          </div>
        </section>

        <!-- Imprint -->
        <section>
          <h2 class="text-lg font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
             <ScaleIcon class="h-5 w-5 text-primary-500" />
             {{ t('about.imprintTitle') }}
          </h2>
          <div class="bg-slate-50 dark:bg-surface-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 space-y-3">
            <div>
                <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t('about.imprintProvider') }}</h3>
                <p v-html="t('about.imprintAddress')"></p>
            </div>
            <div>
                <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t('about.imprintContact') }}</h3>
                <p>
                    <span class="font-medium">{{ t('about.imprintEmailLabel') }}</span>
                    <a :href="`mailto:${t('about.imprintEmailValue')}`" class="text-primary-600 dark:text-primary-400 hover:underline ml-1">{{ t('about.imprintEmailValue') }}</a>
                </p>
            </div>
            <div>
                <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t('about.imprintResponsible') }}</h3>
                <p v-html="t('about.imprintAddress')"></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </PageWrapper>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import VersionInfo from '@/components/VersionInfo.vue';
import PageWrapper from '@/components/layout/PageWrapper.vue';
import { 
    InformationCircleIcon, 
    ExclamationTriangleIcon, 
    ShieldCheckIcon, 
    ScaleIcon 
} from '@heroicons/vue/24/outline';

const router = useRouter();
const { t, tm } = useI18n();

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: 'profile' });
  }
}
</script>