/**
 * Global application configuration settings.
 */

// The base URL for the backend API (feedback, etc.) — stays on Netcup
export const API_ENDPOINT = import.meta.env.DEV 
  ? '/api-proxy/api.php' 
  : 'https://app.swipedict.com/api.php';

// The base URL for dictionary JSON files (index, word details)
// app.swipedict.com  → dicts deployed flat to httpdocs/ root → no path prefix
// swipedict.github.io → project repo GH Pages sub-path
const DICT_PATH: Record<string, string> = {
  'app.swipedict.com': '',
  'swipedict.github.io': '/swipedict-dictionaries',
};
export const BASE_SERVER_URL = import.meta.env.DEV
  ? '/api-proxy/dist'
  : (DICT_PATH[globalThis.location?.hostname] ?? '');

// The base URL for media files (audio)
// app.swipedict.com serves its own media; swipedict.github.io uses GitHub Pages media
const MEDIA_PATH: Record<string, string> = {
  'app.swipedict.com': 'https://app.swipedict.com',
  'swipedict.github.io': 'https://swipedict.github.io',
};
export const MEDIA_BASE_URL = import.meta.env.DEV
  ? '/api-proxy/dist'
  : (MEDIA_PATH[globalThis.location?.hostname] ?? 'https://swipedict.github.io');

export const COOKIE_NAME = 'swipedict_consent_given';

// You can add other global constants here later, e.g.:
// export const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
// export const GLOBAL_INDEX_FILENAME = 'dictionaries.json';