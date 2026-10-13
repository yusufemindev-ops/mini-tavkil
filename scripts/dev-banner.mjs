/**
 * Prints a clean dashboard of active local development URLs and services.
 */
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;

const services = [
  { name: 'Storefront (Next.js)', url: 'http://localhost:3000' },
  { name: 'Admin Dashboard (Vite)', url: 'http://localhost:5173' },
  { name: 'Admin (Embedded)', url: 'http://localhost:3000/admin' },
  // Add future services (backend API, docs, etc.) here:
  // { name: 'Backend API Server', url: 'http://localhost:8000' },
];

console.log('');
console.log(cyan('  ┌──────────────────────────────────────────────────────────────┐'));
console.log(
  cyan('  │') + bold('  🚀 mini-tavkil local development environments                ') + cyan('│'),
);
console.log(cyan('  ├──────────────────────────────────────────────────────────────┤'));
console.log(
  cyan('  │') + '                                                              ' + cyan('│'),
);

for (const { name, url } of services) {
  const paddedName = (name + ':').padEnd(25, ' ');
  const paddedUrl = url.padEnd(31, ' ');
  console.log(cyan('  │') + `  ➜  ${bold(paddedName)} ${green(paddedUrl)} ` + cyan('│'));
}

console.log(
  cyan('  │') + '                                                              ' + cyan('│'),
);
console.log(cyan('  ├──────────────────────────────────────────────────────────────┤'));
console.log(
  cyan('  │') + dim('  • DB: Neon (branch: develop)   • Storage: tavkil-images-dev ') + cyan('│'),
);
console.log(cyan('  └──────────────────────────────────────────────────────────────┘'));
console.log('');
