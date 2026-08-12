import { store } from '@grafana/data';
import { getLogger } from '@grafana/runtime/unstable';

interface StoredValueWithTTL<T> {
  value: T;
  timestamp: number;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isExpired<T>(item: StoredValueWithTTL<T>, ttlMs: number): boolean {
  return Date.now() - item.timestamp > ttlMs;
}

export const setLocalStorageWithTTL = <T>(key: string, value: T) => {
  const item: StoredValueWithTTL<T> = {
    value,
    timestamp: Date.now(),
  };

  try {
    store.setObject(key, item);
  } catch (error) {
    getLogger('features.dashboard-scene').logError(
      error instanceof Error ? error : new Error('Failed to persist value with TTL')
    );
  }
};

export function getLocalStorageWithTTL<T>(key: string, ttlMs: number = ONE_WEEK_MS): T | null {
  const item = store.getObject<StoredValueWithTTL<T>>(key);
  if (!item) {
    return null;
  }
  if (typeof item.timestamp !== 'number' || isExpired(item, ttlMs)) {
    store.delete(key);
    return null;
  }
  return item.value;
}
