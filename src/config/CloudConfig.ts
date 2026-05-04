export const GAME_KEY = 'caizhu';

export const BACKEND_BASE_URL = 'https://rosa-env-d7grf78r5dbd37323.service.tcloudbase.com';
export const BACKEND_PATH_PREFIX = `/${GAME_KEY}-api`;

export const BACKEND_LOGIN_PATH = `${BACKEND_PATH_PREFIX}/login/`;
export const BACKEND_PULL_PATH = `${BACKEND_PATH_PREFIX}/save/pull`;
export const BACKEND_PUSH_PATH = `${BACKEND_PATH_PREFIX}/save/push`;
export const BACKEND_HEALTH_PATH = `${BACKEND_PATH_PREFIX}/health`;

export const BACKEND_REQUEST_TIMEOUT_MS = 10000;

export const BACKEND_TOKEN_KEY = `${GAME_KEY}_token`;
export const BACKEND_ANON_ID_KEY = `${GAME_KEY}_anon_id`;

export const LEVEL_PROGRESS_KEY = `${GAME_KEY}_level_progress`;
export const CLASSIC_RANKS_KEY = `${GAME_KEY}_classic_ranks`;
export const BEST_SCORE_KEY = `${GAME_KEY}_best_score`;
export const SKIN_STATE_KEY = `${GAME_KEY}_skin_state`;
export const PROP_INVENTORY_KEY = `${GAME_KEY}_prop_inventory`;
export const SEEN_SPECIAL_INTROS_KEY = `${GAME_KEY}_seen_special_piece_intros`;

export const CLOUD_SYNC_SCHEMA_VERSION = 1;
export const CLOUD_SYNC_META_KEY = `${GAME_KEY}_cloud_meta`;

export const CLOUD_SYNC_ALLOWLIST = [
  LEVEL_PROGRESS_KEY,
  CLASSIC_RANKS_KEY,
  BEST_SCORE_KEY,
  SKIN_STATE_KEY,
  PROP_INVENTORY_KEY,
  SEEN_SPECIAL_INTROS_KEY,
] as const;

export const CLOUD_SYNC_EXCLUDE_KEYS = [
  BACKEND_TOKEN_KEY,
  BACKEND_ANON_ID_KEY,
] as const;

export const CLOUD_SYNC_STARTUP_TIMEOUT_MS = 2500;
export const CLOUD_SYNC_DEBOUNCE_MS = 1500;
export const CLOUD_SYNC_BASE_DELAY_MS = 1500;
export const CLOUD_SYNC_MAX_BACKOFF_MS = 30000;
export const CLOUD_SYNC_MAX_FAIL_COUNT = 5;
export const CLOUD_SYNC_RETRY_INTERVAL_MS = 60000;
export const CLOUD_SYNC_LOG_THRESHOLD = 3;

export type CloudSyncKey = typeof CLOUD_SYNC_ALLOWLIST[number];
