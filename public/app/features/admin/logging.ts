import { isFetchError } from '@grafana/runtime';
import { getLogger } from '@grafana/runtime/unstable';

export function logAdminError(error: unknown, fallbackMessage = 'Unknown error') {
  if (error instanceof Error) {
    getLogger('features.admin').logError(error);
    return;
  }

  if (isFetchError(error)) {
    const dataMessage =
      typeof error.data === 'object' && error.data && 'message' in error.data ? String(error.data.message) : undefined;
    getLogger('features.admin').logError(new Error(error.message || dataMessage || fallbackMessage), {
      status: String(error.status),
      ...(error.statusText ? { statusText: error.statusText } : {}),
      ...(error.data != null ? { data: JSON.stringify(error.data) } : {}),
    });
    return;
  }

  getLogger('features.admin').logError(new Error(fallbackMessage));
}
