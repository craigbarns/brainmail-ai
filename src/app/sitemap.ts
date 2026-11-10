import type { MetadataRoute } from 'next';
import { SEO_PAGES } from '@/lib/seoPages';

// Only the public marketing site is indexed; the app lives on app.brainmail.ai
// behind authentication and is disallowed in robots.ts.
const BASE = 'https://www.brainmail.ai';
export default function sitemap(): MetadataRoute.Sitemap {
  // Reflect significant marketing-page changes rather than resetting lastmod on every request.
  const updated = new Date('2026-11-10T00:00:00+01:00');
  return [
    { url: `${BASE}/`, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/solutions`, lastModified: updated, changeFrequency: 'monthly', priority: 0.9 },
    ...SEO_PAGES.map((p) => ({
      url: `${BASE}/solutions/${p.slug}`,
      lastModified: updated,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/legal/mentions-legales`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/cgv`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/confidentialite`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
