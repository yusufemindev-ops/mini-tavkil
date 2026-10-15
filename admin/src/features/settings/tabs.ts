export interface SettingsTab {
  id: string;
  label: string;
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General' },
  { id: 'currencies', label: 'Currencies' },
];
