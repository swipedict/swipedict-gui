import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAppStore } from './stores/appStore' // Import the store
import { useSettingsStore } from './stores/settingsStore'

import App from './App.vue'
import router from './router'
import i18n, { setLocale, DEFAULT_LOCALE, SUPPORT_LOCALES } from './i18n'
import { VueCookieNext } from 'vue-cookie-next'

// --- APP INITIALIZATION ---

/**
 * Determines the best initial locale for the session.
 * Priority: 1. Guest's choice from sessionStorage, 2. Browser language, 3. Hardcoded default.
 */
function getInitialLocale(): string {
    const guestLocale = sessionStorage.getItem('guestLocale');
    if (guestLocale && SUPPORT_LOCALES.includes(guestLocale)) {
        console.log(`[main.ts] Found guest locale in sessionStorage: ${guestLocale}`);
        return guestLocale;
    }

    const browserLangs = navigator.languages || [navigator.language];
    for (const lang of browserLangs) {
        const langCode = lang.toLowerCase().split('-')[0];
        if (SUPPORT_LOCALES.includes(langCode)) {
            console.log(`[main.ts] Detected browser locale: ${langCode}`);
            return langCode;
        }
    }
    console.log(`[main.ts] Falling back to default locale: ${DEFAULT_LOCALE}`);
    return DEFAULT_LOCALE;
}

async function initializeApp() {
    // --- FIX: Set the initial locale for the session BEFORE creating the app ---
    setLocale(getInitialLocale());

    const pinia = createPinia();
    const app = createApp(App);

    app.use(pinia); // Use Pinia first

    // Now that Pinia is installed, we can use the store
    const appStore = useAppStore();
    const settingsStore = useSettingsStore();

    try {
        // Perform critical data loading before mounting the app
        await appStore.checkUserRegistration();
        
        // --- MODIFIED: Use the new optimized loading function ---
        // This will load from cache immediately for a fast start,
        // then fetch fresh data in the background.
        await appStore.loadGlobalIndex();

        // Load user-specific data only if they are registered.
        if (appStore.isUserRegistered) {
            await settingsStore.loadSettings();
            appStore.loadLastSelection();
        }
    } catch (error) {
        console.error("Critical error during app initialization:", error);
        // Optionally show a non-Vue error message to the user here
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = "position:fixed;top:10px;left:50%;transform:translateX(-50%);background:red;color:white;padding:10px;border-radius:5px;z-index:9999;";
        errorDiv.innerText = "App could not be initialized. Please refresh the page.";
        document.body.appendChild(errorDiv);
    }

    // Now, use the other plugins and mount the app
    app.use(router);
    app.use(i18n);
    app.use(VueCookieNext);

    app.mount('#app');
}

initializeApp();