/**
 * Global application configuration settings.
 */

// The base URL for the backend API that serves dictionary files, audio, etc.
// MODIFICATION: Use local proxy in DEV mode to avoid CORS errors
export const API_ENDPOINT = import.meta.env.DEV 
  ? '/api-proxy/api.php' 
  : 'https://app.swipedict.com/api.php';

export const BASE_SERVER_URL = import.meta.env.DEV 
  ? '/api-proxy/dist' 
  : 'https://app.swipedict.com';

export const COOKIE_NAME = 'swipedict_consent_given';

// You can add other global constants here later, e.g.:
// export const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
// export const GLOBAL_INDEX_FILENAME = 'dictionaries.json';