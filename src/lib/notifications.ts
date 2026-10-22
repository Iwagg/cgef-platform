// Categories of live alerts shown in the header bell; users can mute them in Settings → Notifications
export const ALERT_CATEGORIES = [
  { key: 'critical_risk', label: 'Critical risks open', sublabel: 'Open risks with a critical inherent score' },
  { key: 'action_overdue', label: 'Action plans overdue', sublabel: 'Remediation actions past their due date' },
  { key: 'incident_open', label: 'Open incidents', sublabel: 'Incidents not yet remediated or resolved' },
  { key: 'evidence_review', label: 'Evidence awaiting review', sublabel: 'Evidence provided but not yet accepted' },
  { key: 'policy_review', label: 'Policy review due', sublabel: 'Approved policies whose review date is within 30 days' },
  { key: 'regulatory_deadline', label: 'Regulatory deadlines', sublabel: 'NIS2, DORA, RGPD… deadlines within 60 days' },
] as const;

export type AlertCategory = typeof ALERT_CATEGORIES[number]['key'];

export function isCategoryEnabled(prefs: Record<string, boolean> | undefined, key: AlertCategory) {
  return prefs?.[key] !== false;
}
