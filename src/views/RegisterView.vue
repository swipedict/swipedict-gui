<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-150px)] px-4">
    <div class="w-full max-w-md bg-white dark:bg-slate-900 dark:border dark:border-slate-700/60 p-8 rounded-xl shadow-lg text-center">
      <h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-slate-100">{{ $t('register.title') }}</h1>
      <p class="text-gray-600 dark:text-slate-400 mb-8">
        {{ $t('register.prompt') }}
      </p>

      <form @submit.prevent="handleRegistration">
        <!-- Username Input -->
        <div class="mb-4">
          <label for="username" class="sr-only">{{ $t('register.usernameLabel') }}</label>
          <input
            type="text"
            id="username"
            v-model.trim="inputName"
            required
            minlength="2"
            :placeholder="$t('register.usernamePlaceholder')"
            class="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
            :aria-invalid="showError"
            aria-describedby="username-error"
          />
          <p v-if="showError" id="username-error" class="text-red-500 text-xs mt-1 text-left">
            {{ $t('register.errorMinLength') }}
          </p>
        </div>

         <!-- Language Selection -->
         <div class="mb-6">
           <label for="language-select" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 text-left">{{ $t('register.languageLabel') }}</label>
           <select
             id="language-select"
             v-model="appStore.currentLocale"
             required
             class="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
           >
             <option v-for="locale in SUPPORT_LOCALES" :key="locale" :value="locale">
               {{ $t(`languages.${locale}`) }}
             </option>
           </select>
         </div>

         <!-- EULA Checkbox -->
         <div class="mb-6 text-left">
            <div class="flex items-start">
                <div class="flex items-center h-5">
                    <input
                        id="eula-checkbox"
                        v-model="eulaAccepted"
                        type="checkbox"
                        class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                </div>
                <div class="ml-3 text-xs">
                    <label for="eula-checkbox" class="text-gray-600 dark:text-slate-400">
                        <i18n-t keypath="register.eulaLabel" tag="span">
                            <template #link>
                                <RouterLink :to="{ name: 'about' }" class="font-medium text-blue-600 hover:underline" target="_blank">
                                    {{ $t('register.eulaLinkText') }}
                                </RouterLink>
                            </template>
                        </i18n-t>
                    </label>
                </div>
            </div>
         </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isSaving || !eulaAccepted || !inputName || inputName.length < 2"
          class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-150 ease-in-out text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? $t('general.saving') : $t('register.buttonText') }}
        </button>
      </form>
       <p v-if="saveError" class="text-red-600 text-sm mt-4">
         {{ $t('register.errorSaving') }} {{ saveError }}
       </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { SUPPORT_LOCALES } from '@/i18n';
import { isGoogleDriveEnabled } from '@/services/googleDriveService';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const appStore = useAppStore();

const inputName = ref('');
const eulaAccepted = ref(false);
const isSaving = ref(false);
const showError = ref(false);
const saveError = ref<string | null>(null);

async function handleRegistration() {
  saveError.value = null;
  if (!inputName.value || inputName.value.length < 2) {
    showError.value = true; return;
  }
  if (!eulaAccepted.value) {
    saveError.value = "You must accept the terms to continue.";
    return;
  }
  const localeToRegister = appStore.currentLocale;
  if (!localeToRegister || !SUPPORT_LOCALES.includes(localeToRegister)) {
      saveError.value = "Invalid language selected.";
      return;
  }
  showError.value = false;
  isSaving.value = true;

  try {
    await appStore.registerUser(inputName.value, localeToRegister, false);

    const redirectPath = route.query.redirect as string | undefined;
    if (redirectPath) {
         router.replace(redirectPath);
    } else {
        router.replace({ name: 'welcome' });
    }
  } catch (error: any) {
    saveError.value = error.message || "An unknown error occurred.";
  } finally {
    isSaving.value = false;
  }
}
</script>