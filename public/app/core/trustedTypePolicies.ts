import { textUtil } from '@grafana/data';
import { config } from '@grafana/runtime';
import { getLogger } from '@grafana/runtime/unstable';

const CSP_REPORT_ONLY_ENABLED = config.cspReportOnlyEnabled;

export const defaultTrustedTypesPolicy = {
  createHTML: (string: string, source: string, sink: string) => {
    if (!CSP_REPORT_ONLY_ENABLED) {
      return string.replace(/<script/gi, '&lt;script');
    }
    getLogger('core.trusted-types').logError(new Error('HTML not sanitized with Trusted Types'), {
      source,
      sink,
      value: string.slice(0, 200),
    });
    return string;
  },
  createScript: (string: string) => string,
  createScriptURL: (string: string, source: string, sink: string) => {
    if (!CSP_REPORT_ONLY_ENABLED) {
      return textUtil.sanitizeUrl(string);
    }
    getLogger('core.trusted-types').logError(new Error('ScriptURL not sanitized with Trusted Types'), {
      source,
      sink,
      value: string.slice(0, 200),
    });
    return string;
  },
};

if (config.trustedTypesDefaultPolicyEnabled && window.trustedTypes && window.trustedTypes.createPolicy) {
  // check if browser supports Trusted Types
  window.trustedTypes.createPolicy('default', defaultTrustedTypesPolicy);
}
