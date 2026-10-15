/**
 * Prints a clean dashboard of active local development URLs and services.
 */
try {
  process.loadEnvFile?.('.env');
} catch {}

const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;

const services = [
  {
    name: 'Storefront (Next.js)',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  { name: 'Admin Dashboard (Vite)', url: 'http://localhost:5173' },
  {
    name: 'Admin (Embedded)',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin`,
  },
];

// Automatically include backend API server if configured in .env or environment
const backendUrl = process.env.BACKEND_API_URL || process.env.BACKEND_URL || process.env.API_URL;
if (backendUrl) {
  services.push({ name: 'Backend API Server', url: backendUrl });
}

const headerText = '  🚀 mini-tavkil local development environments';
const footerText = '  • DB: Neon (branch: develop)   • Storage: tavkil-images-dev';

const maxNameLen = Math.max(...services.map((s) => s.name.length)) + 1;
const maxUrlLen = Math.max(...services.map((s) => s.url.length));
const rowContentLen = 5 + maxNameLen + 2 + maxUrlLen + 2;

const innerWidth = Math.max(64, headerText.length + 2, footerText.length + 2, rowContentLen);

const topBorder = cyan('  ┌' + '─'.repeat(innerWidth) + '┐');
const midBorder = cyan('  ├' + '─'.repeat(innerWidth) + '┤');
const botBorder = cyan('  └' + '─'.repeat(innerWidth) + '┘');

console.log('');
console.log(topBorder);
console.log(cyan('  │') + bold(headerText.padEnd(innerWidth - 1)) + ' ' + cyan('│'));
console.log(midBorder);
console.log(cyan('  │') + ' '.repeat(innerWidth) + cyan('│'));

for (const { name, url } of services) {
  const nameCol = (name + ':').padEnd(maxNameLen + 2, ' ');
  const line = `  ➜  ${bold(nameCol)}${green(url)}`;
  const visibleLen = 5 + nameCol.length + url.length;
  const padding = ' '.repeat(Math.max(0, innerWidth - visibleLen));
  console.log(cyan('  │') + line + padding + cyan('│'));
}

console.log(cyan('  │') + ' '.repeat(innerWidth) + cyan('│'));
console.log(midBorder);
console.log(cyan('  │') + dim(footerText.padEnd(innerWidth)) + cyan('│'));
console.log(botBorder);
console.log('');
