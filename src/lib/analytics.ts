export type AnalyticsEvent =
  | { name: 'audit_started'; properties: { departmentId: string; departmentName: string } }
  | { name: 'audit_completed'; properties: { departmentId: string; percentage: number } }
  | { name: 'question_added'; properties: { departmentId: string } }
  | { name: 'question_deleted'; properties: { departmentId: string } }
  | { name: 'department_added'; properties: { name: string } }
  | { name: 'department_deleted'; properties: { name: string } }
  | { name: 'department_duplicated'; properties: { sourceId: string } }
  | { name: 'user_login'; properties: { isNewUser: boolean } }
  | { name: 'user_logout'; properties: Record<string, never> }
  | { name: 'user_invited'; properties: { role: string } }
  | { name: 'user_deactivated'; properties: Record<string, never> }
  | { name: 'csv_exported'; properties: { type: 'sessions' | 'single_audit' | 'questions' } }
  | { name: 'backup_exported'; properties: Record<string, never> }
  | { name: 'questions_imported'; properties: { count: number } }
  | { name: 'page_view'; properties: { path: string } }
  | { name: 'reminder_created'; properties: { frequency: string } }
  | { name: 'reminder_completed'; properties: { reminderId: string } }
  | { name: 'reminder_deleted'; properties: { reminderId: string } };

type AnalyticsProvider = {
  track: (event: AnalyticsEvent) => void;
  identify: (userId: string, traits: Record<string, string>) => void;
};

let _provider: AnalyticsProvider | null = null;

export function initAnalytics(provider: AnalyticsProvider) {
  _provider = provider;
}

export function track(event: AnalyticsEvent) {
  try {
    if (_provider) {
      _provider.track(event);
      return;
    }
    if (import.meta.env.DEV) {
      console.debug('[analytics]', event.name, event.properties);
    }
  } catch {
    /* analytics must never break the app */
  }
}

export function identify(userId: string, traits: Record<string, string>) {
  try {
    _provider?.identify(userId, traits);
  } catch {
    /* silent */
  }
}
