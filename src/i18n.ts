import { createI18n, type Locale } from 'vue-i18n'

// Import locale messages
import de from './locales/de.json'
import en from './locales/en.json'

// --- Configuration ---
export const SUPPORT_LOCALES: Readonly<string[]> = ['de', 'en']
export const DEFAULT_LOCALE: string = 'de' // Default language

// --- i18n Instance Setup ---
const i18n = createI18n<false>({
  legacy: false, // Required for Composition API usage
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  availableLocales: SUPPORT_LOCALES,
  messages: {
    de,
    en,
  },
})

// --- Helper Functions ---

/**
 * Sets the application's current locale.
 * @param locale The locale code (e.g., 'en', 'de').
 */
export function setLocale(locale: Locale): void {
  if (!SUPPORT_LOCALES.includes(locale)) {
    console.warn(`[i18n] Locale "${locale}" is not supported. Falling back to ${DEFAULT_LOCALE}.`)
    locale = DEFAULT_LOCALE
  }

  if (i18n.global.locale.value !== locale) {
    console.log(`[i18n] Setting locale to: ${locale}`)
    i18n.global.locale.value = locale
  }

  // Set HTML lang attribute
  document.querySelector('html')?.setAttribute('lang', locale)
}

// --- Export i18n instance ---
export default i18n