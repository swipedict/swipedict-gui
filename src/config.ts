/**
 * Global application configuration settings.
 */

// The base URL for the backend API (feedback, etc.) — stays on Netcup
export const API_ENDPOINT = import.meta.env.DEV 
  ? '/api-proxy/api.php' 
  : 'https://app.swipedict.com/api.php';

// The base URL for dictionary JSON files (index, word details)
// Each deployment serves its own dict JSONs:
//   app.swipedict.com       → /dist  (SFTP deploy)
//   swipedict.github.io     → /swipedict-dictionaries (GH Pages project repo)
const DICT_PATH: Record<string, string> = {
  'app.swipedict.com': '/dist',
  'swipedict.github.io': '/swipedict-dictionaries',
};
export const BASE_SERVER_URL = import.meta.env.DEV
  ? '/api-proxy/dist'
  : (DICT_PATH[globalThis.location?.hostname] ?? '/dist');

// The base URL for media files (audio) — stays on Netcup
export const MEDIA_BASE_URL = import.meta.env.DEV 
  ? '/api-proxy/dist' 
  : 'https://app.swipedict.com';

export const COOKIE_NAME = 'swipedict_consent_given';

// You can add other global constants here later, e.g.:
// export const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
// export const GLOBAL_INDEX_FILENAME = 'dictionaries.json';