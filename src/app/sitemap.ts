import type { MetadataRoute } from 'next';
import { SEO_PAGES } from '@/lib/seoPages';

// Only the public marketing site is indexed; the app lives on app.brainmail.ai
// behind authentication and is disallowed in robots.ts.
const BASE = 'https://www.brainmail.ai';
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...SEO_PAGES.map((p) => ({
      url: `${BASE}/solutions/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: `${BASE}/legal/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/cgv`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
