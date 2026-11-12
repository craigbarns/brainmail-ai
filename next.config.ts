import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'sharp'],
  // One address per page. The marketing site lives on www, the application on
  // app: each host redirects the other's pages, so nothing is served twice.
  async redirects() {
    const onApp = [{ type: 'host' as const, value: 'app.brainmail.ai' }];
    const onWww = [{ type: 'host' as const, value: 'www.brainmail.ai' }];
    const www = 'https://www.brainmail.ai';
    const app = 'https://app.brainmail.ai';
    return [
      { source: '/', has: onApp, destination: '/app', permanent: false },
      ...['/solutions', '/solutions/:slug', '/comment-ca-marche', '/legal/:page'].map((source) => ({
        source,
        has: onApp,
        destination: `${www}${source}`,
        permanent: true,
      })),
      ...['/login', '/app', '/app/:path*', '/scan'].map((source) => ({
        source,
        has: onWww,
        destination: `${app}${source}`,
        permanent: true,
      })),
    ];
  },
  async headers() {
    return [
      // Private screens are empty shells to a crawler: keep them out of the index.
      // They are not disallowed in robots.txt, or the crawler could never read this.
      ...['/login', '/app', '/app/:path*', '/scan'].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" +
              (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.fr https://www.google.com; connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
