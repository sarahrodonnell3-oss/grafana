import { type NavModel, type NavModelItem } from '@grafana/data';
import { getLogger } from '@grafana/runtime/unstable';

export function getExceptionNav(error: unknown): NavModel {
  getLogger('core.navigation').logError(error instanceof Error ? error : new Error(String(error)));
  return getWarningNav('Exception thrown', 'See console for details');
}

export function getNotFoundNav(): NavModel {
  return getWarningNav('Page not found', '404 Error');
}

export function getWarningNav(text: string, subTitle?: string): NavModel {
  const node: NavModelItem = {
    text,
    subTitle,
    icon: 'exclamation-triangle',
  };
  return {
    node: node,
    main: node,
  };
}
