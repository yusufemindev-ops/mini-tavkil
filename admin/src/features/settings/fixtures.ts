// Settings screen tabs.
//
// Tavkil had a third, "Email templates", over a table of transactional emails
// this project does not send. Cut with the table (PLAN.md §3): a template editor
// for a site whose only outbound email is one contact-form notification is
// machinery, not capability. Where that notification lands is a single field on
// the General tab.

export interface SettingsTab {
  id: string;
  label: string;
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General' },
  { id: 'currencies', label: 'Currencies' },
];
