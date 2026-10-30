// Cloudflare Web Analytics (Section 9): a cookie-free page-view counter. The beacon goes into
// the built page only when the site's token is set at build time (VITE_CF_BEACON_TOKEN, from
// the Cloudflare dashboard), so local builds, tests and forks never report anything. What it
// sees is written in docs/launch/privacy.md.

const TOKEN = /^[0-9a-f]{32}$/;

// The <script> tag for `token`, or '' with no token. A token that isn't 32 hex characters
// stops the build rather than ship a broken or injected tag.
export function beaconTag(token: string | undefined): string {
  if (token === undefined || token === '') return '';
  if (!TOKEN.test(token)) throw new Error('VITE_CF_BEACON_TOKEN must be 32 hex characters');
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`;
}
