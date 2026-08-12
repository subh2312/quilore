declare module "@sentry/react-native" {
  export function init(options: Record<string, unknown>): void;
  export function addBreadcrumb(crumb: { message: string }): void;
  export function captureMessage(message: string): void;
}
