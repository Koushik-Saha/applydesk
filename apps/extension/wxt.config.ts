import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// CLAUDE.md rule 9 — minimal permissions only; host permission for the
// ApplyDesk site itself, read from WXT_API_BASE_URL (apps/extension/.env).
const apiBaseUrl = process.env.WXT_API_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'ApplyDesk',
    description: 'Save jobs and apply with your tailored resume, without leaving the page.',
    permissions: ['activeTab', 'scripting', 'storage'],
    host_permissions: [`${new URL(apiBaseUrl).origin}/*`],
  },
});
