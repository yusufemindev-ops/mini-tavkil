// Settings screen — mock default values (no real persistence yet).

export interface SettingsTab {
  id: string;
  label: string;
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'email', label: 'Email templates' },
];

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  trigger: string;
  /** Prefilled body (with {{tokens}}) for templates an operator sends by hand. */
  body?: string;
  /** Manual = sent by an operator (e.g. via Gmail); otherwise sent automatically. */
  manual?: boolean;
}

// Transactional emails Tavkil will send once the email provider is connected.
// Mirrors the buyer/account/order flows (no marketing email in scope).
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'account-approved',
    name: 'Account approved',
    description: 'Welcome email with a one-time link to set a password.',
    subject: 'Your Tavkil account is ready',
    trigger: 'Account request approved',
  },
  {
    id: 'request-received',
    name: 'Account request received',
    description: 'Acknowledges a new account request from the storefront.',
    subject: 'We’ve received your account request',
    trigger: 'Account request submitted',
  },
  {
    id: 'request-declined',
    name: 'Account request declined',
    description: 'Notifies an applicant that their request was declined.',
    subject: 'Update on your Tavkil account request',
    trigger: 'Account request rejected',
  },
  {
    id: 'password-reset',
    name: 'Password reset',
    description: 'One-time link for a buyer to set a new password.',
    subject: 'Reset your Tavkil password',
    trigger: 'Admin resets a buyer password',
  },
  {
    id: 'order-confirmed',
    name: 'Order confirmed',
    description: 'Sent when an operator confirms a submitted order, with final pricing.',
    subject: 'Your order {{orderRef}} is confirmed',
    trigger: 'Operator confirms an order',
  },
  {
    id: 'order-expiring',
    name: 'Order expiring soon',
    description: 'Reminds a buyer to accept a confirmed order before it auto-expires.',
    subject: 'Action needed: order {{orderRef}} expires soon',
    trigger: 'Confirmed order nears auto-expire',
  },
];

// Fill {{token}} placeholders from a values map.
export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}
