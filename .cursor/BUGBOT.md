# Grafana UI Alert review policy

For changes under `packages/grafana-ui/src/components/Alert/**`:

- Preserve the localized accessible name “Close alert” for an icon-only dismiss button.
- When a dismiss button has visible text through `buttonContent`, its accessible name must contain that visible text.
- Do not stringify or interpolate an arbitrary ReactNode into `aria-label`.
- Do not remove the localized fallback needed by an icon-only dismiss control.
- Preserve existing `action` and `onRemove` behavior.
- Do not change the public Alert API unless the ticket explicitly requires it.
- Require focused tests for both:
  - a labeled dismiss button
  - an icon-only dismiss button
- Flag changes that make a visible label disagree with the accessible name.
- Flag changes that make any dismiss control unnamed.
- Treat accessibility-name regressions and missing required test coverage as blocking findings.
